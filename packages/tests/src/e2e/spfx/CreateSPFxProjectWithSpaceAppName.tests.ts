// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Huihui Wu <huihuiwu@microsoft.com>
 */

import * as fs from "fs-extra";
import * as path from "path";
import { expect } from "chai";
import { cleanUpLocalProject, getTestFolder } from "../commonUtils";
import { ProgrammingLanguage } from "@microsoft/teamsfx-core";
import { it } from "@microsoft/extra-shot-mocha";
import { Executor } from "../../utils/executor";
import { Capability } from "../../utils/constants";

describe("Start a new project", function () {
  let appName: string;
  let testFolder: string;
  let projectPath: string;
  beforeEach(async () => {
    testFolder = getTestFolder();
    appName = "spfx tab";
    projectPath = path.resolve(testFolder, appName);
  });

  it(
    "Create SPFx project with app name that contains space",
    { testPlanCaseId: 24137851, author: "huihuiwu@microsoft.com" },
    async function () {
      {
        const result = await Executor.createProject(
          testFolder,
          `"${appName}"`,
          Capability.Spfx,
          ProgrammingLanguage.TS
        );

        // check specified files
        const files: string[] = [
          "config/config.json",
          "config/deploy-azure-storage.json",
          "config/package-solution.json",
          "config/serve.json",
          "config/write-manifests.json",
          "src/webparts/helloworld/HelloworldWebPart.manifest.json",
          "src/webparts/helloworld/HelloworldWebPart.ts",
          "src/webparts/helloworld/loc/en-us.js",
          "src/webparts/helloworld/loc/mystrings.d.ts",
          "src/webparts/helloworld/assets/welcome-dark.png",
          "src/webparts/helloworld/assets/welcome-light.png",
          "src/webparts/helloworld/components/Helloworld.module.scss",
          "src/webparts/helloworld/components/Helloworld.tsx",
          "src/webparts/helloworld/components/IHelloworldProps.ts",
          "src/index.ts",
          ".gitignore",
          ".npmignore",
          ".yo-rc.json",
          "gulpfile.js",
          "package.json",
          "README.md",
          "tsconfig.json",
        ];
        for (const file of files) {
          const filePath = path.join(testFolder, appName, `src`, file);
          expect(fs.existsSync(filePath), `${filePath} must exist.`).to.eq(
            true
          );
        }
        expect(result.success).to.be.true;
      }
    }
  );

  afterEach(async () => {
    // clean up
    await cleanUpLocalProject(projectPath);
  });
});
