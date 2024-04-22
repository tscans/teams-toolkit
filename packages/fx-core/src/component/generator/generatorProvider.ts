// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { OfficeAddinGeneratorNew } from "./officeAddin/generator";
import { SPFxGeneratorNew } from "./spfx/spfxGenerator";
import { DefaultTemplateGenerator } from "./templates/templateGenerator";

export const Generators = [
  new DefaultTemplateGenerator(),
  new OfficeAddinGeneratorNew(),
  new SPFxGeneratorNew(),
];
