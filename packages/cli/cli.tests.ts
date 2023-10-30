import { spawn } from "child_process";
import { promisify } from "util";
import { happyPathTest } from "./tests/e2e/bot/BotHappyPathCommon";
import { Runtime } from "./tests/commonlib/constants";
import { it } from "@microsoft/extra-shot-mocha";
import {
  cleanUp,
  execAsync,
  execAsyncWithRetry,
  getTestFolder,
  getUniqueAppName,
  readContextMultiEnvV3,
  createResourceGroup,
} from "./tests/e2e/commonUtils";
import path from "path";
import { environmentNameManager } from "@microsoft/teamsfx-core";
import cli from "./cli";

async function runCommand(cmd: string) {
  process.argv = [
    "node", // Not used but a value is required at this index in the array
    "cli.js", // Not used but a value is required at this index in the array
    ...cmd.split(" "),
  ];

  // Require the yargs CLI script
  return require("./cli");
}

describe("Remote happy path for echo bot dotnet", () => {
  it(
    "Remote happy path for echo bot dotnet",
    { testPlanCaseId: 24916323, author: "yukundong@microsoft.com" },
    async function () {
      const testFolder = getTestFolder();
      const appName = getUniqueAppName();
      const projectPath = path.resolve(testFolder, appName);

      const env = Object.assign({}, process.env);
      const cliPath = path.resolve(__dirname, "cli.js");
      const cmdBase = `new --interactive false --app-name ${appName} --capability bot`;
      const cmd = `${cmdBase} --programming-language typescript`;
      console.log(`ready to run CMD: ${cmd.split(" ")}`);
      // await execAsync(cmd, {
      //     cwd: testFolder,
      //     env: env,
      //     timeout: 0,
      // });
      await runCommand(cmd);
      console.log(`[Successfully] scaffold to ${projectPath}`);
    }
  );
});

const result = JSON.stringify(global.__coverage__);
console.log("============================== bb test ==============================");
console.log("result:", result);
