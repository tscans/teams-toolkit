// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Kuojian Lu <kuojianlu@microsoft.com>
 */
import * as path from "path";
import { startDebugging, waitForTerminal } from "../../utils/vscodeOperation";
import {
  initPage,
  validateReactOutlookTab,
  validateReactTab,
} from "../../utils/playwrightOperation";
import { LocalDebugTestContext } from "./localdebugContext";
import {
  Timeout,
  LocalDebugTaskLabel,
  LocalDebugError,
  LocalDebugTaskResult,
} from "../../utils/constants";
import { Env } from "../../utils/env";
import { it } from "../../utils/it";
import { validateFileExist } from "../../utils/commonUtils";
import { expect } from "chai";
import { getPlaywrightScreenshotPath } from "../../utils/nameUtil";

describe("Local Debug M365 Tests", function () {
  this.timeout(Timeout.testCase);
  let localDebugTestContext: LocalDebugTestContext;

  beforeEach(async function () {
    process.env.TEAMSFX_M365_APP = "true";
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    localDebugTestContext = new LocalDebugTestContext("m365lp", {
      lang: "typescript",
    });
    await localDebugTestContext.before();
  });

  afterEach(async function () {
    process.env.TEAMSFX_M365_APP = "false";
    this.timeout(Timeout.finishTestCase);
    await localDebugTestContext.after();
  });

  it(
    "[auto] [Typescript] Local debug for SSO enabled personal tab project",
    {
      testPlanCaseId: 15277099,
      author: "kuojianlu@microsoft.com",
    },
    async () => {
      const projectPath = path.resolve(
        localDebugTestContext.testRootFolder,
        localDebugTestContext.appName
      );
      validateFileExist(projectPath, "src/index.tsx");

      await startDebugging("Debug in Teams (Chrome)");

      try {
        await waitForTerminal(
          LocalDebugTaskLabel.StartBackend,
          LocalDebugTaskResult.FunctionStarted
        );

        await waitForTerminal(
          LocalDebugTaskLabel.StartFrontend,
          LocalDebugTaskResult.FrontendNoIssue
        );
      } catch (error) {
        const errorMsg = error.toString();
        if (
          // skip can't find element
          errorMsg.includes(LocalDebugError.ElementNotInteractableError) ||
          // skip timeout
          errorMsg.includes(LocalDebugError.TimeoutError)
        ) {
          console.log("[skip error] ", error);
        } else {
          expect.fail(errorMsg);
        }
      }

      const teamsAppId = await localDebugTestContext.getTeamsAppId();
      const page = await initPage(
        localDebugTestContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      await localDebugTestContext.validateLocalStateForTab();
      await validateReactTab(page, Env.displayName, true);
      const m365AppId = await localDebugTestContext.getM365AppId();
      await page.goto(
        `https://outlook.office.com/host/${m365AppId}/index?login_hint=${Env.username}`
      );
      try {
        const addBtn = await page?.waitForSelector(
          "button>span:has-text('Add')"
        );
        await addBtn?.click();
      } catch {
        console.log("no add button has span in outlook");
        try {
          const addBtn = await page?.waitForSelector("button:has-text('Add')");
          await addBtn?.click();
        } catch {
          console.log("no add button has text in outlook");
        }
      }
      await page.screenshot({
        path: getPlaywrightScreenshotPath("mail1"),
        fullPage: true,
      });
      await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
      await page.screenshot({
        path: getPlaywrightScreenshotPath("mail2"),
        fullPage: true,
      });
      await validateReactOutlookTab(page, Env.displayName, true);
    }
  );
});
