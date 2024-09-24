// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";

import { AppPackageFolderName } from "@microsoft/teamsfx-api";

import { copilotStudioClient } from "../../client/copilotStudioClient";
import { CopilotStudioScopes } from "../../common/constants";
import { MetadataV3 } from "../../common/versionMetadata";
import { copilotGptManifestUtils } from "../driver/teamsApp/utils/CopilotGptManifestUtils";
import { manifestUtils } from "../driver/teamsApp/utils/ManifestUtils";
import { envUtil } from "../utils/envUtil";
import { DeclarativeAgentBotContext } from "./declarativeAgentBotContext";
import { DeclarativeAgentBotDefinition } from "./declarativeAgentDefinition";

const launchJsonFile = ".vscode/launch.json";

export async function create(context: DeclarativeAgentBotContext): Promise<void> {
  await wrapExecution(context);
}

async function wrapExecution(context: DeclarativeAgentBotContext): Promise<void> {
  try {
    await doTasks(context);
  } catch (error: any) {
    await rollbackExecution(context);
    throw error;
  }
}

async function doTasks(context: DeclarativeAgentBotContext): Promise<void> {
  await updateLaunchJson(context);
  await updateTeamsManifest(context);
  await provisionBot(context);
  await getBotId(context);
  await updateEnv(context);
}

async function updateLaunchJson(context: DeclarativeAgentBotContext): Promise<void> {
  const launchJsonPath = path.join(context.projectPath, launchJsonFile);
  if (await fs.pathExists(launchJsonPath)) {
    await context.backup(launchJsonFile);
    let launchJsonContent = await fs.readFile(launchJsonPath, "utf8");

    const jsonObject = JSON.parse(launchJsonContent);
    jsonObject.configurations.push({
      name: "Preview Bot in Teams (Edge)",
      type: "msedge",
      request: "launch",
      url:
        "https://teams.microsoft.com/l/app/" +
        "${{TEAMS_APP_ID}}?installAppPackage" +
        "=true&webjoin=true&${account-hint}",
      cascadeTerminateToConfigurations: ["Attach to Local Service"],
      presentation: {
        group: "2-bot",
        order: 1,
      },
      internalConsoleOptions: "neverOpen",
    });
    jsonObject.configurations.push({
      name: "Preview Bot in Teams (Chrome)",
      type: "chrome",
      request: "launch",
      url:
        "https://teams.microsoft.com/l/app/" +
        "${{TEAMS_APP_ID}}?installAppPackage" +
        "=true&webjoin=true&${account-hint}",
      presentation: {
        group: "2-bot",
        order: 2,
      },
    });
    launchJsonContent = JSON.stringify(jsonObject, null, 4);
    await context.fsWriteFile(launchJsonFile, launchJsonContent, "utf8");
  }
}

async function updateTeamsManifest(context: DeclarativeAgentBotContext): Promise<void> {
  const manifestFile = path.join(AppPackageFolderName, MetadataV3.teamsManifestFileName);
  if (await fs.pathExists(path.join(context.projectPath, manifestFile))) {
    await context.backup(manifestFile);
    const manifestContent = await manifestUtils.readAppManifest(context.projectPath);
    if (manifestContent.isErr()) {
      return;
    }
    const manifest = manifestContent.value;
    if (!manifest.bots) {
      manifest.bots = [];
    }
    manifest.bots.push({
      botId: "${{BOT_ID}}",
      scopes: ["personal", "team", "groupChat"],
      supportsFiles: false,
      isNotificationOnly: false,
    });
    await context.fsWriteFile(manifestFile, JSON.stringify(manifest, undefined, 4));
  }
}

async function provisionBot(context: DeclarativeAgentBotContext): Promise<void> {
  const copilotGptManifestPath = path.join(
    context.projectPath,
    context.declarativeAgentManifestPath
  );
  const copilotGptManifest = await copilotGptManifestUtils.readCopilotGptManifestFile(
    copilotGptManifestPath
  );
  if (copilotGptManifest.isErr()) {
    return;
  }

  // construct payload for bot provisioning
  const payload: DeclarativeAgentBotDefinition = {
    GptDefinition: {
      id: copilotGptManifest.value.id,
      name: copilotGptManifest.value.name,
      description: copilotGptManifest.value.description,
      instructions: copilotGptManifest.value.instructions,
    },
    PersistentModel: 1,
    EnableChannels: ["msteams"],
  };

  // provision bot
  const result = await context.tokenProvider!.getAccessToken({
    scopes: CopilotStudioScopes,
  });

  if (result.isErr()) {
    return;
  }

  const accessToken = result.value;
  await copilotStudioClient.createBot(accessToken, payload);
}

async function getBotId(context: DeclarativeAgentBotContext): Promise<void> {
  const result = await context.tokenProvider!.getAccessToken({
    scopes: CopilotStudioScopes,
  });

  if (result.isErr()) {
    return;
  }

  const accessToken = result.value;
  if (context.declarativeAgentId) {
    const botId = await copilotStudioClient.getBot(accessToken, context.declarativeAgentId);
    context.teamsBotId = botId;
  }
}

async function updateEnv(context: DeclarativeAgentBotContext): Promise<void> {
  if (context.teamsBotId) {
    await envUtil.writeEnv(context.projectPath, context.env, {
      BOT_ID: context.teamsBotId,
    });
  }
}

async function rollbackExecution(context: DeclarativeAgentBotContext): Promise<void> {
  await context.cleanModifiedPaths();
  await context.restoreBackup();
  await context.cleanBackup();
}
