// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yimin Jin <yiminjin@microsoft.com>
 */

import { Capability } from "../../utils/constants";
import { CaseFactory } from "../caseFactory";
import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import * as path from "path";
import * as fs from "fs-extra";
import { validateFiles } from "./validator";

class CopilotPluginWithApiKeyForCsharpCase extends CaseFactory {
  public override async onAfterCreate(projectPath: string): Promise<void> {
    const files: string[] = [
      "TeamsApp/appPackage/ai-plugin.json",
      "TeamsApp/appPackage/manifest.json",
      "TeamsApp/GenerateApiKey.ps1",
    ];
    validateFiles(projectPath, files);

    console.log("Start replace secret key in .env.dev.user file");
    const userFile = path.resolve(
      projectPath,
      "TeamsApp",
      "env",
      `.env.dev.user`
    );
    const newSecretKey = 'SECRET_API_KEY="test-secret-api-key"';
    let fileContent = fs.readFileSync(userFile, "utf8");
    fileContent = fileContent.replace(/(SECRET_API_KEY=).*/, newSecretKey);
    fs.writeFileSync(userFile, fileContent, "utf8");
    console.log(`Updated ${newSecretKey} in .env.dev.user file`);
  }
}

const env = Object.assign({}, process.env);
env["API_COPILOT_PLUGIN"] = "true";
env["DEVELOP_COPILOT_PLUGIN"] = "true";
const record: Record<string, string> = {};
record["api-auth"] = "api-key";

const options = {
  skipErrorMessage: "No elements found in the manifest",
  skipValidate: true,
};

new CopilotPluginWithApiKeyForCsharpCase(
  Capability.CopilotPluginFromScratch,
  28640069,
  "yiminjin@microsoft.com",
  ["copilot plugin"],
  ProgrammingLanguage.CSharp,
  options,
  record,
  env
).test();
