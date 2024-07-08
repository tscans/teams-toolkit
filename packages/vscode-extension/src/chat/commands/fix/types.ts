// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface ErrorContext {
  errorCode: string;
  message: string;
  stack: string;
  helpLink: string;
}

export interface ChatTurn {
  user: string;
  assistant: string;
}

export type ChatHistory = ChatTurn[];
