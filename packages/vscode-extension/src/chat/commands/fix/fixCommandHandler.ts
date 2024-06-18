// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  CancellationToken,
  ChatContext,
  ChatFollowup,
  ChatRequest,
  ChatResponseStream,
  LanguageModelChatMessage,
  LanguageModelChatMessageRole,
} from "vscode";
import { ICopilotChatResult } from "../../types";
import { chatParticipantId, TeamsChatCommand } from "../../consts";
import { ExtTelemetry } from "../../../telemetry/extTelemetry";
import { TelemetryEvent, TelemetryTriggerFrom } from "../../../telemetry/extTelemetryEvents";
import { ChatTelemetryData } from "../../telemetry";
import { localize } from "../../../utils/localizeUtils";
import { sleep } from "@microsoft/vscode-ui";

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

  if (request.prompt.trim() === "") {
    response.markdown("Need input");

    chatTelemetryData.markComplete();
    ExtTelemetry.sendTelemetryEvent(
      TelemetryEvent.CopilotChat,
      chatTelemetryData.properties,
      chatTelemetryData.measurements
    );
  }

  // TODO: Implement the logic of the command here
  await sleep(1000);

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
