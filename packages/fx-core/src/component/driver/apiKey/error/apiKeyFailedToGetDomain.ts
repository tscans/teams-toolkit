// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { UserError } from "@microsoft/teamsfx-api";
import { getDefaultString, getLocalizedString } from "../../../../common/localizeUtils";

const errorCode = "ApiKeyFailedToGetDomain";
const messageKey = "driver.apiKey.error.failedToGetDomain";

export class ApiKeyFailedToGetDomainError extends UserError {
  constructor(actionName: string) {
    super({
      source: actionName,
      name: errorCode,
      message: getDefaultString(messageKey),
      displayMessage: getLocalizedString(messageKey),
    });
  }
}
