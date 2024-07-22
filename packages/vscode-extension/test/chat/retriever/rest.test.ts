import * as chai from "chai";
import * as sinon from "sinon";
import * as dotenv from "dotenv";
import { GithubRestRetriever } from "../../../src/chat/retriever/github/rest";

describe("retriever test", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("retrieve github issues by rest api", async () => {
    dotenv.config();
    const githubRetriever = GithubRestRetriever.getInstance(process.env.GITHUB_TOKEN ?? "");
    const resp = await githubRetriever.issue.retrieve("OfficeDev/teams-toolkit", "Code Error");
    chai.expect(resp).is.not.empty;
    return;
  });
});
