// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import fs from "fs-extra";
import sinon from "sinon";

import * as apis from "@microsoft/teamsfx-api";
import * as core from "@microsoft/teamsfx-core";

import activate from "../../src/activate";
import AzureAccountManager from "../../src/commonlib/azureLogin";
import {
  editDistance,
  getColorizedString,
  getSystemInputs,
  getTemplates,
  getVersion,
  toLocaleLowerCase,
} from "../../src/utils";
import { expect } from "./utils";

describe("Utils Tests", function () {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("toLocaleLowerCase", () => {
    expect(toLocaleLowerCase("MiNe")).equals("mine");
    expect(toLocaleLowerCase(["ItS", "HiS"])).deep.equals(["its", "his"]);
    expect(toLocaleLowerCase(undefined)).equals(undefined);
  });

  it("getSystemInputs", async () => {
    const inputs = getSystemInputs("real");
    expect(inputs.platform).equals(apis.Platform.CLI);
    expect(inputs.projectPath).equals("real");
  });

  it("getColorizedString", async () => {
    /// TODO: mock chalk and test
    const arr = Object.keys(apis.Colors)
      .filter((v) => isNaN(Number(v)))
      .map((v, i) => i);
    getColorizedString(
      arr.map((v) => {
        return { content: String(v), color: v };
      })
    );
  });

  it("getVersion", async () => {
    getVersion();
  });

  describe("toLocaleLowerCase", () => {
    it("should work for input of type string and array of string", () => {
      expect(toLocaleLowerCase("AB")).equals("ab");
      expect(toLocaleLowerCase(["Ab", "BB"])).deep.equals(["ab", "bb"]);
    });
  });

  describe("getTemplates", async () => {
    const sandbox = sinon.createSandbox();

    before(() => {
      sandbox.stub(fs, "readJsonSync").returns({ version: "2.0.0" });
    });

    this.afterEach(() => {
      sandbox.restore();
    });

    it("filters samples have maximum cli verion", async () => {
      sandbox.stub(core.sampleProvider, "SampleCollection").value(
        Promise.resolve({
          filterOptions: {
            capabilities: ["Tab"],
            languages: ["TS"],
            technologies: ["Azure"],
          },
          samples: [
            {
              id: "test1",
              onboardDate: "2021-05-06",
              title: "test1",
              shortDescription: "test1",
              fullDescription: "test1",
              types: ["Tab"],
              tags: [],
              time: "1hr to run",
              configuration: "",
              thumbnailPath: "",
              suggested: false,
              downloadUrlInfo: {
                owner: "",
                repository: "",
                ref: "",
                dir: "",
              },
            },
            {
              id: "test1",
              onboardDate: "2021-05-06",
              title: "test1",
              shortDescription: "test1",
              fullDescription: "test1",
              types: ["Tab"],
              tags: [],
              time: "1hr to run",
              configuration: "",
              thumbnailPath: "",
              suggested: false,
              maximumCliVersion: "1.0.0",
              downloadUrlInfo: {
                owner: "",
                repository: "",
                ref: "",
                dir: "",
              },
            },
          ],
        })
      );
      const templates = await getTemplates();
      expect(templates.length).equals(1);
    });

    it("filters samples have minimum cli verion", async () => {
      sandbox.stub(core.sampleProvider, "SampleCollection").value(
        Promise.resolve({
          filterOptions: {
            capabilities: ["Tab"],
            languages: ["TS"],
            technologies: ["Azure"],
          },
          samples: [
            {
              id: "test1",
              onboardDate: "2021-05-06",
              title: "test1",
              shortDescription: "test1",
              fullDescription: "test1",
              types: ["Tab"],
              tags: [],
              time: "1hr to run",
              configuration: "",
              thumbnailPath: "",
              suggested: false,
              downloadUrlInfo: {
                owner: "",
                repository: "",
                ref: "",
                dir: "",
              },
            },
            {
              id: "test1",
              onboardDate: "2021-05-06",
              title: "test1",
              shortDescription: "test1",
              fullDescription: "test1",
              types: ["Tab"],
              tags: [],
              time: "1hr to run",
              configuration: "",
              thumbnailPath: "",
              suggested: false,
              minimumCliVersion: "3.1.0",
              downloadUrlInfo: {
                owner: "",
                repository: "",
                ref: "",
                dir: "",
              },
            },
          ],
        })
      );
      const templates = await getTemplates();
      expect(templates.length).equals(1);
    });
  });
});

describe("activate", async () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  it("UnhandledError", async () => {
    sandbox.stub(AzureAccountManager, "setRootPath").throws(new Error("error"));
    const res = await activate(".", false);
    expect(res.isErr()).equals(true);
    if (res.isErr()) {
      expect(res.error instanceof core.UnhandledError).equals(true);
    }
  });
});

describe("editDistance", async () => {
  it("happy", async () => {
    {
      const d = editDistance("a", "b");
      expect(d).equals(1);
    }
    {
      const d = editDistance("abc", "abd");
      expect(d).equals(1);
    }
    {
      const d = editDistance("abc", "aabbc");
      expect(d).equals(2);
    }
    {
      const d = editDistance("", "abc");
      expect(d).equals(3);
    }
    {
      const d = editDistance("abc", "");
      expect(d).equals(3);
    }
  });
});
