// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  CancellationToken,
  ChatContext,
  ChatFollowup,
  ChatRequest,
  ChatRequestTurn,
  ChatResponseStream,
  ChatResponseTurn,
  LanguageModelChatMessage,
  LanguageModelChatMessageRole,
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
import { RephraseQueryPrompt } from "./prompts";
import { sleep } from "@microsoft/vscode-ui";
import * as fs from "fs-extra";
import VsCodeLogInstance from "../../../commonlib/log";
import { log } from "console";

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
    response.progress("Retrieving error context...");

    // 2. Get Output panel log
    response.progress("Retrieving output panel log...");
    const outputLog = await getOutputLog();
    console.log(outputLog);

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

      const rephraseMessages = [
        LanguageModelChatMessage.User(
          RephraseQueryPrompt.replace("{{ chat_history }}", JSON.stringify(chatHistory)).replace(
            "{{ chat_input }}",
            request.prompt
          )
        ),
        LanguageModelChatMessage.User(request.prompt),
      ];
      console.log(JSON.stringify(rephraseMessages, null, 2));
      const rephrasedQuery = await getCopilotResponseAsString(
        "copilot-gpt-4",
        rephraseMessages,
        token
      );
      console.log(rephrasedQuery);
    } else {
      rephrasedQuery = request.prompt;
    }

    // 4. get search patterns
    response.progress("Extracting search patterns...");

    // 5. retrieve search results
    response.progress("Retrieving search results...");

    // 6. search result reranking
    response.progress("Reranking search results...");
    await sleep(1000);

    // 7. generate response
    response.progress("Generating response...");
    const messages = [
      LanguageModelChatMessage.User(
        "You are a specialist in troubleshooting Teams App development with the Teams Toolkit. The user seeks assistance in resolving errors or issues encountered while using the Teams Toolkit to develop a Teams App. Your role is to offer advice on how to solve these problems."
      ),
      LanguageModelChatMessage.User(rephrasedQuery),
    ];
    await verbatimCopilotInteraction("copilot-gpt-4", messages, response, token);
  } catch (error) {
    console.error(error);
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

export async function getOutputLog(): Promise<string> {
  const logFilePath = VsCodeLogInstance.getLogFilePath();
  if (!fs.existsSync(logFilePath)) {
    return "";
  }

  const logContent = await fs.readFile(logFilePath);
  // return only the last 1000 lines
  const lines = logContent.toString().split("\n");
  const lastLines = lines.slice(Math.max(lines.length - 1000, 0)).join("\n");
  return lastLines;
}
