// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fetch from "node-fetch";
import { Issue } from "./types";
import { sleep } from "../../../officeChat/common/utils";
import * as fs from "fs-extra";

export interface GithubIssue {
  search(repo: string, query: string): Promise<GithubIssueSearchResult>;
  retrieve(repo: string, queries: string[]): Promise<GithubIssueSearchResult>;
}

export interface GithubIssueSearchResult {
  total_count: number;
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

export class GithubIssueRetriever implements GithubIssue {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async storeIssues(issues: Issue[]): Promise<void> {
    await fs.ensureDir("./issues");
    for (const issue of issues) {
      const fileName = `./issues/${issue.number}`;
      await fs.writeFile(fileName, JSON.stringify(issue, null, 2), { encoding: "utf8" });
    }
  }

  async fetchComments(folder: string): Promise<void> {
    const files = await fs.readdir(folder);
    for (const file of files) {
      const fileName = `${folder}/${file}`;
      console.log(`Fetching comments for ${fileName}`);
      const issue: Issue = await fs.readJson(`${fileName}`, { encoding: "utf8" });
      if (issue.comments == 0) {
        continue;
      }
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
      await fs.writeFile(fileName, JSON.stringify(issue, null, 2), { encoding: "utf8" });
    }
  }
  async fixNumber(folder: string): Promise<void> {
    const files = await fs.readdir(folder);
    for (const file of files) {
      const fileName = `${folder}/${file}`;
      console.log(`Fetching comments for ${file}`);
      const issue: Issue = await fs.readJson(`${fileName}`, { encoding: "utf8" });
      const newFileName = `${folder}/${issue.number}`;
      await fs.writeFile(newFileName, JSON.stringify(issue, null, 2), { encoding: "utf8" });
      await fs.remove(fileName);
    }
  }
  async search(repo: string, query: string): Promise<GithubIssueSearchResult> {
    const result: GithubIssueSearchResult = { total_count: 0, items: [] };
    let url = `https://api.github.com/search/issues?q=${encodeURIComponent(
      query
    )}+repo:${encodeURIComponent(repo)}`;
    console.log(`Fetching url: ${url}`);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `token ${this.token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`Error: ${await response.text()}`);
    }

    let data: GithubIssueSearchResult = await response.json();
    const total_count = data.total_count;
    result.total_count = total_count;
    result.items.push(...data.items);
    await this.storeIssues(data.items);
    const pageSize = 30;
    const pageCount = Math.ceil(total_count / pageSize);

    for (let pageNum = 2; pageNum <= pageCount; pageNum++) {
      url = `https://api.github.com/search/issues?page=${pageNum}&q=${encodeURIComponent(
        query
      )}+repo:${encodeURIComponent(repo)}`;
      console.log(`Fetching url: ${url}`);
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `token ${this.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      if (!response.ok) {
        throw new Error(`Error: ${await response.text()}`);
      }
      data = await response.json();
      result.items.push(...data.items);
      await this.storeIssues(data.items);
      // await sleep(5000);
    }

    // // Optionally, fetch additional details for each issue
    // for (const issue of result.items) {
    //   if (issue.comments == 0) {
    //     continue;
    //   }
    //   // For comments, make an additional request
    //   const commentsResponse = await fetch(issue.comments_url, {
    //     method: "GET",
    //     headers: {
    //       Authorization: `token ${this.token}`,
    //       Accept: "application/vnd.github.v3+json",
    //     },
    //   });

    //   if (commentsResponse.ok) {
    //     issue.fetchedComments = await commentsResponse.json();
    //   }

    //   await sleep(1000);
    // }
    return result;
  }

  async retrieve(repo: string, queries: string[]): Promise<GithubIssueSearchResult> {
    const result: GithubIssueSearchResult = { total_count: 0, items: [] };
    for (const query of queries) {
      const res = await this.search(repo, query);
      if (res.items.length > 0) {
        result.total_count += res.total_count;
        result.items.push(...res.items);
      }
    }
    return result;
  }
}
