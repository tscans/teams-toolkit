// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface IValidationResult {
  /**
   * Possible values: Accepted, Rejected
   */
  status: string;
  errors: IAppValidationIssue[];
  warnings: IAppValidationIssue[];
  notes: IAppValidationNote[];
  addInDetails: IAppValidationDetails;
}

export interface IAppValidationIssue {
  id: string;
  content: string;
  filePath: string;
  helpUrl?: string;
  shortCodeNumber: number;
  title: string;
  validationCategory: string;
  line?: number;
  column?: number;
}

export interface IAppValidationNote {
  id: string;
  content: string;
  title: string;
}

export interface IAppValidationDetails {
  displayName: string;
  developerName: string;
  version: string;
  manifestVersion: string;
}
