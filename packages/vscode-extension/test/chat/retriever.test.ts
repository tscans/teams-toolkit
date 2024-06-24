import * as chai from "chai";
import * as sinon from "sinon";
import * as dotenv from "dotenv";
import { GithubRetriever } from "../../src/chat/retriever/github/retrieve";

describe("retriever test", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("retrieve github issues by keywords", async () => {
    dotenv.config();
    const githubRetriever = GithubRetriever.getInstance(process.env.GITHUB_TOKEN ?? "");
    const resp = await githubRetriever.issue.search("OfficeDev/teams-toolkit", "Code Error");
    chai.expect(resp).is.not.empty;
    return;
  });
});
