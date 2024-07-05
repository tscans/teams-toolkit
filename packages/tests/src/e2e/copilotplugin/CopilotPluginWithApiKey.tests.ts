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
import { expect } from "chai";

class CopilotPluginWithApiKeyCase extends CaseFactory {
  public override async onAfterCreate(projectPath: string): Promise<void> {
    let keyGenFile = "keyGen file";
    if (fs.existsSync(path.join(projectPath, "src/keyGen.js"))) {
      keyGenFile = "src/keyGen.js";
    } else if (fs.existsSync(path.join(projectPath, "src/keyGen.ts"))) {
      keyGenFile = "src/keyGen.ts";
    }
    const files: string[] = [
      "appPackage/ai-plugin.json",
      "appPackage/manifest.json",
      keyGenFile,
    ];
    for (const file of files) {
      const filePath = path.join(projectPath, file);
      expect(fs.existsSync(filePath), `${filePath} must exist.`).to.eq(true);
    }
    console.log("Start replace secret key in .env.dev.user file");

    const userFile = path.resolve(projectPath, "env", `.env.dev.user`);
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

new CopilotPluginWithApiKeyCase(
  Capability.CopilotPluginFromScratch,
  27569734,
  "yiminjin@microsoft.com",
  ["function"],
  ProgrammingLanguage.TS,
  options,
  record,
  env
).test();

console.log(`Start validate JS language test case`);
new CopilotPluginWithApiKeyCase(
  Capability.CopilotPluginFromScratch,
  27569734,
  "yiminjin@microsoft.com",
  ["copilot plugin"],
  ProgrammingLanguage.JS,
  options,
  record,
  env
).test();
