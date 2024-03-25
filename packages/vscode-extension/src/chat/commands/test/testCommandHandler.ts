// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CancellationToken,
  ChatContext,
  ChatRequest,
  ChatResponseStream,
  LanguageModelChatUserMessage,
} from "vscode";
import { ICopilotChatResult } from "../../types";
import * as sampleTests from "./sampleMatchTest.json";
import * as templateTests from "./templateMatchTest.json";
import { getProjectMatchSystemPrompt } from "../../prompts";
import { getCopilotResponseAsString } from "../../utils";
import { sampleProvider } from "@microsoft/teamsfx-core";
import { ProjectMetadata } from "../create/types";
import * as teamsTemplateMetadata from "../create/templateMetadata.json";

export default async function testCommandHandler(
  request: ChatRequest,
  context: ChatContext,
  response: ChatResponseStream,
  token: CancellationToken
): Promise<ICopilotChatResult> {
  const statistics = {
    passed: 0,
    acceptable: 0,
    failed: 0,
  };

  for (const test of [...templateTests, ...sampleTests]) {
    const result = await matchProject(request, test.prompt, token);

    let matched = false;
    let isFirstResult = false;
    for (const expectedApp of test.expected) {
      if (result.some((r) => r.id === expectedApp)) {
        matched = true;
        isFirstResult = expectedApp === result[0].id;
        break;
      }
    }
    if (matched) {
      if (isFirstResult) {
        statistics.passed++;
      } else {
        statistics.acceptable++;
      }
    } else {
      statistics.failed++;
    }
    response.markdown(
      `[${
        matched ? (isFirstResult ? "Passed" : "Acceptable") : "Failed"
      }] response: ${JSON.stringify(result.map((r) => r.id))}\n\n`
    );
  }

  return {
    metadata: {
      command: undefined,
      requestId: "chatTelemetryData.requestId",
    },
  };
}

async function matchProject(
  request: ChatRequest,
  prompt: string,
  token: CancellationToken
): Promise<ProjectMetadata[]> {
  const allProjectMetadata = [...getTeamsTemplateMetadata(), ...(await getTeamsSampleMetadata())];
  const messages = [
    getProjectMatchSystemPrompt(allProjectMetadata),
    new LanguageModelChatUserMessage(prompt),
  ];

  const response = await getCopilotResponseAsString("copilot-gpt-3.5-turbo", messages, token);
  const matchedProjectId: string[] = [];
  if (response) {
    try {
      const responseJson = JSON.parse(response);
      if (responseJson && responseJson.app) {
        matchedProjectId.push(...(responseJson.app as string[]));
      }
    } catch (e) {}
  }
  const result: ProjectMetadata[] = [];
  for (const id of matchedProjectId) {
    const matchedProject = allProjectMetadata.find((config) => config.id === id);
    if (matchedProject) {
      result.push(matchedProject);
    }
  }
  return result;
}

function getTeamsTemplateMetadata(): ProjectMetadata[] {
  return teamsTemplateMetadata.map((config) => {
    return {
      id: config.id,
      type: "template",
      platform: "Teams",
      name: config.name,
      description: config.description,
      data: {
        capabilities: config.id,
        "project-type": config["project-type"],
      },
    };
  });
}

async function getTeamsSampleMetadata(): Promise<ProjectMetadata[]> {
  const sampleCollection = await sampleProvider.SampleCollection;
  const result: ProjectMetadata[] = [];
  for (const sample of sampleCollection.samples) {
    result.push({
      id: sample.id,
      type: "sample",
      platform: "Teams",
      name: sample.title,
      description: sample.fullDescription,
    });
  }
  return result;
}
