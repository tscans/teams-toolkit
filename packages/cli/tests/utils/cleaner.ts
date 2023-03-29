// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { M365TokenProvider } from "@microsoft/teamsfx-api";
import { AadManager } from "../commonlib";
import { deleteResourceGroupByName } from "../e2e/commonUtils";
import {
  AADAppIdEnvNames,
  BotIdEnvName,
  M365TitleIdEnvName,
  ResourceGroupEnvName,
  TeamsAppIdEnvName,
} from "./constants";
import { M365TitleHelper } from "./m365TitleHelper";
import { ProjectEnvReader } from "./projectEnvReader";
import { TeamsAppHelper } from "./teamsAppHelper";

export class Cleaner {
  static async clean(projectPath: string, m365TokenProvider?: M365TokenProvider) {
    if (!projectPath) {
      return Promise.resolve(true);
    }
    const envs = await ProjectEnvReader.readAllEnvFiles(projectPath);
    const aadManager = await AadManager.init(m365TokenProvider);
    const teamsAppHelper = await TeamsAppHelper.init(m365TokenProvider);
    const m365TitleHelper = await M365TitleHelper.init(undefined, undefined, m365TokenProvider);
    return envs.map(async (env) =>
      Promise.all([
        /// clean up resource group
        deleteResourceGroupByName(env[ResourceGroupEnvName]),
        /// clean up aad apps
        AADAppIdEnvNames.map((name) => aadManager.deleteAadAppsByClientId(env[name])),
        /// clean up teams app
        teamsAppHelper.deleteTeamsAppById(env[TeamsAppIdEnvName]),
        /// clean up bot framework app
        teamsAppHelper.deleteBotById(env[BotIdEnvName]),
        /// clean up published teams app
        teamsAppHelper.cancelStagedTeamsAppById(env[TeamsAppIdEnvName]),
        /// clean up m365 app
        m365TitleHelper.unacquire(env[M365TitleIdEnvName]),
      ])
    );
  }
}
