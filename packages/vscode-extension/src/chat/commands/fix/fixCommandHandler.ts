// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  CancellationToken,
  ChatContext,
  ChatRequest,
  ChatResponseStream,
  LanguageModelChatMessage,
} from "vscode";
import { ICopilotChatResult } from "../../types";
import { chatParticipantId, TeamsChatCommand } from "../../consts";
import { ExtTelemetry } from "../../../telemetry/extTelemetry";
import { TelemetryEvent } from "../../../telemetry/extTelemetryEvents";
import { ChatTelemetryData } from "../../telemetry";
import {
  GetSearchPatternsPrompt,
  ParseErrorContextPrompt,
  RephraseQueryPrompt,
  RerankSearchResultsPrompt,
  SummarizeResultsPrompt,
  TroubleShootingSystemPrompt,
} from "./prompts";
import * as vscode from "vscode";
import { UserError } from "@microsoft/teamsfx-api";
import { getOutputLog, parseErrorContext, wrapChatHistory } from "./utils";
import { GithubAasRetriever } from "../../retriever/github/azure-ai-search";
import { CustomAI } from "./ai";
import { StackOverFlowAasRetriever } from "../../retriever/stack-overflow/azure-ai-search";
import { Body } from "node-fetch";

function parseJson(input: string): any {
  try {
    return JSON.parse(input);
  } catch (error) {
    return {};
  }
}

