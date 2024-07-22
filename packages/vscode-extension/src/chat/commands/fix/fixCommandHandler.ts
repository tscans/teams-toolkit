// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  CancellationToken,
  ChatContext,
  ChatRequest,
  ChatRequestTurn,
  ChatResponseStream,
  ChatResponseTurn,
  LanguageModelChatMessage,
} from "vscode";
import { ICopilotChatResult } from "../../types";
import { chatParticipantId, TeamsChatCommand } from "../../consts";
import { ExtTelemetry } from "../../../telemetry/extTelemetry";
import { TelemetryEvent, TelemetryTriggerFrom } from "../../../telemetry/extTelemetryEvents";
import { ChatTelemetryData } from "../../telemetry";
import {
  ChatResponseToString,
  getCopilotResponseAsString,
  myAzureOpenaiRequest,
  verbatimCopilotInteraction,
} from "../../utils";
import {
  GetSearchPatternsPrompt,
  ParseErrorContextPrompt,
  RephraseQueryPrompt,
  RerankSearchResultsPrompt,
  TroubleShootingSystemPrompt,
} from "./prompts";
import * as vscode from "vscode";
import { UserError } from "@microsoft/teamsfx-api";
import { GithubRestRetriever } from "../../retriever/github/rest";
import { getOutputLog, parseErrorContext, wrapChatHistory } from "./utils";
import { GithubAasRetriever } from "../../retriever/github/azure-ai-search";

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
      const [parsedErrorContext, p, c] = await myAzureOpenaiRequest(parsedErrorContextMessages);
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
      [rephrasedQuery, p, c] = await myAzureOpenaiRequest(rephraseMessages);
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
    const [searchPatternsString, p, c] = await myAzureOpenaiRequest(searchMessages, {
      type: "json_object",
    });
    promptTokens += p;
    completionTokens += c;
    console.log("Search patterns: \n", searchPatternsString);
    const searchPatterns = parseJson(searchPatternsString);

    // 5. retrieve search results
    response.progress("Retrieving search results...");
    const githubToken = await vscode.authentication.getSession("github", ["public_repo"], {
      createIfNone: true,
    });
    if (githubToken === undefined) {
      throw new UserError("ChatParticipants", "FixCommand", "GithubToken Undefined");
    }

    //const retriever = GithubRestRetriever.getInstance(githubToken.accessToken);
    const retriever = GithubAasRetriever.getInstance();
    const searchResults = await retriever.issue.batchRetrieve(
      "OfficeDev/teams-toolkit",
      searchPatterns?.searchPatterns ?? [],
      3
    );

    // 6. search result reranking
    response.progress("Reranking search results...");
    const filteredResults = searchResults.filter((item) => item.score >= 1);
    const rerankedResults = filteredResults.map((element) => {
      return {
        url: element.url,
        repository_url: element.repository_url,
        title: element.title,
        body: element.body,
        fetchedComments: element.fetchedComments?.map((comment) => {
          return {
            user: comment.user.id,
            body: comment.body,
          };
        }),
        state: element.state,
      };
    });

    const asyncFilter = async (arr: any[], predicate: any) => {
      const results = await Promise.all(arr.map(predicate));
      return arr.filter((_v, index) => results[index]);
    };
    const filteredRerankedResults = await asyncFilter(rerankedResults, async (element: any) => {
      const rerankMessages = [
        LanguageModelChatMessage.User(
          RerankSearchResultsPrompt.replace("{{searchResult}}", JSON.stringify(element))
            .replace("{{errorContext}}", JSON.stringify(errorContext))
            .replace("{{question}}", rephrasedQuery)
        ),
      ];
      const [res, p, c] = await myAzureOpenaiRequest(rerankMessages);
      promptTokens += p;
      completionTokens += c;
      // console.log(res);
      if (res === "0") {
        return false;
      } else {
        return true;
      }
    });
    // console.log(JSON.stringify(rerankedResults, null, 2));

    // 7. summarize the each result
    const washedResults = await Promise.all(
      filteredRerankedResults.map(async (element) => {
        const msg = [
          LanguageModelChatMessage.User(
            "Summarize the following content:\n" + JSON.stringify(element)
          ),
        ];
        const [res, p, c] = await myAzureOpenaiRequest(msg);
        promptTokens += p;
        completionTokens += c;
        // console.log(res);
        return res;
      })
    );

    // 8. generate response
    response.progress("Generating response...");
    const messages = [
      LanguageModelChatMessage.User(
        TroubleShootingSystemPrompt.replace("{{errorContext}}", JSON.stringify(errorContext))
          .replace("{{outputLog}}", outputLog)
          .replace("{{searchResults}}", JSON.stringify(washedResults))
          .replace("{{rephrasedQuery}}", rephrasedQuery)
      ),
    ];
    const [result, p1, c1] = await myAzureOpenaiRequest(messages);
    promptTokens += p1;
    completionTokens += c1;
    response.markdown(result);
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
