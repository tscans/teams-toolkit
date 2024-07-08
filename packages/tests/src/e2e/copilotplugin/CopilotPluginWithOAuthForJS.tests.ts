// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Hui Miao <huimiao@microsoft.com>
 */

import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { CopilotPluginCommonTest } from "./copilotPluginCommonTest";
import { validateFiles } from "./helper";

class CopilotPluginOAuthForJsTestCase extends CopilotPluginCommonTest {
  public override async onAfterCreate(projectPath: string): Promise<void> {
    const files: string[] = [
      "appPackage/ai-plugin.json",
      "appPackage/manifest.json",
    ];
    validateFiles(projectPath, files);
  }
}

new CopilotPluginOAuthForJsTestCase(
  27569691,
  "huimiao@microsoft.com",
  "oauth",
  ProgrammingLanguage.JS
).test();
