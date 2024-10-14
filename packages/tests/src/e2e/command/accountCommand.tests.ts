// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Zhiyu You <zhiyou@microsoft.com>
 */

import { it } from "@microsoft/extra-shot-mocha";
import { expect } from "chai";
import { execAsync, getSubscriptionId, getTestFolder } from "../commonUtils";

describe("account command", function () {
  let stdlog: { stdout: string; stderr: string };
  const subscription = getSubscriptionId();
  const testFolder = getTestFolder();

  it(
    `auth list`,
    { testPlanCaseId: 15232246, author: "zhiyou@microsoft.com" },
    async function () {
      stdlog = await execAsync(`teamsapp auth list`, {
        env: process.env,
        timeout: 0,
      });

      expect(stdlog.stderr).to.be.empty;
    }
  );

  it(
    `auth logout`,
    { testPlanCaseId: 15232255, author: "zhiyou@microsoft.com" },
    async function () {
      stdlog = await execAsync(`teamsapp auth logout azure`, {
        env: process.env,
        timeout: 0,
      });

      expect(stdlog.stdout).include("Successfully signed out of Azure.");
      expect(stdlog.stderr).to.be.empty;
    }
  );
});
