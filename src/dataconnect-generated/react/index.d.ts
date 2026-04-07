import { ListAllMockTestsData, GetUserStudySessionsData, GetUserStudySessionsVariables, CreateDiscussionPostData, CreateDiscussionPostVariables, RecordTestAttemptData, RecordTestAttemptVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useListAllMockTests(options?: useDataConnectQueryOptions<ListAllMockTestsData>): UseDataConnectQueryResult<ListAllMockTestsData, undefined>;
export function useListAllMockTests(dc: DataConnect, options?: useDataConnectQueryOptions<ListAllMockTestsData>): UseDataConnectQueryResult<ListAllMockTestsData, undefined>;

export function useGetUserStudySessions(vars: GetUserStudySessionsVariables, options?: useDataConnectQueryOptions<GetUserStudySessionsData>): UseDataConnectQueryResult<GetUserStudySessionsData, GetUserStudySessionsVariables>;
export function useGetUserStudySessions(dc: DataConnect, vars: GetUserStudySessionsVariables, options?: useDataConnectQueryOptions<GetUserStudySessionsData>): UseDataConnectQueryResult<GetUserStudySessionsData, GetUserStudySessionsVariables>;

export function useCreateDiscussionPost(options?: useDataConnectMutationOptions<CreateDiscussionPostData, FirebaseError, CreateDiscussionPostVariables>): UseDataConnectMutationResult<CreateDiscussionPostData, CreateDiscussionPostVariables>;
export function useCreateDiscussionPost(dc: DataConnect, options?: useDataConnectMutationOptions<CreateDiscussionPostData, FirebaseError, CreateDiscussionPostVariables>): UseDataConnectMutationResult<CreateDiscussionPostData, CreateDiscussionPostVariables>;

export function useRecordTestAttempt(options?: useDataConnectMutationOptions<RecordTestAttemptData, FirebaseError, RecordTestAttemptVariables>): UseDataConnectMutationResult<RecordTestAttemptData, RecordTestAttemptVariables>;
export function useRecordTestAttempt(dc: DataConnect, options?: useDataConnectMutationOptions<RecordTestAttemptData, FirebaseError, RecordTestAttemptVariables>): UseDataConnectMutationResult<RecordTestAttemptData, RecordTestAttemptVariables>;
