// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fetch from "node-fetch";
import { Issue } from "./types";

export interface GithubIssue {
  search(repo: string, query: string): Promise<GithubIssueSearchResult>;
  retrieve(repo: string, queries: string[], threshold?: number): Promise<GithubIssueSearchResult>;
}

export interface GithubIssueSearchResult {
  items: Issue[];
}

export interface Github {
  issue: GithubIssue;
}

export class GithubRetriever implements Github {
  private static instance: GithubRetriever;
  private token: string;

  // TODO: @Long refine how to penetrate octokit to subs
  issue: GithubIssue;

  private constructor(token: string) {
    this.token = token;
    this.issue = new GithubIssueRetriever(this.token);
  }

  public reAuth(token: string): GithubRetriever {
    GithubRetriever.instance = new GithubRetriever(token);
    return GithubRetriever.instance;
  }

  public static getInstance(token: string): GithubRetriever {
    if (!GithubRetriever.instance) {
      GithubRetriever.instance = new GithubRetriever(token);
    }
    return GithubRetriever.instance;
  }
}

class GithubIssueRetriever implements GithubIssue {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async search(repo: string, query: string): Promise<GithubIssueSearchResult> {
    const url = `https://api.github.com/search/issues?q=${encodeURIComponent(
      query
    )}+repo:${encodeURIComponent(repo)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `token ${this.token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data: GithubIssueSearchResult = await response.json();

    // Optionally, fetch additional details for each issue
    for (const issue of data.items) {
      if (issue.comments == 0) {
        continue;
      }
      // For comments, make an additional request
      const commentsResponse = await fetch(issue.comments_url, {
        method: "GET",
        headers: {
          Authorization: `token ${this.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (commentsResponse.ok) {
        issue.fetchedComments = await commentsResponse.json();
      }

      issue.fetchedComments = issue.fetchedComments.slice(-5);
    }

    return data;
  }

  async retrieve(repo: string, queries: string[], threshold = 3): Promise<GithubIssueSearchResult> {
    const result: GithubIssueSearchResult = { items: [] };
    for (const query of queries) {
      const res = await this.search(repo, query);
      if (res.items.length > 0) {
        result.items.push(...res.items.slice(0, threshold));
      }
    }

    return result;
  }
}
