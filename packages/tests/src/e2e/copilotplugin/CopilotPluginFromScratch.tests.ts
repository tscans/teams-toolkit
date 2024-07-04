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

class CopilotPluginFromScratchCase extends CaseFactory {
  public override async onCreate(
    appName: string,
    testFolder: string,
    capability: Capability,
    programmingLanguage?: ProgrammingLanguage | undefined,
    custimized?: Record<string, string> | undefined,
    processEnv?: NodeJS.ProcessEnv | undefined
  ): Promise<void> {
    if (processEnv) {
      processEnv["API_COPILOT_PLUGIN"] = "true";
      processEnv["DEVELOP_COPILOT_PLUGIN"] = "true";
    }
    await super.onCreate(
      appName,
      testFolder,
      capability,
      programmingLanguage,
      custimized,
      processEnv
    );
    console.log("onCreate successful");
  }

  public override async onAfterCreate(projectPath: string): Promise<void> {
    const files: string[] = [
      "appPackage/ai-plugin.json",
      "appPackage/manifest.json",
    ];
    for (const file of files) {
      const filePath = path.join(projectPath, file);
      expect(fs.existsSync(filePath), `${filePath} must exist.`).to.eq(true);
    }
    console.log("onAfterCreate successful");
  }
}

const record: Record<string, string> = {};
record["api-auth"] = "none";
new CopilotPluginFromScratchCase(
  Capability.CopilotPluginFromScratch,
  27569734,
  "yiminjin@microsoft.com",
  ["copilot plugin"],
  ProgrammingLanguage.TS,
  {},
  record
).test();
