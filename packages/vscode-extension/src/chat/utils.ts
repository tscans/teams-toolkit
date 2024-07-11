// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  CancellationToken,
  ChatResponseMarkdownPart,
  ChatResponseStream,
  ChatResponseTurn,
  LanguageModelChatMessage,
  LanguageModelChatMessageRole,
  lm,
} from "vscode";

import { sampleProvider } from "@microsoft/teamsfx-core";
import { BaseTokensPerCompletion, BaseTokensPerMessage, BaseTokensPerName } from "./consts";
import { Tokenizer } from "./tokenizer";
import { max } from "lodash";

export async function verbatimCopilotInteraction(
  model: "copilot-gpt-3.5-turbo" | "copilot-gpt-4",
  messages: LanguageModelChatMessage[],
  response: ChatResponseStream,
  token: CancellationToken
) {
  const [vendor, family] = model.split(/-(.*)/s);
  const chatModels = await lm.selectChatModels({ vendor, family });
  const familyMatch = chatModels?.find((chatModel) => chatModel.family === family);
  if (!familyMatch) {
    throw new Error("No chat models available for the specified family");
  }
  const chatResponse = await familyMatch.sendRequest(messages, {}, token);
  for await (const fragment of chatResponse.text) {
    response.markdown(fragment);
  }
}

export async function getCopilotResponseAsString(
  model: "copilot-gpt-3.5-turbo" | "copilot-gpt-4",
  messages: LanguageModelChatMessage[],
  token: CancellationToken
): Promise<string> {
  const [vendor, family] = model.split(/-(.*)/s);
  const chatModels = await lm.selectChatModels({ vendor, family });
  const familyMatch = chatModels?.find((chatModel) => chatModel.family === family);
  if (!familyMatch) {
    throw new Error("No chat models available for the specified family");
  }
  const chatResponse = await familyMatch.sendRequest(messages, {}, token);
  let response = "";
  for await (const fragment of chatResponse.text) {
    response += fragment;
  }
  return response;
}

export async function getSampleDownloadUrlInfo(sampleId: string) {
  const sampleCollection = await sampleProvider.SampleCollection;
  const sample = sampleCollection.samples.find((sample) => sample.id === sampleId);
  if (!sample) {
    throw new Error("Sample not found");
  }
  return sample.downloadUrlInfo;
}

// count message token for GPT3.5 and GPT4 message
// refer to vscode copilot tokenizer solution
export function countMessageTokens(message: LanguageModelChatMessage): number {
  let numTokens = BaseTokensPerMessage;
  const tokenizer = Tokenizer.getInstance();
  for (const [key, value] of Object.entries(message)) {
    if (!value || key === "role") {
      continue;
    }
    numTokens += tokenizer.tokenLength(value);
    if (key === "name") {
      numTokens += BaseTokensPerName;
    }
  }
  return numTokens;
}

export function countMessagesTokens(messages: LanguageModelChatMessage[]): number {
  let numTokens = 0;
  for (const message of messages) {
    numTokens += countMessageTokens(message);
  }
  numTokens += BaseTokensPerCompletion;
  return numTokens;
}

export function ChatResponseToString(response: ChatResponseTurn): string {
  let result = "";
  for (const fragment of response.response) {
    if (fragment instanceof ChatResponseMarkdownPart) {
      result += fragment.value.value;
    }
  }

  return result;
}

export async function myAzureOpenaiRequest(
  messages: LanguageModelChatMessage[],
  response_format: { [key: string]: string } | undefined = undefined
): Promise<[string, number, number]> {
  const headers = {
    "Content-Type": "application/json",
    "api-key": process.env.OPENAI_API_KEY || "",
  };

  const payload = {
    messages: messages.map((message) => {
      return {
        role: message.role === LanguageModelChatMessageRole.User ? "user" : "system",
        content: message.content,
      };
    }),
    temperature: 0.5,
    top_p: 0.95,
    // max_tokens: 4096,
  };

  if (response_format) {
    (payload as any)["response_format"] = response_format;
  }

  const GPT4O_ENDPOINT = process.env.OPENAI_ENDPOINT || "";

  try {
    const stream = await fetch(GPT4O_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const json = await stream.json();
    if (json?.choices?.length > 0) {
      return [
        json.choices[0]?.message?.content ?? "",
        json.usage?.prompt_tokens ?? 0,
        json.usage?.completion_tokens ?? 0,
      ];
    } else {
      return ["", json?.usage?.prompt_tokens ?? 0, json?.usage?.completion_tokens ?? 0];
    }
  } catch (error) {
    throw new Error(
      `Error in sending request to Azure OpenAI endpoint: ${(error as Error).message}`
    );
  }
}
