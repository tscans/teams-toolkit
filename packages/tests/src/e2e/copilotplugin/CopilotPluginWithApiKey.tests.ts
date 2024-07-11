// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Yimin Jin <yiminjin@microsoft.com>
 */

import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { CopilotPluginCommonTest } from "./copilotPluginCommonTest";

class CopilotPluginWithApiAuthCase extends CopilotPluginCommonTest {}

new CopilotPluginWithApiAuthCase(
  28640069,
  "yimin@microsoft.com",
  "api-key",
  ProgrammingLanguage.TS,
  ["appPackage/ai-plugin.json", "appPackage/manifest.json", "src/keyGen.ts"]
).test();

new CopilotPluginWithApiAuthCase(
  28640069,
  "yimin@microsoft.com",
  "api-key",
  ProgrammingLanguage.JS,
  ["appPackage/ai-plugin.json", "appPackage/manifest.json", "src/keyGen.js"]
).test();

new CopilotPluginWithApiAuthCase(
  28640069,
  "yimin@microsoft.com",
  "api-key",
  ProgrammingLanguage.CSharp,
  [
    "appPackage/ai-plugin.json",
    "appPackage/manifest.json",
    "GenerateApiKey.ps1",
  ]
).test();
