// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import dotenv from "dotenv";

import * as msal from "@azure/msal-node";
import {
  M365TokenProvider,
  LogLevel,
  TokenRequest,
  Result,
  FxError,
  ok,
  err,
  LoginStatus,
  UserError,
  BasicLogin,
} from "@microsoft/teamsfx-api";

import * as cfg from "./common/userPasswordConfig";
import CLILogProvider from "./log";
import { ConvertTokenToJson, ErrorMessage } from "./codeFlowLogin";
import { signedIn, signedOut } from "./common/constant";
import { AppStudioScopes, AuthSvcScopes, setRegion } from "@microsoft/teamsfx-core";

dotenv.config();

const refreshToken = cfg.M365_REFRESH_TOKEN;

const msalConfig = {
  auth: {
    clientId: cfg.client_id,
    authority: `https://login.microsoftonline.com/${cfg.M365_TENANT_ID || "organizations"}`,
  },
};

export class M365ProviderRefreshToken extends BasicLogin implements M365TokenProvider {
  private static instance: M365ProviderRefreshToken;

  private static accessToken: string | undefined;

  public static getInstance(): M365ProviderRefreshToken {
    if (!M365ProviderRefreshToken.instance) {
      M365ProviderRefreshToken.instance = new M365ProviderRefreshToken();
    }
    return M365ProviderRefreshToken.instance;
  }

  /**
   * Get team access token
   */
  async getAccessToken(tokenRequest: TokenRequest): Promise<Result<string, FxError>> {
    const pca = new msal.PublicClientApplication(msalConfig);

    const refreshTokenRequest = {
      scopes: tokenRequest.scopes,
      refreshToken: refreshToken!,
    };
    await pca
      .acquireTokenByRefreshToken(refreshTokenRequest)
      .then((response) => {
        M365ProviderRefreshToken.accessToken = response!.accessToken;
      })
      .catch((e: any) => {
        CLILogProvider.necessaryLog(LogLevel.Error, JSON.stringify(e, undefined, 4));
      });

    if (M365ProviderRefreshToken.accessToken) {
      const m365Token = M365ProviderRefreshToken.accessToken;

      // Set region for App Studio API
      if (tokenRequest.scopes === AppStudioScopes) {
        const authSvcRequest = {
          scopes: AuthSvcScopes,
          refreshToken: refreshToken!,
        };
        let authSvcToken;
        await pca
          .acquireTokenByRefreshToken(authSvcRequest)
          .then((response) => {
            authSvcToken = response!.accessToken;
          })
          .catch((e: any) => {
            CLILogProvider.necessaryLog(LogLevel.Error, JSON.stringify(e, undefined, 4));
          });
        if (authSvcToken) {
          await setRegion(authSvcToken);
        }
      }

      return ok(m365Token);
    } else {
      return err(
        new UserError({
          name: ErrorMessage.loginUsernamePasswordFailTitle,
          message: ErrorMessage.loginUsernamePasswordFailDetail,
          source: ErrorMessage.loginComponent,
        })
      );
    }
  }

  async getJsonObject(
    tokenRequest: TokenRequest
  ): Promise<Result<Record<string, unknown>, FxError>> {
    const tokenRes = await this.getAccessToken(tokenRequest);

    if (tokenRes.isOk()) {
      const tokenJson = ConvertTokenToJson(tokenRes.value);
      return ok(tokenJson);
    } else {
      return err(tokenRes.error);
    }
  }

  public async getStatus(tokenRequest: TokenRequest): Promise<Result<LoginStatus, FxError>> {
    const tokenRes = await this.getAccessToken(tokenRequest);
    if (tokenRes.isOk()) {
      const tokenJson = ConvertTokenToJson(tokenRes.value);
      return ok({ status: signedIn, token: tokenRes.value, accountInfo: tokenJson });
    } else {
      return ok({ status: signedOut, token: undefined, accountInfo: undefined });
    }
  }

  removeStatusChangeMap(name: string): Promise<Result<boolean, FxError>> {
    throw new Error("Method not implemented.");
  }

  signout(): boolean {
    throw new Error("Method not implemented.");
  }
}

export default M365ProviderRefreshToken.getInstance();
