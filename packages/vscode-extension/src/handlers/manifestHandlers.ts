// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  AppPackageFolderName,
  BuildFolderName,
  err,
  FxError,
  ok,
  Platform,
  Result,
  SelectFileConfig,
  SingleSelectConfig,
  Stage,
} from "@microsoft/teamsfx-api";
import * as fs from "fs-extra";
import * as path from "path";
import {
  window,
  workspace,
  Diagnostic,
  DiagnosticSeverity,
  TextDocument,
  Position,
  DiagnosticCollection,
  Range,
  Uri,
  DiagnosticRelatedInformation,
  Location,
} from "vscode";
import { core, workspaceUri } from "../globalVariables";
import { VS_CODE_UI } from "../qm/vsc_ui";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent } from "../telemetry/extTelemetryEvents";
import { localize } from "../utils/localizeUtils";
import { getSystemInputs } from "../utils/systemEnvUtils";
import { getTriggerFromProperty } from "../utils/telemetryUtils";
import { runCommand } from "./sharedOpts";
import { QuestionNames } from "@microsoft/teamsfx-core";
import { sleep } from "@microsoft/vscode-ui";

export async function validateManifestHandler(args?: any[]): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.ValidateManifestStart,
    getTriggerFromProperty(args)
  );

  const inputs = getSystemInputs();
  return await runCommand(Stage.validateApplication, inputs);
}

export async function buildPackageHandler(...args: unknown[]): Promise<Result<unknown, FxError>> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.BuildStart, getTriggerFromProperty(args));
  return await runCommand(Stage.createAppPackage);
}

let lastAppPackageFile: string | undefined;

export async function publishInDeveloperPortalHandler(
  ...args: unknown[]
): Promise<Result<null, FxError>> {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.PublishInDeveloperPortalStart,
    getTriggerFromProperty(args)
  );
  const workspacePath = workspaceUri?.fsPath;
  const zipDefaultFolder: string | undefined = path.join(
    workspacePath!,
    BuildFolderName,
    AppPackageFolderName
  );

  let files: string[] = [];
  if (await fs.pathExists(zipDefaultFolder)) {
    files = await fs.readdir(zipDefaultFolder);
    files = files
      .filter((file) => path.extname(file).toLowerCase() === ".zip")
      .map((file) => {
        return path.join(zipDefaultFolder, file);
      });
  }
  while (true) {
    const selectFileConfig: SelectFileConfig = {
      name: "appPackagePath",
      title: localize("teamstoolkit.publishInDevPortal.selectFile.title"),
      placeholder: localize("teamstoolkit.publishInDevPortal.selectFile.placeholder"),
      filters: {
        "Zip files": ["zip"],
      },
    };
    if (lastAppPackageFile && fs.existsSync(lastAppPackageFile)) {
      selectFileConfig.default = lastAppPackageFile;
    } else {
      selectFileConfig.possibleFiles = files.map((file) => {
        const appPackageFilename = path.basename(file);
        const appPackageFilepath = path.dirname(file);
        return {
          id: file,
          label: `$(file) ${appPackageFilename}`,
          description: appPackageFilepath,
        };
      });
    }
    const selectFileResult = await VS_CODE_UI.selectFile(selectFileConfig);
    if (selectFileResult.isErr()) {
      ExtTelemetry.sendTelemetryErrorEvent(
        TelemetryEvent.PublishInDeveloperPortal,
        selectFileResult.error,
        getTriggerFromProperty(args)
      );
      return ok(null);
    }
    if (
      (lastAppPackageFile && selectFileResult.value.result === lastAppPackageFile) ||
      (!lastAppPackageFile && files.indexOf(selectFileResult.value.result!) !== -1)
    ) {
      // user selected file in options
      lastAppPackageFile = selectFileResult.value.result;
      break;
    }
    // final confirmation
    lastAppPackageFile = selectFileResult.value.result!;
    const appPackageFilename = path.basename(lastAppPackageFile);
    const appPackageFilepath = path.dirname(lastAppPackageFile);
    const confirmOption: SingleSelectConfig = {
      options: [
        {
          id: "yes",
          label: `$(file) ${appPackageFilename}`,
          description: appPackageFilepath,
        },
      ],
      name: "confirm",
      title: localize("teamstoolkit.publishInDevPortal.selectFile.title"),
      placeholder: localize("teamstoolkit.publishInDevPortal.confirmFile.placeholder"),
      step: 2,
    };
    const confirm = await VS_CODE_UI.selectOption(confirmOption);
    if (confirm.isErr()) {
      ExtTelemetry.sendTelemetryErrorEvent(
        TelemetryEvent.PublishInDeveloperPortal,
        confirm.error,
        getTriggerFromProperty(args)
      );
      return ok(null);
    }
    if (confirm.value.type === "success") {
      break;
    }
  }
  const inputs = getSystemInputs();
  inputs["appPackagePath"] = lastAppPackageFile;
  const res = await runCommand(Stage.publishInDeveloperPortal, inputs);
  if (res.isErr()) {
    ExtTelemetry.sendTelemetryErrorEvent(
      TelemetryEvent.PublishInDeveloperPortal,
      res.error,
      getTriggerFromProperty(args)
    );
  }
  return res;
}

