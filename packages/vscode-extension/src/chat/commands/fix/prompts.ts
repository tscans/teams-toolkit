// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export const ParseErrorContextPrompt = `
<Instruction>
1. From the given conversation history and the user input below, extract the error context information.
2. You answer should be in json format string, for example, '{"errorCode": "XXXX.XXXX", "message": "error message", "stack": "error stack", "helpLink": "https://docs.microsoft.com/teams"}'. Don't ouput any other characters other than json object quoted by '{}'.
3. If the error context information cannot be extracted, output an empty json object: '{}'.
4. The errorCode is a string that follows the pattern of "XXXX.XXXX", for example, "armDeploy.DeploymentError", "script.ScriptExecutionError", "teamsApp.MissingEnvironmentVariablesError" etc. The errorCode is usually quoted by square brackets "[]".
5. The message is the error message that describes the error in detail.
6. The stack is the source code stack trace when the error happens.
7. The helpLink is the hyperlink to the documentation that may provide the solution to the error.
</Instruction>

chat history:
{{ chat_history }}

Follow up Input: {{ chat_input }}
Error Context:
`;

export const RephraseQueryPrompt = `
system: 
* Given the following conversation history and the users next question,rephrase the question to be a stand alone question.
If the conversation is irrelevant or empty, just restate the original question.
Do not add more details than necessary to the question.

chat history: 
{{ chat_history }} 

Follow up Input: {{ chat_input }} 
Standalone Question: 
`;

export const GetSearchPatternsPrompt = `
<Instruction>
1. From the given Error Context, Output Panel Log and the user input below, analyze the error context, output log and user input carefully to understand the real problem.
2. If the ErrorCode is existing in the given error context and output log, output the ErrorCode. The ErrorCode is a string that follows the pattern of "XXXX.XXXX", for example, "armDeploy.DeploymentError", "script.ScriptExecutionError", "teamsApp.MissingEnvironmentVariablesError" etc. The ErrorCode is usually quoted by square brackets "[]" in the error context and output log.
3. The Output Panel Log may contain irrelevant information. You need to filter out the irrelevant information and focus on the key information that helps to identify the problem.
4. To find out the real solution to the problem, you need to extract some key search patterns from the error context and output log. The search patterns are usually the keywords or phrases that are related to the problem and can be used for web search.
5. Always include the ErrorCode in the search patterns if it exists in the error context and output log.
6. Your answer should be in json format string, for example, '{"errorCode": "XXXX.XXXX", "searchPatterns": ["search pattern 1", "search pattern 2", "search pattern 3"]}'. Don't ouput any other characters other than json object quoted by '{}'. 
7. If no information can be extracted, output this json object: '{"errorCode": "", "searchPatterns": []}'.
</Instruction>

<Error Context>
  {{errorContext}}
</Error Context>

<Output Panel Log>
  {{outputLog}}
</Output Panel Log>

<User input>
  {{userInput}}
</User input>

Your answer:
`;

export const TroubleShootingSystemPrompt = `
You are a specialist in troubleshooting Teams App development with the Teams Toolkit. The user seeks assistance in resolving errors or issues encountered while using the Teams Toolkit to develop a Teams App. Your role is to offer advice on how to solve these problems.

<Instruction>
1. Read the rephrased user query carefully to understand the user's problem.
2. The output panel log is the primary scence of what happened, refer to it as the original error information. If it contains the suggestions of how to fix the error, give the suggestions higher weight in your answer.
3. The search results are the web search results based on the search patterns extracted from the error context and output panel log. You can refer to the search results to find the solutions to the problem if it's not empty.
4. Provide a detailed answer to the user's problem based on the error context, output panel log, search results and the rephrased user query.
5. Always include the ErrorCode in the answer if it exists in the error context and output panel log.
6. Always incorporate links from the output panel log and search results into your answer if they are relevant to the problem.
</Instruction>

<Error Context>
{{errorContext}}
</Error Context>

<Search Results>
{{searchResults}}
</Search Results>

<Output Panel Log>
{{outputLog}}
</Output Panel Log>

<Rephrased User Query>
{{rephrasedQuery}}
</Rephrased User Query>

Your answer:
`;

export const RerankSearchResultsPrompt = `
<Instruction>
1. The search result is some content retrieved from web search. The error context has the error information.
2. The question is the user's question that you need to answer, if the question is empty assume that question is "hwo to fix the error".
3. You need to judge the relevance of the search result to the error context and user's question. If the search result is relevant, you should give it a high score. If the search result is irrelevant, you should give it a low score.
4. Score 0 means the search result is completely irrelevant. Score 1 means the search result is somewhat relevant. Score 2 means the search result is highly relevant.
5. You should only output the score number, doesn't include any other text, for example, "0", "1", "2".
</Instruction>

<Search Result>
{{searchResult}}
</Search Result>

<Error Context>
{{errorContext}}
</Error Context>

<Question>
{{question}}
</Question>

Score:
`;
