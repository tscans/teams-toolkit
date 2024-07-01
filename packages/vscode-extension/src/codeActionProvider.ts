// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { sleep } from "@microsoft/vscode-ui";
import * as vscode from "vscode";

export class CodeActionProvider implements vscode.CodeActionProvider<vscode.CodeAction> {
  public provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    if (!context.only) {
      return [];
    }

    const actions: vscode.CodeAction[] = [];

    // eslint-disable-next-line func-style
    // const addToCodeAction = (action: vscode.CodeAction) => {
    //   if (!context.only || context.only.contains(action.kind!)) {
    //     codeActions.push(action);
    //   }
    // };

    const diagnostics = context.diagnostics || [];
    console.log(diagnostics);

    const extensionDiagnostics = diagnostics.filter((diagnostics) => diagnostics.source === "TTK");
    console.log("extensionDiagnostics");
    console.log(extensionDiagnostics);

    for (const diag of extensionDiagnostics) {
      const type = diag.code;
      const title = `try to fix with teams agent`;
      const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
      action.command = {
        command: "fx-extension.invokeChat",
        title,
        arguments: [document.uri, type],
      };
      action.diagnostics = [diag];
      action.isPreferred = false;
      actions.push(action);
    }

    return actions;
  }
}
