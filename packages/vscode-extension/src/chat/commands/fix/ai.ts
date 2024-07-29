// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureOpenAI } from "openai";
import { getBearerTokenProvider, DefaultAzureCredential } from "@azure/identity";
import { ChatResponseStream, LanguageModelChatMessage } from "vscode";
import { ChatCompletionMessageParam } from "openai/resources";

export class CustomAI {
  public client: AzureOpenAI;

  public constructor(endpoint: string, apiVersion: string) {
    const credential = new DefaultAzureCredential();
    const scope = "https://cognitiveservices.azure.com/.default";
    const azureADTokenProvider = getBearerTokenProvider(credential, scope);
    this.client = new AzureOpenAI({
      apiVersion: apiVersion,
      endpoint: endpoint,
      azureADTokenProvider: azureADTokenProvider,
    });
  }

  public async getOpenaiResponseAsString(
    deployment: string,
    messages: LanguageModelChatMessage[],
    response_format: { [key: string]: string } | undefined = undefined
  ): Promise<[string, number, number]> {
    const msgs = messages.map((message) => {
      return {
        role: message.role === 1 ? "user" : "system",
        content: message.content,
      } as ChatCompletionMessageParam;
    });
    const result = await this.client.chat.completions.create({
      model: deployment,
      messages: msgs,
      response_format,
    });

    return [
      result.choices[0]?.message?.content ?? "",
      result.usage?.prompt_tokens ?? 0,
      result.usage?.completion_tokens ?? 0,
    ];
  }

  public async verbatimOpenaiInteraction(
    deployment: string,
    messages: LanguageModelChatMessage[],
    response: ChatResponseStream
  ): Promise<[number, number]> {
    const msgs = messages.map((message) => {
      return {
        role: message.role === 1 ? "user" : "system",
        content: message.content,
      } as ChatCompletionMessageParam;
    });
    const result = await this.client.chat.completions.create({
      model: deployment,
      messages: msgs,
      stream: true,
    });

    let promptTokens = 0,
      completionTokens = 0;
    for await (const fragment of result) {
      promptTokens += fragment.usage?.prompt_tokens ?? 0;
      completionTokens += fragment.usage?.completion_tokens ?? 0;
      response.markdown(fragment.choices[0]?.delta?.content ?? "");
    }

    return [promptTokens, completionTokens];
  }
}
