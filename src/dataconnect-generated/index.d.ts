import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface CreateDiscussionPostData {
  discussionPost_insert: DiscussionPost_Key;
}

export interface CreateDiscussionPostVariables {
  title: string;
  content: string;
  subjectTag?: string | null;
}

export interface DiscussionPost_Key {
  id: UUIDString;
  __typename?: 'DiscussionPost_Key';
}

export interface GetUserStudySessionsData {
  studySessions: ({
    id: UUIDString;
    sessionDate: DateString;
    durationMinutes: number;
    subject: string;
    topicCovered: string;
    notes?: string | null;
    user?: {
      displayName: string;
    };
  } & StudySession_Key)[];
}

export interface GetUserStudySessionsVariables {
  userId: UUIDString;
}

export interface ListAllMockTestsData {
  mockTests: ({
    id: UUIDString;
    title: string;
    subject: string;
    difficultyLevel: string;
    numQuestions: number;
    durationMinutes?: number | null;
    createdAt: TimestampString;
  } & MockTest_Key)[];
}

export interface MockTest_Key {
  id: UUIDString;
  __typename?: 'MockTest_Key';
}

export interface RecordTestAttemptData {
  testAttempt_insert: TestAttempt_Key;
}

export interface RecordTestAttemptVariables {
  mockTestId: UUIDString;
  score: number;
  totalQuestions: number;
  timeTakenMinutes?: number | null;
  incorrectQuestions?: UUIDString[] | null;
}

export interface StudyMaterial_Key {
  id: UUIDString;
  __typename?: 'StudyMaterial_Key';
}

export interface StudySession_Key {
  id: UUIDString;
  __typename?: 'StudySession_Key';
}

export interface TestAttempt_Key {
  id: UUIDString;
  __typename?: 'TestAttempt_Key';
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface ListAllMockTestsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllMockTestsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListAllMockTestsData, undefined>;
  operationName: string;
}
export const listAllMockTestsRef: ListAllMockTestsRef;

export function listAllMockTests(options?: ExecuteQueryOptions): QueryPromise<ListAllMockTestsData, undefined>;
export function listAllMockTests(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAllMockTestsData, undefined>;

interface GetUserStudySessionsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserStudySessionsVariables): QueryRef<GetUserStudySessionsData, GetUserStudySessionsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetUserStudySessionsVariables): QueryRef<GetUserStudySessionsData, GetUserStudySessionsVariables>;
  operationName: string;
}
export const getUserStudySessionsRef: GetUserStudySessionsRef;

export function getUserStudySessions(vars: GetUserStudySessionsVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserStudySessionsData, GetUserStudySessionsVariables>;
export function getUserStudySessions(dc: DataConnect, vars: GetUserStudySessionsVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserStudySessionsData, GetUserStudySessionsVariables>;

interface CreateDiscussionPostRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateDiscussionPostVariables): MutationRef<CreateDiscussionPostData, CreateDiscussionPostVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateDiscussionPostVariables): MutationRef<CreateDiscussionPostData, CreateDiscussionPostVariables>;
  operationName: string;
}
export const createDiscussionPostRef: CreateDiscussionPostRef;

export function createDiscussionPost(vars: CreateDiscussionPostVariables): MutationPromise<CreateDiscussionPostData, CreateDiscussionPostVariables>;
export function createDiscussionPost(dc: DataConnect, vars: CreateDiscussionPostVariables): MutationPromise<CreateDiscussionPostData, CreateDiscussionPostVariables>;

interface RecordTestAttemptRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: RecordTestAttemptVariables): MutationRef<RecordTestAttemptData, RecordTestAttemptVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: RecordTestAttemptVariables): MutationRef<RecordTestAttemptData, RecordTestAttemptVariables>;
  operationName: string;
}
export const recordTestAttemptRef: RecordTestAttemptRef;

export function recordTestAttempt(vars: RecordTestAttemptVariables): MutationPromise<RecordTestAttemptData, RecordTestAttemptVariables>;
export function recordTestAttempt(dc: DataConnect, vars: RecordTestAttemptVariables): MutationPromise<RecordTestAttemptData, RecordTestAttemptVariables>;

