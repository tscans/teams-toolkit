import * as chai from "chai";
import * as sinon from "sinon";
import * as dotenv from "dotenv";
import { GithubAasRetriever } from "../../../src/chat/retriever/github/azure-ai-search";

describe("retriever test", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("retrieve github issues by azure ai search", async () => {
    dotenv.config();
    const githubRetriever = GithubAasRetriever.getInstance();
    const resp = await githubRetriever.issue.retrieve("OfficeDev/teams-toolkit", "Code Error");
    chai.expect(resp).is.not.empty;
    return;
  });
});
