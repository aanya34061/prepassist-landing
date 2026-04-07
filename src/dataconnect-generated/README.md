# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListAllMockTests*](#listallmocktests)
  - [*GetUserStudySessions*](#getuserstudysessions)
- [**Mutations**](#mutations)
  - [*CreateDiscussionPost*](#creatediscussionpost)
  - [*RecordTestAttempt*](#recordtestattempt)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListAllMockTests
You can execute the `ListAllMockTests` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listAllMockTests(options?: ExecuteQueryOptions): QueryPromise<ListAllMockTestsData, undefined>;

interface ListAllMockTestsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllMockTestsData, undefined>;
}
export const listAllMockTestsRef: ListAllMockTestsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listAllMockTests(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAllMockTestsData, undefined>;

interface ListAllMockTestsRef {
  ...
  (dc: DataConnect): QueryRef<ListAllMockTestsData, undefined>;
}
export const listAllMockTestsRef: ListAllMockTestsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listAllMockTestsRef:
```typescript
const name = listAllMockTestsRef.operationName;
console.log(name);
```

### Variables
The `ListAllMockTests` query has no variables.
### Return Type
Recall that executing the `ListAllMockTests` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListAllMockTestsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListAllMockTests`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listAllMockTests } from '@dataconnect/generated';


// Call the `listAllMockTests()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listAllMockTests();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listAllMockTests(dataConnect);

console.log(data.mockTests);

// Or, you can use the `Promise` API.
listAllMockTests().then((response) => {
  const data = response.data;
  console.log(data.mockTests);
});
```

### Using `ListAllMockTests`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listAllMockTestsRef } from '@dataconnect/generated';


// Call the `listAllMockTestsRef()` function to get a reference to the query.
const ref = listAllMockTestsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listAllMockTestsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.mockTests);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.mockTests);
});
```

## GetUserStudySessions
You can execute the `GetUserStudySessions` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getUserStudySessions(vars: GetUserStudySessionsVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserStudySessionsData, GetUserStudySessionsVariables>;

interface GetUserStudySessionsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserStudySessionsVariables): QueryRef<GetUserStudySessionsData, GetUserStudySessionsVariables>;
}
export const getUserStudySessionsRef: GetUserStudySessionsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUserStudySessions(dc: DataConnect, vars: GetUserStudySessionsVariables, options?: ExecuteQueryOptions): QueryPromise<GetUserStudySessionsData, GetUserStudySessionsVariables>;

interface GetUserStudySessionsRef {
  ...
  (dc: DataConnect, vars: GetUserStudySessionsVariables): QueryRef<GetUserStudySessionsData, GetUserStudySessionsVariables>;
}
export const getUserStudySessionsRef: GetUserStudySessionsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserStudySessionsRef:
```typescript
const name = getUserStudySessionsRef.operationName;
console.log(name);
```

### Variables
The `GetUserStudySessions` query requires an argument of type `GetUserStudySessionsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetUserStudySessionsVariables {
  userId: UUIDString;
}
```
### Return Type
Recall that executing the `GetUserStudySessions` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserStudySessionsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetUserStudySessions`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUserStudySessions, GetUserStudySessionsVariables } from '@dataconnect/generated';

// The `GetUserStudySessions` query requires an argument of type `GetUserStudySessionsVariables`:
const getUserStudySessionsVars: GetUserStudySessionsVariables = {
  userId: ..., 
};

// Call the `getUserStudySessions()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUserStudySessions(getUserStudySessionsVars);
// Variables can be defined inline as well.
const { data } = await getUserStudySessions({ userId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUserStudySessions(dataConnect, getUserStudySessionsVars);

console.log(data.studySessions);

// Or, you can use the `Promise` API.
getUserStudySessions(getUserStudySessionsVars).then((response) => {
  const data = response.data;
  console.log(data.studySessions);
});
```

### Using `GetUserStudySessions`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserStudySessionsRef, GetUserStudySessionsVariables } from '@dataconnect/generated';

// The `GetUserStudySessions` query requires an argument of type `GetUserStudySessionsVariables`:
const getUserStudySessionsVars: GetUserStudySessionsVariables = {
  userId: ..., 
};

// Call the `getUserStudySessionsRef()` function to get a reference to the query.
const ref = getUserStudySessionsRef(getUserStudySessionsVars);
// Variables can be defined inline as well.
const ref = getUserStudySessionsRef({ userId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserStudySessionsRef(dataConnect, getUserStudySessionsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.studySessions);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.studySessions);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateDiscussionPost
You can execute the `CreateDiscussionPost` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createDiscussionPost(vars: CreateDiscussionPostVariables): MutationPromise<CreateDiscussionPostData, CreateDiscussionPostVariables>;

interface CreateDiscussionPostRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateDiscussionPostVariables): MutationRef<CreateDiscussionPostData, CreateDiscussionPostVariables>;
}
export const createDiscussionPostRef: CreateDiscussionPostRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createDiscussionPost(dc: DataConnect, vars: CreateDiscussionPostVariables): MutationPromise<CreateDiscussionPostData, CreateDiscussionPostVariables>;

interface CreateDiscussionPostRef {
  ...
  (dc: DataConnect, vars: CreateDiscussionPostVariables): MutationRef<CreateDiscussionPostData, CreateDiscussionPostVariables>;
}
export const createDiscussionPostRef: CreateDiscussionPostRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createDiscussionPostRef:
```typescript
const name = createDiscussionPostRef.operationName;
console.log(name);
```

### Variables
The `CreateDiscussionPost` mutation requires an argument of type `CreateDiscussionPostVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateDiscussionPostVariables {
  title: string;
  content: string;
  subjectTag?: string | null;
}
```
### Return Type
Recall that executing the `CreateDiscussionPost` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateDiscussionPostData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateDiscussionPostData {
  discussionPost_insert: DiscussionPost_Key;
}
```
### Using `CreateDiscussionPost`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createDiscussionPost, CreateDiscussionPostVariables } from '@dataconnect/generated';

// The `CreateDiscussionPost` mutation requires an argument of type `CreateDiscussionPostVariables`:
const createDiscussionPostVars: CreateDiscussionPostVariables = {
  title: ..., 
  content: ..., 
  subjectTag: ..., // optional
};

// Call the `createDiscussionPost()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createDiscussionPost(createDiscussionPostVars);
// Variables can be defined inline as well.
const { data } = await createDiscussionPost({ title: ..., content: ..., subjectTag: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createDiscussionPost(dataConnect, createDiscussionPostVars);

console.log(data.discussionPost_insert);

// Or, you can use the `Promise` API.
createDiscussionPost(createDiscussionPostVars).then((response) => {
  const data = response.data;
  console.log(data.discussionPost_insert);
});
```

### Using `CreateDiscussionPost`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createDiscussionPostRef, CreateDiscussionPostVariables } from '@dataconnect/generated';

// The `CreateDiscussionPost` mutation requires an argument of type `CreateDiscussionPostVariables`:
const createDiscussionPostVars: CreateDiscussionPostVariables = {
  title: ..., 
  content: ..., 
  subjectTag: ..., // optional
};

// Call the `createDiscussionPostRef()` function to get a reference to the mutation.
const ref = createDiscussionPostRef(createDiscussionPostVars);
// Variables can be defined inline as well.
const ref = createDiscussionPostRef({ title: ..., content: ..., subjectTag: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createDiscussionPostRef(dataConnect, createDiscussionPostVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.discussionPost_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.discussionPost_insert);
});
```

## RecordTestAttempt
You can execute the `RecordTestAttempt` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
recordTestAttempt(vars: RecordTestAttemptVariables): MutationPromise<RecordTestAttemptData, RecordTestAttemptVariables>;

interface RecordTestAttemptRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: RecordTestAttemptVariables): MutationRef<RecordTestAttemptData, RecordTestAttemptVariables>;
}
export const recordTestAttemptRef: RecordTestAttemptRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
recordTestAttempt(dc: DataConnect, vars: RecordTestAttemptVariables): MutationPromise<RecordTestAttemptData, RecordTestAttemptVariables>;

interface RecordTestAttemptRef {
  ...
  (dc: DataConnect, vars: RecordTestAttemptVariables): MutationRef<RecordTestAttemptData, RecordTestAttemptVariables>;
}
export const recordTestAttemptRef: RecordTestAttemptRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the recordTestAttemptRef:
```typescript
const name = recordTestAttemptRef.operationName;
console.log(name);
```

### Variables
The `RecordTestAttempt` mutation requires an argument of type `RecordTestAttemptVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface RecordTestAttemptVariables {
  mockTestId: UUIDString;
  score: number;
  totalQuestions: number;
  timeTakenMinutes?: number | null;
  incorrectQuestions?: UUIDString[] | null;
}
```
### Return Type
Recall that executing the `RecordTestAttempt` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `RecordTestAttemptData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface RecordTestAttemptData {
  testAttempt_insert: TestAttempt_Key;
}
```
### Using `RecordTestAttempt`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, recordTestAttempt, RecordTestAttemptVariables } from '@dataconnect/generated';

// The `RecordTestAttempt` mutation requires an argument of type `RecordTestAttemptVariables`:
const recordTestAttemptVars: RecordTestAttemptVariables = {
  mockTestId: ..., 
  score: ..., 
  totalQuestions: ..., 
  timeTakenMinutes: ..., // optional
  incorrectQuestions: ..., // optional
};

// Call the `recordTestAttempt()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await recordTestAttempt(recordTestAttemptVars);
// Variables can be defined inline as well.
const { data } = await recordTestAttempt({ mockTestId: ..., score: ..., totalQuestions: ..., timeTakenMinutes: ..., incorrectQuestions: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await recordTestAttempt(dataConnect, recordTestAttemptVars);

console.log(data.testAttempt_insert);

// Or, you can use the `Promise` API.
recordTestAttempt(recordTestAttemptVars).then((response) => {
  const data = response.data;
  console.log(data.testAttempt_insert);
});
```

### Using `RecordTestAttempt`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, recordTestAttemptRef, RecordTestAttemptVariables } from '@dataconnect/generated';

// The `RecordTestAttempt` mutation requires an argument of type `RecordTestAttemptVariables`:
const recordTestAttemptVars: RecordTestAttemptVariables = {
  mockTestId: ..., 
  score: ..., 
  totalQuestions: ..., 
  timeTakenMinutes: ..., // optional
  incorrectQuestions: ..., // optional
};

// Call the `recordTestAttemptRef()` function to get a reference to the mutation.
const ref = recordTestAttemptRef(recordTestAttemptVars);
// Variables can be defined inline as well.
const ref = recordTestAttemptRef({ mockTestId: ..., score: ..., totalQuestions: ..., timeTakenMinutes: ..., incorrectQuestions: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = recordTestAttemptRef(dataConnect, recordTestAttemptVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.testAttempt_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.testAttempt_insert);
});
```

