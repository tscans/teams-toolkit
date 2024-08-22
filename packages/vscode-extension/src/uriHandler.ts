// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as queryString from "query-string";
import * as vscode from "vscode";

import { codeSpacesAuthComplete } from "./commonlib/common/constant";
import { localize } from "./utils/localizeUtils";
import { TelemetryTriggerFrom } from "./telemetry/extTelemetryEvents";
import { runCommand } from "./handlers/sharedOpts";
import { CreateProjectResult, Stage, SystemError, UserError } from "@microsoft/teamsfx-api";
import { getSystemInputs } from "./utils/systemEnvUtils";
import { ApiPluginStartOptions, CapabilityOptions, QuestionNames } from "@microsoft/teamsfx-core";
import { openFolder } from "./utils/workspaceUtils";

export let uriEventHandler: UriHandler;

enum Referrer {
  DeveloperPortal = "developerportal",
  OfficeDoc = "officedoc",
}
interface QueryParams {
  appId?: string;
  referrer?: string;
  login_hint?: string;
  sampleId?: string;
  specPath?: string;
  apiPluginManifestPath?: string;
  scaffoldNewProject?: boolean;
}

let isRunning = false;
export class UriHandler extends vscode.EventEmitter<vscode.Uri> implements vscode.UriHandler {
  async handleUri(uri: vscode.Uri): Promise<void | null | undefined> {
    if (uri.path === "/" + codeSpacesAuthComplete) {
      this.fire(uri);
      return;
    }

    if (uri.path.toLowerCase() === "/" + "createprojectfromkiota") {
      const queryParamas = queryString.parse(uri.query) as QueryParams;
      const specPath = queryParamas.specPath;
      const pluginManifestPath = queryParamas.apiPluginManifestPath;
      const scaffoldNew = queryParamas.scaffoldNewProject;
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
      // TODO (kiota): handle scaffold directly scenario
      const result = await runCommand(Stage.create, inputs);

      if (result.isErr()) {
        throw new SystemError("extension", "failedToCreateProject", "create failed");
      }

      const res = result.value as CreateProjectResult;
      const projectPathUri = vscode.Uri.file(res.projectPath);
      await openFolder(projectPathUri, true, res.warnings);

      return;
    }

    if (!uri.query) {
      void vscode.window.showErrorMessage(
        localize("teamstoolkit.devPortalIntegration.invalidLink")
      );
      return;
    }
    const queryParamas = queryString.parse(uri.query) as QueryParams;
    if (!queryParamas.referrer) {
      void vscode.window.showErrorMessage(
        localize("teamstoolkit.devPortalIntegration.invalidLink")
      );
      return;
    }

    if (queryParamas.referrer === Referrer.DeveloperPortal) {
      if (isRunning) {
        void vscode.window.showWarningMessage(
          localize("teamstoolkit.devPortalIntegration.blockingMessage")
        );
        return;
      }
      if (!queryParamas.appId) {
        void vscode.window.showErrorMessage(
          localize("teamstoolkit.devPortalIntegration.invalidLink")
        );
        return;
      }

      isRunning = true;
      vscode.commands
        .executeCommand("fx-extension.openFromTdp", queryParamas.appId, queryParamas.login_hint)
        .then(
          () => {
            isRunning = false;
          },
          () => {
            isRunning = false;
          }
        );
    } else if (queryParamas.referrer === Referrer.OfficeDoc) {
      if (!queryParamas.sampleId) {
        void vscode.window.showErrorMessage(
          localize("teamstoolkit.devPortalIntegration.invalidLink")
        );
        return;
      }
      void vscode.commands.executeCommand(
        "fx-extension.openSamples",
        TelemetryTriggerFrom.ExternalUrl,
        queryParamas.sampleId
      );
    }
  }
}

export function setUriEventHandler(uriHandler: UriHandler) {
  uriEventHandler = uriHandler;
}
