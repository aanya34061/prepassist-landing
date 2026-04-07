import { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'example',
  service: 'prepassist-web-v2',
  location: 'us-east4'
};
export const listAllMockTestsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAllMockTests');
}
listAllMockTestsRef.operationName = 'ListAllMockTests';

export function listAllMockTests(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listAllMockTestsRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}

export const getUserStudySessionsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetUserStudySessions', inputVars);
}
getUserStudySessionsRef.operationName = 'GetUserStudySessions';

export function getUserStudySessions(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getUserStudySessionsRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}

export const createDiscussionPostRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateDiscussionPost', inputVars);
}
createDiscussionPostRef.operationName = 'CreateDiscussionPost';

export function createDiscussionPost(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createDiscussionPostRef(dcInstance, inputVars));
}

export const recordTestAttemptRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'RecordTestAttempt', inputVars);
}
recordTestAttemptRef.operationName = 'RecordTestAttempt';

export function recordTestAttempt(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(recordTestAttemptRef(dcInstance, inputVars));
}

