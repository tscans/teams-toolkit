// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export interface StackOverflowPost {
  question: Question;
  answers: Answer[];
  question_vector: number[];
  question_text: string;
}

export interface Question {
  tags: string[];
  owner: User;
  is_answered: boolean;
  view_count: number;
  accepted_answer_id: number;
  answer_count: number;
  score: number;
  last_activity_date: number;
  creation_date: number;
  last_edit_date: number;
  question_id: number;
  content_license: string;
  link: string;
  title: string;
  body: string;
}

export interface Answer {
  owner: User;
  is_accepted: boolean;
  score: number;
  last_activity_date: number;
  creation_date: number;
  answer_id: number;
  question_id: number;
  content_license: string;
  body: string;
  comments: Comment[];
}

export interface User {
  account_id: number;
  reputation: number;
  user_id: number;
  user_type: string;
  profile_image: string;
  display_name: string;
  link: string;
}

export interface Comment {
  owner: User;
  edited: boolean;
  score: number;
  creation_date: number;
  post_id: number;
  comment_id: number;
  content_license: string;
  body: string;
}

/*
 * Unified interface for github issue retrieving
 */
export interface StackOverFlowRetriever {
  retrieve(query: string): Promise<StackOverflowPost[]>;
  batchRetrieve(queries: string[], limit?: number): Promise<StackOverflowPost[]>;
}
