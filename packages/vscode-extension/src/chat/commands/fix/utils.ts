// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import { ErrorContext } from "./types";
import VsCodeLogInstance from "../../../commonlib/log";

export function parseErrorContext(query: string): ErrorContext | "" {
  try {
    const parsed = JSON.parse(query);
    if (
      "errorCode" in parsed &&
      typeof parsed.errorCode === "string" &&
      "message" in parsed &&
      typeof parsed.message === "string" &&
      "stack" in parsed &&
      typeof parsed.stack === "string" &&
      "helpLink" in parsed &&
      typeof parsed.helpLink === "string"
    ) {
      return {
        errorCode: parsed.errorCode,
        message: parsed.message,
        stack: parsed.stack,
        helpLink: parsed.helpLink,
      };
    }
  } catch (e) {
    return "";
  }

  return "";
}

export async function getOutputLog(): Promise<string> {
  const logFilePath = VsCodeLogInstance.getLogFilePath();
  if (!fs.existsSync(logFilePath)) {
    return "";
  }

  const logContent = await fs.readFile(logFilePath);
  // return only the last 1000 lines
  const lines = logContent.toString().split("\n");
  const lastLines = lines.slice(Math.max(lines.length - 100, 0)).join("\n");
  return lastLines;
}
