// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import * as fs from "fs-extra";
import { expect } from "chai";

export async function validateFiles(
  projectPath: string,
  files: string[]
): Promise<void> {
  for (const file of files) {
    const filePath = path.join(projectPath, file);
    expect(fs.existsSync(filePath), `${filePath} must exist.`).to.eq(true);
  }
  console.log("Files validation successful");
}