export async function updatePreviewManifest(args: any[]): Promise<any> {
  ExtTelemetry.sendTelemetryEvent(
    TelemetryEvent.UpdatePreviewManifestStart,
    getTriggerFromProperty(args && args.length > 1 ? [args[1]] : undefined)
  );
  const inputs = getSystemInputs();
  const result = await runCommand(Stage.deployTeams, inputs);

  if (!args || args.length === 0) {
    const workspacePath = workspaceUri?.fsPath;
    const inputs = getSystemInputs();
    inputs.ignoreEnvInfo = true;
    const env = await core.getSelectedEnv(inputs);
    if (env.isErr()) {
      ExtTelemetry.sendTelemetryErrorEvent(TelemetryEvent.UpdatePreviewManifest, env.error);
      return err(env.error);
    }
    const manifestPath = `${
      workspacePath as string
    }/${AppPackageFolderName}/${BuildFolderName}/manifest.${env.value as string}.json`;
    void workspace.openTextDocument(manifestPath).then((document) => {
      void window.showTextDocument(document);
    });
  }
  return result;
}

export async function zipAndValidateAppPackage(
  diagnosticCollection: DiagnosticCollection,
  args: any[]
): Promise<any> {
  await sleep(1000);
  const document = args[0] as TextDocument;
  const filePath = document.uri.fsPath;
  const workspacePath = workspaceUri?.fsPath;
  const zipDefaultFolder: string | undefined = path.join(
    workspacePath!,
    BuildFolderName,
    AppPackageFolderName
  );
  // const zipAppPackageRes = await runCommand(Stage.createAppPackage, {
  //   [QuestionNames.TeamsAppManifestFilePath]: filePath,
  //   platform: Platform.VSCode,
  //   projectPath: workspacePath
  // });

  const errors = [
    {
      id: "958d86ff-864b-474d-bea4-d8068b8c8cad",
      title: "ShortNameContainsPreprodWording",
      content: "Short name doesn't contain beta environment keywords",
      helpUrl:
        "https://docs.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema#name",
      filePath: "manifest.json",
      shortCodeNumber: 4000,
      validationCategory: "Name",
    },
  ];

  diagnosticCollection.set(document.uri, [
    {
      code: "",
      message: "cannot assign twice to immutable variable `x`",
      range: new Range(new Position(3, 4), new Position(3, 10)),
      severity: DiagnosticSeverity.Error,
      source: "",
      relatedInformation: [
        new DiagnosticRelatedInformation(
          new Location(document.uri, new Range(new Position(1, 8), new Position(1, 9))),
          "first assignment to `x`"
        ),
      ],
    },
  ]);

  // let diagnosticCollection: DiagnosticCollection;
  // diagnosticCollection.clear();
  // const diagnosticMap: Map<string, Diagnostic[]> = new Map();
  // errors.forEach((error) => {
  //   const canonicalFile = Uri.parse(filePath).toString();
  //   const regex = new RegExp(error.validationCategory);

  //   const text = document.getText();
  //   let matches;
  //   let range;
  //   if ( (matches = regex.exec(text)) !== null) {
  //     const match = matches[0];
  //     const line = document.lineAt(document.positionAt(matches.index).line);
  //     const indexOf = line.text.indexOf(match);
  //     const position = new Position(line.lineNumber, indexOf);
  //     range = new Range(position, new Position(line.lineNumber, indexOf + match.length));

  //     let diagnostics = diagnosticMap.get(canonicalFile);
  //     if (!diagnostics) {
  //       diagnostics = [];
  //     }
  //     diagnostics.push(new Diagnostic(range, error.content, DiagnosticSeverity.Error));
  //     diagnosticMap.set(canonicalFile, diagnostics);
  // }
  // });
  // diagnosticMap.forEach((diags, file) => {
  //   diagnosticCollection.set(Uri.parse(file), diags);
  // });

  //   {
  //     "id": "958d86ff-864b-474d-bea4-d8068b8c8cad",
  //     "title": "ShortNameContainsPreprodWording",
  //     "content": "Short name doesn't contain beta environment keywords",
  //     "helpUrl": "https://docs.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema#name",
  //     "filePath": "manifest.json",
  //     "shortCodeNumber": 4000,
  //     "validationCategory": "Name"
  // },

  // {
  //   "id": "fe260769-7844-4a6e-a639-58ff3960216f",
  //   "title": "permissionss",
  //   "content": "Property \"permissionss\" has not been defined and the schema does not allow additional properties.",
  //   "filePath": "manifest.json",
  //   "line": 34,
  //   "column": 19
  // }

  // if(zipAppPackageRes.isErr()){
  //   vsc
  // }
}
