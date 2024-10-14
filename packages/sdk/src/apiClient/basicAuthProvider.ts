// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AxiosRequestConfig } from "axios";
import { AuthProvider } from "./authProvider";
import { ErrorWithCode, ErrorCode, ErrorMessage } from "../core/errors";
import { formatString } from "../util/utils";

/**
 * Provider that handles Basic authentication
 */
export class BasicAuthProvider implements AuthProvider {
  private userName: string;
  private password: string;

  /**
   *
   * @param { string } userName - Username used in basic auth
   * @param { string } password - Password used in basic auth
   *
   * @throws {@link ErrorCode|InvalidParameter} - when username or password is empty.
   * @throws {@link ErrorCode|RuntimeNotSupported} when runtime is browser.
   */
  constructor(userName: string, password: string) {
    if (!userName) {
      throw new ErrorWithCode(
        formatString(ErrorMessage.EmptyParameter, "username"),
        ErrorCode.InvalidParameter
      );
    }
    if (!password) {
      throw new ErrorWithCode(
        formatString(ErrorMessage.EmptyParameter, "password"),
        ErrorCode.InvalidParameter
      );
    }
    this.userName = userName;
    this.password = password;
  }

  /**
   * Adds authentication info to http requests
   *
   * @param { AxiosRequestConfig } config - Contains all the request information and can be updated to include extra authentication info.
   * Refer https://axios-http.com/docs/req_config for detailed document.
   *
   * @returns Updated axios request config.
   *
   * @throws {@link ErrorCode|AuthorizationInfoAlreadyExists} - when Authorization header or auth property already exists in request configuration.
   * @throws {@link ErrorCode|RuntimeNotSupported} when runtime is browser.
   */
  public AddAuthenticationInfo(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    if (config.headers && config.headers["Authorization"]) {
      return Promise.reject(
        new ErrorWithCode(
          ErrorMessage.AuthorizationHeaderAlreadyExists,
          ErrorCode.AuthorizationInfoAlreadyExists
        )
      );
    }
    if (config.auth) {
      return Promise.reject(
        new ErrorWithCode(
          ErrorMessage.BasicCredentialAlreadyExists,
          ErrorCode.AuthorizationInfoAlreadyExists
        )
      );
    }

    config.auth = {
      username: this.userName,
      password: this.password,
    };

    return Promise.resolve(config);
  }
}
