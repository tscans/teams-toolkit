// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CreateProjectResult, Stage, SystemError, UserError } from "@microsoft/teamsfx-api";
import { getSystemInputs } from "../utils/systemEnvUtils";
import { ApiPluginStartOptions, CapabilityOptions, QuestionNames } from "@microsoft/teamsfx-core";
import { runCommand } from "./sharedOpts";
import * as vscode from "vscode";
import { openFolder } from "../utils/workspaceUtils";
import * as path from "path";

export async function createProjectFromKiota(args?: any[]) {
  if (!args || args.length < 2) {
    throw new UserError("extension", "missingParameterInDeeplink", "missing parameter");
  }

  const specPath = args[0];
  const pluginManifestPath = args[1];
  const filePath = args[2];
  if (!specPath || !pluginManifestPath) {
    // TODO (kiota): throw error
    throw new UserError("extension", "missingParameterInDeeplink", "missing parameter");
  }

  const inputs = getSystemInputs();
  inputs.capabilities = CapabilityOptions.apiPlugin().id;
  inputs[QuestionNames.ApiSpecLocation] = specPath;
  inputs[QuestionNames.ApiPluginManifestPath] = pluginManifestPath;
  inputs[QuestionNames.ApiPluginType] = ApiPluginStartOptions.apiSpec().id;
  inputs[QuestionNames.ApiOperation] = pluginManifestPath;
  inputs[QuestionNames.ProjectType] = "copilot-extension-type";
  if (filePath) {
    inputs[QuestionNames.Folder] = path.join(filePath, "../");
    inputs[QuestionNames.AppName] = path.basename(filePath);
  }
  // TODO (kiota): handle scaffold directly scenario
  const result = await runCommand(Stage.create, inputs);

  if (result.isErr()) {
    throw new SystemError("extension", "failedToCreateProject", "create failed");
  }

  const res = result.value as CreateProjectResult;
  const projectPathUri = vscode.Uri.file(res.projectPath);
  await openFolder(projectPathUri, true, res.warnings);
}
