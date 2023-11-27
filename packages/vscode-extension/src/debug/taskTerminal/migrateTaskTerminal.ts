// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

import { FxError, ok, Result, Void } from "@microsoft/teamsfx-api";
import * as commonUtils from "../commonUtils";
import { BaseTaskTerminal } from "./baseTaskTerminal";

export class MigrateTaskTerminal extends BaseTaskTerminal {
  constructor(taskDefinition: vscode.TaskDefinition) {
    super(taskDefinition);
  }

  async do(): Promise<Result<Void, FxError>> {
    await commonUtils.triggerV3Migration();
    return ok(Void);
  }

  protected recommendTestTool(): boolean {
    return false;
  }
}
