// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fetch from "node-fetch";
import { Issue, GithubRetriever, GithubIssueRetriever } from "./types";

export class GithubRestRetriever implements GithubRetriever<Issue> {
  private static instance: GithubRestRetriever;
  private token: string;

  public issue: GithubIssueRetriever<Issue>;

  private constructor(token: string) {
    this.token = token;
    this.issue = new GithubIssueRestRetriever(this.token);
  }

  public reAuth(token: string): GithubRestRetriever {
    GithubRestRetriever.instance = new GithubRestRetriever(token);
    return GithubRestRetriever.instance;
  }

  public static getInstance(token: string): GithubRestRetriever {
    if (!GithubRestRetriever.instance) {
      GithubRestRetriever.instance = new GithubRestRetriever(token);
    }
    return GithubRestRetriever.instance;
  }
}

interface GithubIssueSearchResult {
  items: Issue[];
}

/*
 * This is a retriever based on GitHub REST API
 */
class GithubIssueRestRetriever implements GithubIssueRetriever<Issue> {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async retrieve(repo: string, query: string): Promise<Issue[]> {
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

    return data.items;
  }

  async batchRetrieve(repo: string, queries: string[]): Promise<Issue[]> {
    const retrievePromises: Promise<Issue[]>[] = queries.map((q) => this.retrieve(repo, q));
    const responses = await Promise.all(retrievePromises);
    return responses.reduce((acc, val) => acc.concat(val), []);
  }
}
