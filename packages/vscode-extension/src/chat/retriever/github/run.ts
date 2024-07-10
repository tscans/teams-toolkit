// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { GithubIssueRetriever } from "./retrieve";

async function crawlIssues() {
  const retriever = new GithubIssueRetriever(process.env.GITHUB_ISSUE_PAT!);
  await retriever.search("OfficeDev/teams-toolkit", "is:issue is:closed");
  await retriever.fetchComments("./issues");
}

void crawlIssues();
