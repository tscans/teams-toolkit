// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yimin Jin <yiminjin@microsoft.com>
 */

import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { CopilotPluginCommonTest } from "./copilotPluginCommonTest";
import { replaceSecretKey, validateFiles } from "./helper";
import * as path from "path";

class CopilotPluginWithNoneAuthForJsCase extends CopilotPluginCommonTest {
  public override async onAfterCreate(projectPath: string): Promise<void> {
    const files: string[] = [
      "appPackage/ai-plugin.json",
      "appPackage/manifest.json",
      "src/keyGen.js",
    ];
    await validateFiles(projectPath, files);

    const userFile = path.resolve(projectPath, "env", `.env.dev.user`);
    await replaceSecretKey(userFile);
  }
}

class CopilotPluginWithNoneAuthForTsCase extends CopilotPluginCommonTest {
  public override async onAfterCreate(projectPath: string): Promise<void> {
    const files: string[] = [
      "appPackage/ai-plugin.json",
      "appPackage/manifest.json",
      "src/keyGen.ts",
    ];
    await validateFiles(projectPath, files);

    const userFile = path.resolve(projectPath, "env", `.env.dev.user`);
    await replaceSecretKey(userFile);
  }
}

class CopilotPluginWithNoneAuthForDotnetCase extends CopilotPluginCommonTest {
  public override async onAfterCreate(projectPath: string): Promise<void> {
    const files: string[] = [
      "appPackage/ai-plugin.json",
      "appPackage/manifest.json",
      "GenerateApiKey.ps1",
    ];
    await validateFiles(projectPath, files);

    const userFile = path.resolve(projectPath, "env", `.env.dev.user`);
    await replaceSecretKey(userFile);
  }
}

new CopilotPluginWithNoneAuthForJsCase(
  28640069,
  "yimin@microsoft.com",
  "api-key",
  ProgrammingLanguage.JS
).test();

new CopilotPluginWithNoneAuthForTsCase(
  28640069,
  "yimin@microsoft.com",
  "api-key",
  ProgrammingLanguage.TS
).test();

new CopilotPluginWithNoneAuthForDotnetCase(
  28641218,
  "yimin@microsoft.com",
  "api-key",
  ProgrammingLanguage.CSharp
).test();
