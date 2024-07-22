// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { SearchClient, AzureKeyCredential } from "@azure/search-documents";
import { GithubIssueRetriever, GithubRetriever, IssueIndex } from "./types";

interface AzureAISearchConfig {
  Endpoint: string;
  ApiKey: string;
}

export class GithubAasRetriever implements GithubRetriever<IssueIndex> {
  private static instance: GithubAasRetriever;
  private config: AzureAISearchConfig;

  public issue: GithubIssueRetriever<IssueIndex>;

  private constructor(config?: AzureAISearchConfig) {
    this.config = config
      ? config
      : {
          Endpoint: process.env.AZURE_AI_SEARCH_ENDPOINT ?? "",
          ApiKey: process.env.AZURE_AI_SEARCH_API_KEY ?? "",
        };
    this.issue = new GithubIssueAasRetriever(this.config);
  }

  public static getInstance(config?: AzureAISearchConfig): GithubAasRetriever {
    if (!GithubAasRetriever.instance) {
      GithubAasRetriever.instance = new GithubAasRetriever(config);
    }
    return GithubAasRetriever.instance;
  }
}

export class GithubIssueAasRetriever implements GithubIssueRetriever<IssueIndex> {
  private client: SearchClient<IssueIndex>;

  public constructor(config: AzureAISearchConfig) {
    this.client = new SearchClient<IssueIndex>(
      config.Endpoint,
      "github-issue-index",
      new AzureKeyCredential(config.ApiKey)
    );
  }

  async retrieve(repo: string, query: string): Promise<IssueIndex[]> {
    const issues: IssueIndex[] = [];

    const searchResults = await this.client.search(query, {});

    for await (const result of searchResults.results) {
      issues.push(result.document);
    }

    return issues;
  }

  async batchRetrieve(repo: string, queries: string[], limit?: number): Promise<IssueIndex[]> {
    const retrievePromises: Promise<IssueIndex[]>[] = queries.map((q) => this.retrieve(repo, q));
    const responses = await Promise.all(retrievePromises);
    const result = responses.reduce((acc, val) => acc.concat(val), []);
    return limit ? result.slice(0, limit) : result;
  }
}