export default async function fixCommandHandler(
  request: ChatRequest,
  context: ChatContext,
  response: ChatResponseStream,
  token: CancellationToken
): Promise<ICopilotChatResult> {
  const chatTelemetryData = ChatTelemetryData.createByParticipant(
    chatParticipantId,
    TeamsChatCommand.Fix
  );
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.CopilotChatStart, chatTelemetryData.properties);
  let promptTokens = 0,
    completionTokens = 0;

  try {
    const aiClient = new CustomAI(
      process.env.OPENAI_ENDPOINT ?? "",
      process.env.OPENAI_API_VERSION ?? ""
    );
    const query = request.prompt;
    const chatHistory = wrapChatHistory(context);
    let errorContext = {};

    // 1. Get error context, helplink if available
    response.progress("Parsing error context...");
    errorContext = parseErrorContext(query);
    if (errorContext === "") {
      const parsedErrorContextMessages = [
        LanguageModelChatMessage.User(
          ParseErrorContextPrompt.replace("{{chat_history}}", JSON.stringify(chatHistory)).replace(
            "{{chat_input}}",
            query
          )
        ),
      ];
      const [parsedErrorContext, p, c] = await aiClient.getOpenaiResponseAsString(
        "gpt-4o",
        parsedErrorContextMessages
      );
      promptTokens += p;
      completionTokens += c;
      console.log("ParsedErrorContext: ", parsedErrorContext);
      errorContext = parseJson(parsedErrorContext);
    }
    console.log("ErrorContext: ", errorContext);

    // 2. Get Output panel log
    response.progress("Retrieving output panel log...");
    const outputLog = await getOutputLog();

    // 3. rephrase query with chat history
    response.progress("Rephrasing query...");
    let rephrasedQuery = "";
    if (context.history.length > 0) {
      const rephraseMessages = [
        LanguageModelChatMessage.User(
          RephraseQueryPrompt.replace("{{chat_history}}", JSON.stringify(chatHistory)).replace(
            "{{chat_input}}",
            query
          )
        ),
      ];
      let p, c;
      [rephrasedQuery, p, c] = await aiClient.getOpenaiResponseAsString("gpt-4o", rephraseMessages);
      promptTokens += p;
      completionTokens += c;
    } else {
      rephrasedQuery = query;
    }
    console.log("RephrasedQuery: ", rephrasedQuery);

    // 4. get search patterns
    response.progress("Extracting search patterns...");
    const searchMessages = [
      LanguageModelChatMessage.User(
        GetSearchPatternsPrompt.replace("{{errorContext}}", JSON.stringify(errorContext))
          .replace("{{outputLog}}", outputLog)
          .replace("{{userInput}}", rephrasedQuery)
      ),
    ];
    const [searchPatternsString, p, c] = await aiClient.getOpenaiResponseAsString(
      "gpt-4o",
      searchMessages,
      {
        type: "json_object",
      }
    );
    promptTokens += p;
    completionTokens += c;
    console.log("Search patterns: \n", searchPatternsString);
    const searchPatterns = parseJson(searchPatternsString);

    // 5. retrieve search results
    response.progress("Retrieving search results...");
    const retriever = GithubAasRetriever.getInstance();
    const searchResults = await retriever.issue.batchRetrieve(
      "OfficeDev/teams-toolkit",
      searchPatterns?.searchPatterns ?? [],
      3
    );

    const stackoverflowRetriever = StackOverFlowAasRetriever.getInstance();
    const stackoverflowResults = await stackoverflowRetriever.batchRetrieve(
      searchPatterns?.searchPatterns ?? [],
      3
    );
    const filteredResults = searchResults.map((element) => {
      return {
        url: element.html_url,
        repository_url: element.repository_url,
        title: element.title,
        body: element.body,
        fetched_comments: element.fetched_comments?.map((comment) => {
          return {
            user: comment.user.id,
            body: comment.body,
          };
        }),
        state: element.state,
      };
    });
    const filteredStackOverflowResults = stackoverflowResults.map((element) => {
      return {
        url: element.question.link,
        title: element.question.title,
        answers: element.answers
          .filter((item) => item.is_accepted)
          .map((answer) => {
            return {
              Body: answer.body,
            };
          }),
      };
    });

    // 6. summarize the each result
    response.progress("Summarizing search results...");
    const washedResults: string[] = [];
    await Promise.all(
      filteredResults.map(async (element) => {
        const msg = [
          LanguageModelChatMessage.User(
            SummarizeResultsPrompt.replace("{{searchResult}}", JSON.stringify(element))
          ),
        ];
        const [res, p, c] = await aiClient.getOpenaiResponseAsString("gpt-4o", msg);
        promptTokens += p;
        completionTokens += c;
        console.log("summarized result: ", res);
        washedResults.push(res);
      })
    );

    await Promise.all(
      filteredStackOverflowResults.map(async (element) => {
        const msg = [
          LanguageModelChatMessage.User(
            SummarizeResultsPrompt.replace("{{searchResult}}", JSON.stringify(element))
          ),
        ];
        const [res, p, c] = await aiClient.getOpenaiResponseAsString("gpt-4o", msg);
        promptTokens += p;
        completionTokens += c;
        console.log("summarized result: ", res);
        washedResults.push(res);
      })
    );

    // 7. generate response
    response.progress("Generating response...");
    const messages = [
      LanguageModelChatMessage.User(
        TroubleShootingSystemPrompt.replace("{{errorContext}}", JSON.stringify(errorContext))
          .replace("{{outputLog}}", outputLog)
          .replace("{{searchResults}}", JSON.stringify(washedResults))
          .replace("{{rephrasedQuery}}", rephrasedQuery)
      ),
    ];
    const [p1, c1] = await aiClient.verbatimOpenaiInteraction("gpt-4o", messages, response);
    promptTokens += p1;
    completionTokens += c1;
  } catch (error) {
    console.error(error);
    response.markdown((error as Error).message);
  }

  chatTelemetryData.markComplete();
  chatTelemetryData.extendBy(
    {},
    { prompt_tokens: promptTokens, completion_tokens: completionTokens }
  );
  console.log("measurements:\n", chatTelemetryData.measurements);
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.CopilotChat,
    chatTelemetryData.properties,
    chatTelemetryData.measurements
  );
  return {
    metadata: {
      command: TeamsChatCommand.Fix,
      requestId: chatTelemetryData.requestId,
    },
  };
}
