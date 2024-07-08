// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Capability } from "../../utils/constants";
import { CaseFactory } from "../caseFactory";
import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { validateFiles } from "./validator";

class CopilotPluginOAuthTestForJsCase extends CaseFactory {
  public override async onAfterCreate(projectPath: string): Promise<void> {
    const files: string[] = [
      "appPackage/ai-plugin.json",
      "appPackage/manifest.json",
    ];
    validateFiles(projectPath, files);
  }
}

const copilotPluginOAuth: Record<string, string> = {};
copilotPluginOAuth["api-auth"] = "oauth";

const env = Object.assign({}, process.env);
env["API_COPILOT_PLUGIN"] = "true";
env["DEVELOP_COPILOT_PLUGIN"] = "true";

const options = {
  skipErrorMessage: "No elements found in the manifest",
};

new CopilotPluginOAuthTestForJsCase(
  Capability.CopilotPluginFromScratch,
  27569691,
  "huimiao@microsoft.com",
  ["function"],
  ProgrammingLanguage.TS,
  options,
  copilotPluginOAuth,
  env
).test();
