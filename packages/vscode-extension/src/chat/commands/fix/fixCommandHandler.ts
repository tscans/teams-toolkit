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
  RephraseQueryPrompt,
  RerankSearchResultsPrompt,
  TroubleShootingSystemPrompt,
} from "./prompts";
import * as vscode from "vscode";
import { UserError } from "@microsoft/teamsfx-api";
import { GithubRetriever } from "../../retriever/github/retrieve";
import { getOutputLog, parseErrorContext } from "./utils";

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
    // 1. Get error context, helplink if available
    response.progress("Parsing error context...");
    // const errorContext = {
    //   errorCode: "[AppStudioPlugin.ManifestValidationFailed]",
    //   displayMessage:
    //     "Teams Toolkit has completed checking your app package against validation rules. 2 failed, 1 warning, 50 passed. Check Output panel for details.",
    // };
    const errorContext = parseErrorContext(request.prompt);

    // 2. Get Output panel log
    response.progress("Retrieving output panel log...");
    const outputLog = await getOutputLog();

    // 3. rephrase query with chat history
    response.progress("Rephrasing query...");
    let rephrasedQuery = "";
    if (context.history.length > 0) {
      const chatHistory: { user: string; assistant: string }[] = [];
      for (let i = 0; i < context.history.length - 1; i += 2) {
        if (
          context.history[i] instanceof ChatRequestTurn &&
          context.history[i + 1] instanceof ChatResponseTurn
        ) {
          chatHistory.push({
            user: (context.history[i] as ChatRequestTurn).prompt,
            assistant: ChatResponseToString(context.history[i + 1] as ChatResponseTurn),
          });
        }
      }

      // const rephraseMessages = [
      //   LanguageModelChatMessage.User(
      //     RephraseQueryPrompt.replace("{{ chat_history }}", JSON.stringify(chatHistory)).replace(
      //       "{{ chat_input }}",
      //       request.prompt
      //     )
      //   ),
      //   LanguageModelChatMessage.User(request.prompt),
      // ];
      // console.log(JSON.stringify(rephraseMessages, null, 2));
      // rephrasedQuery = await getCopilotResponseAsString("copilot-gpt-4", rephraseMessages, token);
      const rephraseMessages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: RephraseQueryPrompt.replace(
                "{{ chat_history }}",
                JSON.stringify(chatHistory)
              ).replace("{{ chat_input }}", request.prompt),
            },
          ],
        },
      ];
      rephrasedQuery = await myAzureOpenaiRequest(rephraseMessages);
    } else {
      if (request.prompt === "") {
        rephrasedQuery = "How to fix the error?";
      } else {
        rephrasedQuery = request.prompt;
      }
    }
    console.log(rephrasedQuery);

    // 4. get search patterns
    response.progress("Extracting search patterns...");
    // const searchMessages = [
    //   LanguageModelChatMessage.User(
    //     GetSearchPatternsPrompt.replace("{{errorContext}}", JSON.stringify(errorContext)).replace(
    //       "{{outputLog}}",
    //       outputLog
    //     )
    //   ),
    // ];
    // const searchPatternsString = await getCopilotResponseAsString(
    //   "copilot-gpt-4",
    //   searchMessages,
    //   token
    // );
    const searchMessages = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: GetSearchPatternsPrompt.replace(
              "{{errorContext}}",
              JSON.stringify(errorContext)
            ).replace("{{outputLog}}", outputLog),
          },
        ],
      },
    ];
    const searchPatternsString = await myAzureOpenaiRequest(searchMessages);
    console.log("Search patterns: ", searchPatternsString);
    const searchPatterns = JSON.parse(searchPatternsString.split("```json")[1].split("```")[0]);

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
      // const rerankMessages = [
      //   LanguageModelChatMessage.User(
      //     RerankSearchResultsPrompt.replace("{{searchResult}}", JSON.stringify(element)).replace(
      //       "{{question}}",
      //       rephrasedQuery
      //     )
      //   ),
      // ];
      // await new Promise((resolve) => setTimeout(resolve, 1500));
      // const res = await getCopilotResponseAsString("copilot-gpt-4", rerankMessages, token);
      const rerankMessages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: RerankSearchResultsPrompt.replace("{{searchResult}}", JSON.stringify(element))
                .replace("{{errorContext}}", JSON.stringify(errorContext))
                .replace("{{question}}", rephrasedQuery),
            },
          ],
        },
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
      filteredRerankedResults.map((element) => async () => {
        // const msg = [
        //   LanguageModelChatMessage.User(
        //     "Summarize the following content:\n" + JSON.stringify(element)
        //   ),
        // ];
        // await new Promise((resolve) => setTimeout(resolve, 1500));
        // const res = await getCopilotResponseAsString("copilot-gpt-4", msg, token);
        const msg = [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Summarize the following content:\n" + JSON.stringify(element),
              },
            ],
          },
        ];
        const res = await myAzureOpenaiRequest(msg);
        console.log(res);
        return res;
      })
    );

    // 8. generate response
    response.progress("Generating response...");
    // const messages = [
    //   LanguageModelChatMessage.User(
    //     TroubleShootingSystemPrompt.replace("{{errorContext}}", JSON.stringify(errorContext))
    //       .replace("{{outputLog}}", outputLog)
    //       .replace("{{searchResults}}", JSON.stringify(washedResults))
    //       .replace("{{rephrasedQuery}}", rephrasedQuery)
    //   ),
    // ];
    // const messages = [
    //   LanguageModelChatMessage.User(
    //     TroubleShootingSystemPrompt.replace("{{errorContext}}", JSON.stringify(errorContext))
    //       .replace("{{outputLog}}", outputLog)
    //       .replace("{{rephrasedQuery}}", rephrasedQuery)
    //   ),
    //   LanguageModelChatMessage.User(
    //     SearchResultsPrompt.replace("{{searchResults}}", JSON.stringify(rerankedResults))
    //   ),
    // ];
    // console.log(JSON.stringify(messages, null, 2));
    // await new Promise((resolve) => setTimeout(resolve, 1500));
    // await verbatimCopilotInteraction("copilot-gpt-4", messages, response, token);
    const messages = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: TroubleShootingSystemPrompt.replace(
              "{{errorContext}}",
              JSON.stringify(errorContext)
            )
              .replace("{{outputLog}}", outputLog)
              .replace("{{searchResults}}", JSON.stringify(washedResults))
              .replace("{{rephrasedQuery}}", rephrasedQuery),
          },
        ],
      },
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
