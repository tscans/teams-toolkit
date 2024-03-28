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
import {
  getProjectMatchSystemPrompt,
  defaultSystemPrompt,
  describeProjectSystemPrompt,
  brieflyDescribeProjectSystemPrompt,
} from "../../prompts";
import { getCopilotResponseAsString } from "../../utils";
import { sampleProvider } from "@microsoft/teamsfx-core";
import { ProjectMetadata } from "../create/types";
import * as teamsTemplateMetadata from "../create/templateMetadata.json";
import * as XLSX from "xlsx";
import path = require("path");

const model4 = "copilot-gpt-4";
const model35 = "copilot-gpt-3.5-turbo";

export default async function testCommandHandler(
  request: ChatRequest,
  context: ChatContext,
  response: ChatResponseStream,
  token: CancellationToken
): Promise<ICopilotChatResult> {
  const filePath = "./test_data_set.xlsx";
  const sheetName = "test";
  const absolutePath = path.resolve(filePath);
  const workbook = XLSX.readFile(absolutePath);
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });
  const dataRows = jsonData.slice(1);

  for (const row of dataRows as any[][]) {
    const prompt = row[1] as string;
    if (prompt === undefined) {
      continue;
    }

    if (request.prompt === "createe2e") {
      const llmOutput = await createCommandHandler(request, prompt, response, token);

      row[3] = llmOutput;
      console.log(`prompt:\n ${prompt}\n\n response:\n ${llmOutput}\n\n`);
      await sleep(22500);
    } else {
      const messages = [defaultSystemPrompt(), new LanguageModelChatUserMessage(prompt)]; // for @teams case
      const llmOutput = await getCopilotResponseAsString(model4, messages, token);
      row[3] = llmOutput;
      console.log(`prompt:\n ${prompt}\n\n response:\n ${llmOutput}\n\n`);
      await sleep(1100);
    }
  }

  const newWorksheet = XLSX.utils.aoa_to_sheet(jsonData as any[][]);
  workbook.Sheets[sheetName] = newWorksheet;
  XLSX.writeFile(workbook, absolutePath);

  response.markdown(`hello\n\n`);

  return {
    metadata: {
      command: undefined,
      requestId: "chatTelemetryData.requestId",
    },
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  const response = await getCopilotResponseAsString(model35, messages, token);
  console.log(`temp response:\n ${response}\n`);
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

async function createCommandHandler(
  request: ChatRequest,
  prompt: string,
  response: ChatResponseStream,
  token: CancellationToken
): Promise<string> {
  const matchedResult = await matchProject(request, prompt, token);

  let result = "";
  if (matchedResult.length === 0) {
    result =
      "No matching templates or samples found. Try a different app description or explore other templates.\n";
  } else if (matchedResult.length === 1) {
    const firstMatch = matchedResult[0];
    const describeProjectChatMessages = [
      describeProjectSystemPrompt,
      new LanguageModelChatUserMessage(
        `The project you are looking for is '${JSON.stringify(firstMatch)}'.`
      ),
    ];

    const toAppendMessage = await getCopilotResponseAsString(
      model35,
      describeProjectChatMessages,
      token
    );
    result = firstMatch.id + "\n\n" + toAppendMessage;
  } else {
    result = `We've found ${
      matchedResult.slice(0, 3).length
    } projects that match your description. Take a look at them below.\n`;

    const idList = matchedResult.slice(0, 3).map((res) => res.id);
    result = idList.join(",") + "\n";
    for (const project of matchedResult.slice(0, 3)) {
      const brieflyDescribeProjectChatMessages = [
        brieflyDescribeProjectSystemPrompt,
        new LanguageModelChatUserMessage(
          `The project you are looking for is '${JSON.stringify(project)}'.`
        ),
      ];

      const toAppendMessage = await getCopilotResponseAsString(
        model35,
        brieflyDescribeProjectChatMessages,
        token
      );

      result = result + "\n" + toAppendMessage;
    }
  }

  return result;
}
