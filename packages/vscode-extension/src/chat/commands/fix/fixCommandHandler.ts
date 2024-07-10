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
import { GithubRetriever } from "../../retriever/github/retrieve";
import { getOutputLog, parseErrorContext, wrapChatHistory } from "./utils";

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
      const parsedErrorContext = await myAzureOpenaiRequest(parsedErrorContextMessages);
      console.log("ParsedErrorContext: ", parsedErrorContext);
      errorContext = JSON.parse(parsedErrorContext);
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
      rephrasedQuery = await myAzureOpenaiRequest(rephraseMessages);
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
    const searchPatternsString = await myAzureOpenaiRequest(searchMessages, {
      type: "json_object",
    });
    console.log("Search patterns: \n", searchPatternsString);
    const searchPatterns = JSON.parse(searchPatternsString);

    // 5. retrieve search results
    response.progress("Retrieving search results...");
    const githubToken = await vscode.authentication.getSession("github", ["public_repo"], {
      createIfNone: true,
    });
    if (githubToken === undefined) {
      throw new UserError("ChatParticipants", "FixCommand", "GithubToken Undefined");
    }

    const retriever = GithubRetriever.getInstance(githubToken.accessToken);
    const searchResults = await retriever.issue.retrieve(
      "OfficeDev/teams-toolkit",
      searchPatterns.searchPatterns
    );

    // 6. search result reranking
    response.progress("Reranking search results...");
    const filteredResults = searchResults.items.filter((item) => item.score >= 1);
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
      const res = await myAzureOpenaiRequest(rerankMessages);
      console.log(res);
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
        const res = await myAzureOpenaiRequest(msg);
        console.log(res);
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
    const result = await myAzureOpenaiRequest(messages);
    response.markdown(result);
  } catch (error) {
    console.error(error);
    response.markdown((error as Error).message);
  }

  chatTelemetryData.markComplete();
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
