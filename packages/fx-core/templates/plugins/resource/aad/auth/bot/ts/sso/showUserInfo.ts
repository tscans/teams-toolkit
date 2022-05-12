// This file implements a function to call Graph API with TeamsFx SDK to get user profile with SSO token.
// You can modify this file to add your business with SSO token.
// See auth/bot/README.md to learn more about adding new command to your bot.

import { createMicrosoftGraphClient, TeamsFx } from "@microsoft/teamsfx";
import { TurnContext } from "botbuilder";
import { DialogTurnResult } from "botbuilder-dialogs";

// If you need extra parameters, you can add param in `addCommand`
export async function showUserInfo(
  context: TurnContext,
  ssoToken: string,
  param: any[]
): Promise<DialogTurnResult> {
  await context.sendActivity("Retrieving user information from Microsoft Graph ...");

  // Init TeamsFx instance with SSO token
  const teamsfx = new TeamsFx().setSsoToken(ssoToken);

  // Add scope for your Azure AD app. For example: Mail.Read, etc.
  const graphClient = createMicrosoftGraphClient(teamsfx, ["User.Read"]);

  // Call graph api use `graph` instance to get user profile information
  const me = await graphClient.api("/me").get();
  if (me) {
    // Bot will send the user profile info to user
    await context.sendActivity(
      `You're logged in as ${me.displayName} (${me.userPrincipalName})${
        me.jobTitle ? `; your job title is: ${me.jobTitle}` : ""
      }.`
    );
  } else {
    await context.sendActivity("Could not retrieve profile information from Microsoft Graph.");
  }

  return;
}
