import * as chai from "chai";
import * as sinon from "sinon";
import * as dotenv from "dotenv";
import { GithubAasRetriever } from "../../../src/chat/retriever/github/azure-ai-search";
import { StackOverFlowAasRetriever } from "../../../src/chat/retriever/stack-overflow/azure-ai-search";

describe("retriever test", () => {
  const sandbox = sinon.createSandbox();

  before(() => {
    dotenv.config();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("retrieve github issues by azure ai search", async () => {
    const githubRetriever = GithubAasRetriever.getInstance();
    const resp = await githubRetriever.issue.retrieve("OfficeDev/teams-toolkit", "Code Error");
    console.log(resp);
    chai.expect(resp).is.not.empty;
    return;
  });

  it("retrieve stack overflow by azure ai search", async () => {
    const retriever = StackOverFlowAasRetriever.getInstance();
    const resp = await retriever.retrieve("Code Error");
    console.log(resp);
    chai.expect(resp).is.not.empty;
    return;
  });
});
