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
  public override async onAfterCreate(projectPath: string): Promise<void> {
    const files: string[] = [
      "appPackage/ai-plugin.json",
      "appPackage/manifest.json",
    ];
    for (const file of files) {
      const filePath = path.join(projectPath, file);
      expect(fs.existsSync(filePath), `${filePath} must exist.`).to.eq(true);
    }
  }
}

// OpenAI
const record: Record<string, string> = {};
record["custom-copilot-agent"] = "custom-copilot-agent-new";
record["llm-service"] = "llm-service-openai";
record["openai-key"] = "fake";
new CopilotPluginFromScratchCase(
  Capability.CopilotPluginFromScratch,
  27569734,
  "yiminjin@microsoft.com",
  ["copilot plugin"],
  ProgrammingLanguage.TS,
  {},
  record
).test();
