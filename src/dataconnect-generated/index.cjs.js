const { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'prepassist-web-v2',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;

const listAllMockTestsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAllMockTests');
}
listAllMockTestsRef.operationName = 'ListAllMockTests';
exports.listAllMockTestsRef = listAllMockTestsRef;

exports.listAllMockTests = function listAllMockTests(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listAllMockTestsRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const getUserStudySessionsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetUserStudySessions', inputVars);
}
getUserStudySessionsRef.operationName = 'GetUserStudySessions';
exports.getUserStudySessionsRef = getUserStudySessionsRef;

exports.getUserStudySessions = function getUserStudySessions(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(getUserStudySessionsRef(dcInstance, inputVars), inputOpts && inputOpts.fetchPolicy);
}
;

const createDiscussionPostRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateDiscussionPost', inputVars);
}
createDiscussionPostRef.operationName = 'CreateDiscussionPost';
exports.createDiscussionPostRef = createDiscussionPostRef;

exports.createDiscussionPost = function createDiscussionPost(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(createDiscussionPostRef(dcInstance, inputVars));
}
;

const recordTestAttemptRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'RecordTestAttempt', inputVars);
}
recordTestAttemptRef.operationName = 'RecordTestAttempt';
exports.recordTestAttemptRef = recordTestAttemptRef;

exports.recordTestAttempt = function recordTestAttempt(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(recordTestAttemptRef(dcInstance, inputVars));
}
;
