// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { SearchClient, AzureKeyCredential } from "@azure/search-documents";
import { StackOverflowPost, StackOverFlowRetriever } from "./types";
import { AzureOpenAI } from "openai";
import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";

interface AzureAISearchConfig {
  Endpoint: string;
  ApiKey: string;
}

export class StackOverFlowAasRetriever implements StackOverFlowRetriever {
  private static instance: StackOverFlowAasRetriever;

  private azureAiSearchClient: SearchClient<StackOverflowPost>;
  private azureOpenAIClient: AzureOpenAI;

  public constructor(config?: AzureAISearchConfig) {
    const tmpConfig = config
      ? config
      : {
          Endpoint: process.env.AZURE_AI_SEARCH_ENDPOINT ?? "",
          ApiKey: process.env.AZURE_AI_SEARCH_API_KEY ?? "",
        };
    this.azureAiSearchClient = new SearchClient<StackOverflowPost>(
      tmpConfig.Endpoint,
      "cosmosdb-index-stack-overflow-with-body",
      new AzureKeyCredential(tmpConfig.ApiKey)
    );
    const credential = new DefaultAzureCredential();
    const scope = "https://cognitiveservices.azure.com/.default";
    const azureADTokenProvider = getBearerTokenProvider(credential, scope);
    this.azureOpenAIClient = new AzureOpenAI({
      apiVersion: "2024-05-01-preview",
      deployment: "text-embedding-3-large",
      azureADTokenProvider: azureADTokenProvider,
    });
  }

  public static getInstance(config?: AzureAISearchConfig): StackOverFlowAasRetriever {
    if (!StackOverFlowAasRetriever.instance) {
      StackOverFlowAasRetriever.instance = new StackOverFlowAasRetriever(config);
    }
    return StackOverFlowAasRetriever.instance;
  }

  async retrieve(query: string): Promise<StackOverflowPost[]> {
    const issues: StackOverflowPost[] = [];

    const queryVector = await this.azureOpenAIClient.embeddings.create({
      input: query,
      model: "",
    });

    const searchResults = await this.azureAiSearchClient.search(query, {
      queryType: "semantic",
      top: 10,
      semanticSearchOptions: {
        configurationName: "stack-overflow-semantic",
      },
      vectorSearchOptions: {
        queries: [
          {
            kind: "vector",
            vector: queryVector.data[0].embedding,
            fields: ["question_vector"],
            kNearestNeighborsCount: 10,
          },
        ],
      },
    });

    for await (const result of searchResults.results) {
      issues.push(result.document);
    }

    return issues;
  }

  async batchRetrieve(queries: string[], limit?: number): Promise<StackOverflowPost[]> {
    const retrievePromises: Promise<StackOverflowPost[]>[] = queries.map((q) => this.retrieve(q));
    const responses = await Promise.all(retrievePromises);
    const result = responses.reduce((acc, val) => acc.concat(val), []);
    return limit ? result.slice(0, limit) : result;
  }
}
