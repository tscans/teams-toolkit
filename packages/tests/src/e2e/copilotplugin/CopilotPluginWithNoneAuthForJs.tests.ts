// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yimin Jin <yiminjin@microsoft.com>
 */

import { Capability } from "../../utils/constants";
import { CaseFactory } from "../caseFactory";
import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { validateFiles } from "./validator";

class CopilotPluginWithNoneAuthForJsCase extends CaseFactory {
  public override async onAfterCreate(projectPath: string): Promise<void> {
    const files: string[] = [
      "appPackage/ai-plugin.json",
      "appPackage/manifest.json",
    ];
    validateFiles(projectPath, files);
  }
}

const env = Object.assign({}, process.env);
env["API_COPILOT_PLUGIN"] = "true";
env["DEVELOP_COPILOT_PLUGIN"] = "true";
const record: Record<string, string> = {};
record["api-auth"] = "none";

const options = {
  skipErrorMessage: "No elements found in the manifest",
  skipValidate: true,
};

new CopilotPluginWithNoneAuthForJsCase(
  Capability.CopilotPluginFromScratch,
  27569734,
  "yiminjin@microsoft.com",
  ["copilot plugin"],
  ProgrammingLanguage.TS,
  options,
  record,
  env
).test();
