import {
  Flow,
  FlowSchema,
  Message,
  Question,
  Reply,
  Trigger,
  twilly,
} from '.'; // tests should fail if not all objects in build are exported
import FlowController, { defaultTestForExit } from './Flows/Controller';
import TwilioController from './twllio/Controller';
import { uniqueString, randomFlow, getSha256Hash } from './util';
import {
  SmsCookie,
  updateContext,
} from './SmsCookie';
import {
  TwilioWebhookRequest,
  getMockTwilioWebhookRequest,
} from './twllio';
import {
  QuestionSetIsAnswered,
  QuestionSetIsFailed,
} from './Actions';


jest.mock('cookie-parser');

jest.mock('./Flows/Controller');
jest.mock('./twllio/Controller');
jest.mock('./SmsCookie');


const getHandler = router => router.stack[1].route.stack[0].handle;


const fcMock = {
  getCurrentFlow: jest.fn(),
  onInteractionEnd: null,
  resolveActionFromState: jest.fn(),
  resolveNextStateFromAction: jest.fn(),
};
const tcMock = {
  clearSmsCookie: jest.fn(),
  getSmsCookeFromRequest: jest.fn(),
  handleAction: jest.fn(),
  sendMessageNotification: jest.fn(),
  sendEmptyResponse: jest.fn(),
  setSmsCookie: jest.fn(),
};

const fcConstructorMock = jest.fn();
const tcConstructorMock = jest.fn();

const cookieParserMiddleware = jest.fn();

let cookieParserMock: jest.Mock;
let cookieMock: SmsCookie;
let actionMock: any;
let reqMock: TwilioWebhookRequest;
let resMock: any;
let userMock: any;
let errorMock: Error;

let getUserContextMock: jest.Mock;
let onCatchErrorMock: jest.Mock;
let onInteractionEndMock: jest.Mock;
let onMessageMock: jest.Mock;


const defaultArgs = <any>{
  accountSid: uniqueString(),
  authToken: uniqueString(),
  messagingServiceSid: uniqueString(),
  root: randomFlow(),
};


function expectMockToBeCalledWith(fn: jest.Mock, n: number, args: any[][]) {
  expect(fn).toBeCalledTimes(n);
  [...Array(n)].map(
    (_, i: number) =>
      expect(fn.mock.calls[i]).toEqual(args[i]));
}


function baseCaseTest(user = null) {
  expectMockToBeCalledWith(tcMock.getSmsCookeFromRequest, 1, [[reqMock]]);
  expectMockToBeCalledWith(
    fcMock.resolveActionFromState,
    2,
    [[reqMock, cookieMock, user],
     [reqMock, cookieMock, user]],
  );
  expect(tcMock.sendMessageNotification).not.toBeCalled();
  expectMockToBeCalledWith(tcMock.handleAction, 1, [[reqMock, actionMock]]);
  expectMockToBeCalledWith(
    fcMock.resolveNextStateFromAction, 1, [[reqMock, cookieMock, actionMock]]);
  expectMockToBeCalledWith(tcMock.setSmsCookie, 1, [[resMock, cookieMock]]);
  expectMockToBeCalledWith(tcMock.sendEmptyResponse, 1, [[resMock]]);
}

function baseCaseErrorTest(callback: jest.Mock = jest.fn()) {
  expect(callback).not.toBeCalled();
  expectMockToBeCalledWith(tcMock.clearSmsCookie, 1, [[resMock]]);
  expectMockToBeCalledWith(tcMock.sendEmptyResponse, 1, [[resMock]]);
}

function onCatchErrorTest(callback: jest.Mock = jest.fn()) {
  expect(callback).not.toBeCalled();
  expectMockToBeCalledWith(
    onCatchErrorMock, 1, [[cookieMock.interactionContext, null, errorMock]]);
  expectMockToBeCalledWith(tcMock.clearSmsCookie, 1, [[resMock]]);
  expectMockToBeCalledWith(tcMock.sendEmptyResponse, 1, [[resMock]]);
}

function onCatchErrorOnInteractionEndTest(callback: jest.Mock = jest.fn()) {
  expect(callback).not.toBeCalled();
  expectMockToBeCalledWith(
    onCatchErrorMock, 1, [[cookieMock.interactionContext, null, errorMock]]);
  expectMockToBeCalledWith(
    fcMock.onInteractionEnd, 1, [[cookieMock.interactionContext, null]]);
  expectMockToBeCalledWith(tcMock.clearSmsCookie, 1, [[resMock]]);
  expectMockToBeCalledWith(tcMock.sendEmptyResponse, 1, [[resMock]]);
}

function onCatchErrorReturnsReplyTest(
  callback: jest.Mock,
  reply: Reply,
  tcHandleActionCalled: boolean = false,
) {
  if (callback !== tcMock.handleAction) {
    expect(callback).not.toBeCalled();
  }
  expectMockToBeCalledWith(
    onCatchErrorMock, 1, [[cookieMock.interactionContext, null, errorMock]]);
  expectMockToBeCalledWith(
    tcMock.handleAction,
    tcHandleActionCalled ? 2 : 1, // true implies we are testing tcMock.handleAction
    tcHandleActionCalled ? [[reqMock, actionMock], [reqMock, reply]] : [[reqMock, reply]],
  );
  expectMockToBeCalledWith(
    fcMock.onInteractionEnd, 1, [[cookieMock.interactionContext, null]]);
  expectMockToBeCalledWith(tcMock.clearSmsCookie, 1, [[resMock]]);
  expectMockToBeCalledWith(tcMock.sendEmptyResponse, 1, [[resMock]]);
}

function onInteractionEndThrowsErrorTest(callback: jest.Mock, err: Error) {
  expect(callback).not.toBeCalled();
  expectMockToBeCalledWith(
    onCatchErrorMock, 2, [
      [cookieMock.interactionContext, null, errorMock],
      [cookieMock.interactionContext, null, err],
    ]);
  expectMockToBeCalledWith(tcMock.clearSmsCookie, 1, [[resMock]]);
  expectMockToBeCalledWith(tcMock.sendEmptyResponse, 1, [[resMock]]);
}

function onCatchErrorReplyFailureTest(callback: jest.Mock, err: Error) {
  if (callback !== tcMock.handleAction) {
    expect(callback).not.toBeCalled();
  }
  expectMockToBeCalledWith(
    onCatchErrorMock, 2, [
      [cookieMock.interactionContext, null, errorMock],
      [cookieMock.interactionContext, null, err],
    ]);
  expectMockToBeCalledWith(tcMock.clearSmsCookie, 1, [[resMock]]);
  expectMockToBeCalledWith(tcMock.sendEmptyResponse, 1, [[resMock]]);
}


beforeEach(() => {
  reqMock = getMockTwilioWebhookRequest();
  cookieMock = <SmsCookie>{
    createdAt: new Date(),
    flow: null,
    flowContext: {},
    flowKey: 0,
    from: reqMock.body.From,
    interactionComplete: false,
    interactionContext: [],
    interactionId: uniqueString(),
    isComplete: false,
    question: {
      attempts: [],
      isAnswering: false,
    },
  };
  actionMock = {};
  resMock = {};
  userMock = {};

  cookieParserMock = require('cookie-parser');
  cookieParserMock.mockReturnValue(cookieParserMiddleware);

  fcConstructorMock.mockReturnValue(fcMock);
  tcConstructorMock.mockReturnValue(tcMock);

  (<jest.Mock>(<any>FlowController)).mockImplementation(fcConstructorMock);
  (<jest.Mock>(<any>TwilioController)).mockImplementation(tcConstructorMock);

  tcMock.getSmsCookeFromRequest.mockReturnValue(cookieMock);
  fcMock.resolveNextStateFromAction.mockResolvedValue(cookieMock);

  getUserContextMock = jest.fn();
  getUserContextMock.mockResolvedValue(userMock);
  onCatchErrorMock = jest.fn();
  onInteractionEndMock = jest.fn();
  onMessageMock = jest.fn();

  errorMock = new Error(uniqueString());
});

afterEach(() => {
  cookieParserMiddleware.mockRestore();
  fcConstructorMock.mockRestore();
  tcConstructorMock.mockRestore();

  (<jest.Mock>(<any>FlowController)).mockRestore();
  (<jest.Mock>(<any>TwilioController)).mockRestore();

  fcMock.onInteractionEnd = null;
  fcMock.getCurrentFlow.mockRestore();
  fcMock.resolveActionFromState.mockRestore();
  fcMock.resolveNextStateFromAction.mockRestore();

  tcMock.clearSmsCookie.mockRestore();
  tcMock.getSmsCookeFromRequest.mockRestore();
  tcMock.handleAction.mockRestore();
  tcMock.sendMessageNotification.mockRestore();
  tcMock.sendEmptyResponse.mockRestore();
  tcMock.setSmsCookie.mockRestore();

  (<jest.Mock>updateContext).mockRestore();
});


test('twilly base case: all default parameters', () => {
  const { Router } = require('express');
  const router = twilly(defaultArgs);

  expect(fcConstructorMock).toBeCalledTimes(1);
  expect(fcConstructorMock).toBeCalledWith(defaultArgs.root, null, {
    onInteractionEnd: null,
    testForExit: defaultTestForExit,
  });

  expect(tcConstructorMock).toBeCalledTimes(1);
  expect(tcConstructorMock).toBeCalledWith({
    accountSid: defaultArgs.accountSid,
    authToken: defaultArgs.authToken,
    cookieKey: getSha256Hash(defaultArgs.accountSid, defaultArgs.accountSid).slice(0, 16),
    messagingServiceSid: defaultArgs.messagingServiceSid,
    sendOnExit: 'Goodbye.',
  });

  expect(cookieParserMock).toBeCalledTimes(1);
  expect(cookieParserMock).toBeCalledWith(
    getSha256Hash(defaultArgs.accountSid, defaultArgs.authToken));

  expect(router.constructor).toBe(Router().constructor);
  expect(router.stack.length).toBe(2);
  expect(router.stack[0].handle).toBe(cookieParserMiddleware);
  expect(router.stack[1].regexp).toEqual(/^\/?$/i);
});


test('twilly test: schema parameter', () => {
  const schema = new FlowSchema({
    [uniqueString()]: randomFlow(),
  });

  twilly({
    ...defaultArgs,
    schema,
  });

  expect(fcConstructorMock).toBeCalledWith(defaultArgs.root, schema, {
    onInteractionEnd: null,
    testForExit: defaultTestForExit,
  });
});


test('twilly test: cookieKey parameter', () => {
  const cookieKey = uniqueString();

  twilly({
    ...defaultArgs,
    cookieKey,
  });

  expect(tcConstructorMock).toBeCalledWith({
    accountSid: defaultArgs.accountSid,
    authToken: defaultArgs.authToken,
    cookieKey,
    messagingServiceSid: defaultArgs.messagingServiceSid,
    sendOnExit: 'Goodbye.',
  });
});


test('twilly test: cookieSecret parameter', () => {
  const cookieSecret = uniqueString();

  twilly({
    ...defaultArgs,
    cookieSecret,
  });

  expect(cookieParserMock).toBeCalledWith(cookieSecret);
});


test('twilly test: onInteractionEnd parameter', () => {
  const onInteractionEnd = jest.fn();

  twilly({
    ...defaultArgs,
    onInteractionEnd,
  });

  expect(fcConstructorMock).toBeCalledWith(defaultArgs.root, null, {
    onInteractionEnd,
    testForExit: defaultTestForExit,
  });
});


test('twilly test: sendOnExit parameter', () => {
  const sendOnExit = uniqueString();

  twilly({
    ...defaultArgs,
    sendOnExit,
  });

  expect(tcConstructorMock).toBeCalledWith({
    accountSid: defaultArgs.accountSid,
    authToken: defaultArgs.authToken,
    cookieKey: getSha256Hash(defaultArgs.accountSid, defaultArgs.accountSid).slice(0, 16),
    messagingServiceSid: defaultArgs.messagingServiceSid,
    sendOnExit,
  });
});


test('twilly handleIncomingWebhookRequest base case: 1 action', async () => {
  const router = twilly(defaultArgs);
  const handleSmsWebhook = getHandler(router);

  fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
  fcMock.resolveActionFromState.mockResolvedValueOnce(null);

  await handleSmsWebhook(reqMock, resMock);
  baseCaseTest();
});


test('twilly handleIncomingWebhookRequest multiple actions', async () => {
  const router = twilly(defaultArgs);
  const handleSmsWebhook = getHandler(router);
  const actionMocks = [{}, {}, {}];

  actionMocks.forEach(
    (mock: any) => fcMock.resolveActionFromState.mockResolvedValueOnce(mock));
  fcMock.resolveActionFromState.mockResolvedValueOnce(null);

  await handleSmsWebhook(reqMock, resMock);

  expect(tcMock.getSmsCookeFromRequest).toBeCalledTimes(1);
  expect(tcMock.getSmsCookeFromRequest).toBeCalledWith(reqMock);

  expectMockToBeCalledWith(
    fcMock.resolveActionFromState,
    4,
    [...Array(4)].map(() => [reqMock, cookieMock, null]),
  );

  expect(tcMock.sendMessageNotification).not.toBeCalled();

  expectMockToBeCalledWith(
    tcMock.handleAction,
    3,
    actionMocks.map(
      (mock: any) => [reqMock, mock]),
  );

  expectMockToBeCalledWith(
    fcMock.resolveNextStateFromAction,
    3,
    actionMocks.map(
      (mock: any) => [reqMock, cookieMock, mock]),
  );

  expect(tcMock.setSmsCookie).toBeCalledTimes(1);
  expect(tcMock.setSmsCookie).toBeCalledWith(resMock, cookieMock);

  expect(tcMock.sendEmptyResponse).toBeCalledTimes(1);
  expect(tcMock.sendEmptyResponse).toBeCalledWith(resMock);
});


test('twilly handleIncomingWebhookRequest interaction completed', async () => {
  const router = twilly(defaultArgs);
  const handleSmsWebhook = getHandler(router);

  cookieMock.isComplete = true;
  fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);

  await handleSmsWebhook(reqMock, resMock);

  expect(tcMock.getSmsCookeFromRequest).toBeCalledTimes(1);
  expect(tcMock.getSmsCookeFromRequest).toBeCalledWith(reqMock);

  expect(fcMock.resolveActionFromState).toBeCalledTimes(1);
  expect(fcMock.resolveActionFromState).toBeCalledWith(reqMock, cookieMock, null);

  expect(tcMock.sendMessageNotification).not.toBeCalled();

  expect(tcMock.handleAction).toBeCalledTimes(1);
  expect(tcMock.handleAction).toBeCalledWith(reqMock, actionMock);

  expect(fcMock.resolveNextStateFromAction).toBeCalledTimes(1);
  expect(fcMock.resolveNextStateFromAction).toBeCalledWith(reqMock, cookieMock, actionMock);

  expect(tcMock.clearSmsCookie).toBeCalledTimes(1);
  expect(tcMock.clearSmsCookie).toBeCalledWith(resMock);

  expect(tcMock.sendEmptyResponse).toBeCalledTimes(1);
  expect(tcMock.sendEmptyResponse).toBeCalledWith(resMock);
});


test('twilly handleIncomingWebhookRequest incomplete Question', async () => {
  const router = twilly(defaultArgs);
  const handleSmsWebhook = getHandler(router);

  actionMock = new Question(uniqueString());
  fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);

  await handleSmsWebhook(reqMock, resMock);

  expect(tcMock.getSmsCookeFromRequest).toBeCalledTimes(1);
  expect(tcMock.getSmsCookeFromRequest).toBeCalledWith(reqMock);

  expect(fcMock.resolveActionFromState).toBeCalledTimes(1);
  expect(fcMock.resolveActionFromState).toBeCalledWith(reqMock, cookieMock, null);

  expect(tcMock.sendMessageNotification).not.toBeCalled();

  expect(tcMock.handleAction).toBeCalledTimes(1);
  expect(tcMock.handleAction).toBeCalledWith(reqMock, actionMock);

  expect(fcMock.resolveNextStateFromAction).toBeCalledTimes(1);
  expect(fcMock.resolveNextStateFromAction).toBeCalledWith(reqMock, cookieMock, actionMock);

  expect(tcMock.setSmsCookie).toBeCalledTimes(1);
  expect(tcMock.setSmsCookie).toBeCalledWith(resMock, cookieMock);

  expect(tcMock.sendEmptyResponse).toBeCalledTimes(1);
  expect(tcMock.sendEmptyResponse).toBeCalledWith(resMock);
});


test('twilly handleIncomingWebhookRequest answered Question', async () => {
  const router = twilly(defaultArgs);
  const handleSmsWebhook = getHandler(router);

  actionMock = new Question(uniqueString());
  actionMock[QuestionSetIsAnswered]();
  fcMock.resolveActionFromState
    .mockResolvedValueOnce(actionMock)
    .mockResolvedValueOnce(null);

  await handleSmsWebhook(reqMock, resMock);

  baseCaseTest();
});


test('twilly handleIncomingWebhookRequest failed Question', async () => {
  const router = twilly(defaultArgs);
  const handleSmsWebhook = getHandler(router);

  actionMock = new Question(uniqueString());
  actionMock[QuestionSetIsFailed]();
  fcMock.resolveActionFromState
    .mockResolvedValueOnce(actionMock)
    .mockResolvedValueOnce(null);

  await handleSmsWebhook(reqMock, resMock);

  baseCaseTest();
});


test('twilly handleIncomingWebhookRequest complete Question', async () => {
  const router = twilly(defaultArgs);
  const handleSmsWebhook = getHandler(router);

  actionMock = new Question(uniqueString());
  actionMock[QuestionSetIsFailed]();
  fcMock.resolveActionFromState
    .mockResolvedValueOnce(actionMock)
    .mockResolvedValueOnce(null);

  await handleSmsWebhook(reqMock, resMock);

  baseCaseTest();
});


test('twilly getUserContext success case test', async () => {
  const router = twilly({
    ...defaultArgs,
    getUserContext: getUserContextMock,
  });
  const handleSmsWebhook = getHandler(router);

  fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
  fcMock.resolveActionFromState.mockResolvedValueOnce(null);

  await handleSmsWebhook(reqMock, resMock);

  baseCaseTest(userMock);
});


test('twilly onMessage hook success base case test', async () => {
  const router = twilly({
    ...defaultArgs,
    onMessage: onMessageMock,
  });
  const handleSmsWebhook = getHandler(router);

  fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
  fcMock.resolveActionFromState.mockResolvedValueOnce(null);

  await handleSmsWebhook(reqMock, resMock);

  baseCaseTest();
  expectMockToBeCalledWith(
    onMessageMock, 1, [[cookieMock.interactionContext, null, reqMock.body.Body]])
});


test('twilly onMessage hook success with getUserContext hook', async () => {
  const router = twilly({
    ...defaultArgs,
    getUserContext: getUserContextMock,
    onMessage: onMessageMock,
  });
  const handleSmsWebhook = getHandler(router);

  fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
  fcMock.resolveActionFromState.mockResolvedValueOnce(null);

  await handleSmsWebhook(reqMock, resMock);

  baseCaseTest(userMock);
  expectMockToBeCalledWith(
    onMessageMock, 1, [[cookieMock.interactionContext, userMock, reqMock.body.Body]])
});


test('twilly onMessage hook success returns a Message action', async () => {
  const router = twilly({
    ...defaultArgs,
    onMessage: onMessageMock,
  });
  const handleSmsWebhook = getHandler(router);

  const msg = new Message(uniqueString(), uniqueString());
  onMessageMock.mockResolvedValue(msg);

  fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
  fcMock.resolveActionFromState.mockResolvedValueOnce(null);

  await handleSmsWebhook(reqMock, resMock);

  expectMockToBeCalledWith(tcMock.getSmsCookeFromRequest, 1, [[reqMock]]);
  expectMockToBeCalledWith(
    fcMock.resolveActionFromState,
    2,
    [[reqMock, cookieMock, null],
     [reqMock, cookieMock, null]],
  );
  expectMockToBeCalledWith(
    tcMock.sendMessageNotification, 1, [[msg]]);
  expectMockToBeCalledWith(tcMock.handleAction, 1, [[reqMock, actionMock]]);
  expectMockToBeCalledWith(
    fcMock.resolveNextStateFromAction, 1, [[reqMock, cookieMock, actionMock]]);
  expectMockToBeCalledWith(tcMock.setSmsCookie, 1, [[resMock, cookieMock]]);
  expectMockToBeCalledWith(tcMock.sendEmptyResponse, 1, [[resMock]]);
});


test('twilly onInteractionEnd handler test success case', async () => {
  const router = twilly({
    ...defaultArgs,
    onInteractionEnd: onInteractionEndMock,
  });
  const handleSmsWebhook = getHandler(router);

  cookieMock.isComplete = true;
  fcMock.onInteractionEnd = onInteractionEndMock;
  fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);

  await handleSmsWebhook(reqMock, resMock);

  expectMockToBeCalledWith(
    fcMock.onInteractionEnd, 1, [[cookieMock.interactionContext, null]]);
});


test('twilly onInteractionEnd handler test success case', async () => {
  const router = twilly(defaultArgs);
  const handleSmsWebhook = getHandler(router);

  cookieMock.isComplete = true;
  fcMock.onInteractionEnd = onInteractionEndMock;
  fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);

  await handleSmsWebhook(reqMock, resMock);

  expectMockToBeCalledWith(
    fcMock.onInteractionEnd, 1, [[cookieMock.interactionContext, null]]);
});


test('twilly onInteractionEnd handler test with getUserContext success case', async () => {
  const router = twilly({
    ...defaultArgs,
    getUserContext: getUserContextMock,
  });
  const handleSmsWebhook = getHandler(router);

  cookieMock.isComplete = true;
  fcMock.onInteractionEnd = onInteractionEndMock;
  fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);

  await handleSmsWebhook(reqMock, resMock);

  expectMockToBeCalledWith(
    fcMock.onInteractionEnd, 1, [[cookieMock.interactionContext, userMock]]);
});


test('twilly onInteractionEnd handler success case returns Message', async () => {
  const router = twilly(defaultArgs);
  const handleSmsWebhook = getHandler(router);

  const msg = new Message(uniqueString(), uniqueString());
  onInteractionEndMock.mockResolvedValue(msg);

  cookieMock.isComplete = true;
  fcMock.onInteractionEnd = onInteractionEndMock;
  fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);

  await handleSmsWebhook(reqMock, resMock);

  expectMockToBeCalledWith(
    fcMock.onInteractionEnd, 1, [[cookieMock.interactionContext, null]]);
  expectMockToBeCalledWith(
    tcMock.sendMessageNotification, 1, [[msg]]);
});


test('twilly getUserContext throws error', async () => {
  const router = twilly({
    ...defaultArgs,
    getUserContext: getUserContextMock,
  });
  const handleSmsWebhook = getHandler(router);

  getUserContextMock.mockRejectedValue(errorMock);
  await handleSmsWebhook(reqMock, resMock);
  baseCaseErrorTest(fcMock.resolveActionFromState);
});


test('twilly getUserContext throws error with onCatchError hook', async () => {
  const router = twilly({
    ...defaultArgs,
    getUserContext: getUserContextMock,
    onCatchError: onCatchErrorMock,
  });
  const handleSmsWebhook = getHandler(router);

  getUserContextMock.mockRejectedValue(errorMock);
  await handleSmsWebhook(reqMock, resMock);
  onCatchErrorTest(fcMock.resolveActionFromState);
});


test('twilly getUserContext throws error with onCatchError and onInteractionEnd hooks', async () => {
  const router = twilly({
    ...defaultArgs,
    getUserContext: getUserContextMock,
    onCatchError: onCatchErrorMock,
  });
  const handleSmsWebhook = getHandler(router);

  getUserContextMock.mockRejectedValue(errorMock);
  fcMock.onInteractionEnd = onInteractionEndMock;

  await handleSmsWebhook(reqMock, resMock);
  onCatchErrorOnInteractionEndTest(fcMock.resolveActionFromState);
});


test(
  'twilly getUserContext throws error with onInteractionEnd, if onCatchError returns Reply',
  async () => {
    const router = twilly({
      ...defaultArgs,
      getUserContext: getUserContextMock,
      onCatchError: onCatchErrorMock,
    });
    const handleSmsWebhook = getHandler(router);
    const reply = new Reply(uniqueString());

    onCatchErrorMock.mockReturnValue(reply);
    (<jest.Mock>updateContext).mockReturnValue(cookieMock);
    getUserContextMock.mockRejectedValue(errorMock);
    fcMock.onInteractionEnd = onInteractionEndMock;

    await handleSmsWebhook(reqMock, resMock);
    onCatchErrorReturnsReplyTest(fcMock.resolveActionFromState, reply);
  },
);


test(
  'twilly getUserContext throws error with onCatchError, onInteractionEnd throws Error',
  async () => {
    const router = twilly({
      ...defaultArgs,
      getUserContext: getUserContextMock,
      onCatchError: onCatchErrorMock,
    });
    const handleSmsWebhook = getHandler(router);
    const secondError = new Error(uniqueString());

    fcMock.onInteractionEnd = onInteractionEndMock;
    getUserContextMock.mockRejectedValue(errorMock);
    onInteractionEndMock.mockRejectedValue(secondError);

    await handleSmsWebhook(reqMock, resMock);
    onInteractionEndThrowsErrorTest(fcMock.resolveActionFromState, secondError);
  },
);


test(
  'twilly getUserContext throws error, onCatchError returns Reply, TwilioController throws Error',
  async () => {
    const router = twilly({
      ...defaultArgs,
      getUserContext: getUserContextMock,
      onCatchError: onCatchErrorMock,
    });
    const handleSmsWebhook = getHandler(router);
    const secondError = new Error(uniqueString());
    const reply = new Reply(uniqueString());

    onCatchErrorMock.mockReturnValue(reply);
    getUserContextMock.mockRejectedValue(errorMock);
    tcMock.handleAction.mockRejectedValue(secondError);
    fcMock.onInteractionEnd = onInteractionEndMock;

    await handleSmsWebhook(reqMock, resMock);
    onCatchErrorReplyFailureTest(fcMock.resolveActionFromState, secondError);
  },
);


test('twilly fc.resolveActionFromState throws error', async () => {
  const router = twilly(defaultArgs);
  const handleSmsWebhook = getHandler(router);

  fcMock.resolveActionFromState.mockRejectedValue(errorMock);
  await handleSmsWebhook(reqMock, resMock);
  baseCaseErrorTest(tcMock.handleAction);
});


test('twilly fc.resolveActionFromState throws error, onMessage hook', async () => {
  const router = twilly({
    ...defaultArgs,
    onMessage: onMessageMock,
  });
  const handleSmsWebhook = getHandler(router);

  fcMock.resolveActionFromState.mockRejectedValue(errorMock);
  await handleSmsWebhook(reqMock, resMock);
  baseCaseErrorTest(onMessageMock);
});


test('twilly fc.resolveActionFromState throws error with onCatchError hook', async () => {
  const router = twilly({
    ...defaultArgs,
    onCatchError: onCatchErrorMock,
  });
  const handleSmsWebhook = getHandler(router);

  fcMock.resolveActionFromState.mockRejectedValue(errorMock);
  await handleSmsWebhook(reqMock, resMock);
  onCatchErrorTest(tcMock.handleAction);
});


test('twilly fc.resolveActionFromState throws error with onCatchError and onInteractionEnd hooks', async () => {
  const router = twilly({
    ...defaultArgs,
    onCatchError: onCatchErrorMock,
  });
  const handleSmsWebhook = getHandler(router);

  fcMock.resolveActionFromState.mockRejectedValue(errorMock);
  fcMock.onInteractionEnd = onInteractionEndMock;
  await handleSmsWebhook(reqMock, resMock);
  onCatchErrorOnInteractionEndTest(tcMock.handleAction);
});


test(
  'twilly fc.resolveActionFromState throws error with onCatchError, onInteractionEnd, onMessage hooks',
  async () => {
    const router = twilly({
      ...defaultArgs,
      onMessage: onMessageMock,
      onCatchError: onCatchErrorMock,
    });
    const handleSmsWebhook = getHandler(router);

    fcMock.resolveActionFromState.mockRejectedValue(errorMock);
    fcMock.onInteractionEnd = onInteractionEndMock;
    await handleSmsWebhook(reqMock, resMock);
    onCatchErrorOnInteractionEndTest(onMessageMock);
  },
);


test(
  'twilly fc.resolveActionFromState throws error with onInteractionEnd, if onCatchError returns Reply',
  async () => {
    const router = twilly({
      ...defaultArgs,
      onCatchError: onCatchErrorMock,
    });
    const handleSmsWebhook = getHandler(router);
    const reply = new Reply(uniqueString());

    onCatchErrorMock.mockReturnValue(reply);
    (<jest.Mock>updateContext).mockReturnValue(cookieMock);
    fcMock.onInteractionEnd = onInteractionEndMock;
    fcMock.resolveActionFromState.mockRejectedValue(errorMock);

    await handleSmsWebhook(reqMock, resMock);
    onCatchErrorReturnsReplyTest(tcMock.handleAction, reply);
  },
);


test(
  'twilly fc.resolveActionFromState throws error with onInteractionEnd, if onCatchError returns Reply, onMessage hook',
  async () => {
    const router = twilly({
      ...defaultArgs,
      onCatchError: onCatchErrorMock,
      onMessage: onMessageMock,
    });
    const handleSmsWebhook = getHandler(router);
    const reply = new Reply(uniqueString());

    onCatchErrorMock.mockReturnValue(reply);
    (<jest.Mock>updateContext).mockReturnValue(cookieMock);
    fcMock.onInteractionEnd = onInteractionEndMock;
    fcMock.resolveActionFromState.mockRejectedValue(errorMock);

    await handleSmsWebhook(reqMock, resMock);
    onCatchErrorReturnsReplyTest(onMessageMock, reply);
  },
);


test(
  'twilly fc.resolveActionFromState throws error with onCatchError, onInteractionEnd throws Error',
  async () => {
    const router = twilly({
      ...defaultArgs,
      onCatchError: onCatchErrorMock,
    });
    const handleSmsWebhook = getHandler(router);
    const secondError = new Error(uniqueString());

    onInteractionEndMock.mockRejectedValue(secondError);
    fcMock.onInteractionEnd = onInteractionEndMock;
    fcMock.resolveActionFromState.mockRejectedValue(errorMock);

    await handleSmsWebhook(reqMock, resMock);
    onInteractionEndThrowsErrorTest(tcMock.handleAction, secondError);
  },
);


test(
  'twilly fc.resolveActionFromState throws error with onCatchError, onInteractionEnd throws Error, onMessage hook',
  async () => {
    const router = twilly({
      ...defaultArgs,
      onCatchError: onCatchErrorMock,
      onMessage: onMessageMock,
    });
    const handleSmsWebhook = getHandler(router);
    const secondError = new Error(uniqueString());

    onInteractionEndMock.mockRejectedValue(secondError);
    fcMock.onInteractionEnd = onInteractionEndMock;
    fcMock.resolveActionFromState.mockRejectedValue(errorMock);

    await handleSmsWebhook(reqMock, resMock);
    onInteractionEndThrowsErrorTest(onMessageMock, secondError);
  },
);


test(
  'twilly fc.resolveActionFromState throws error, onCatchError returns Reply, TwilioController throws Error',
  async () => {
    const router = twilly({
      ...defaultArgs,
      onCatchError: onCatchErrorMock,
    });
    const handleSmsWebhook = getHandler(router);
    const secondError = new Error(uniqueString());
    const reply = new Reply(uniqueString());

    onCatchErrorMock.mockReturnValue(reply);
    fcMock.onInteractionEnd = onInteractionEndMock;
    fcMock.resolveActionFromState.mockRejectedValue(errorMock);
    tcMock.handleAction.mockRejectedValue(secondError);

    await handleSmsWebhook(reqMock, resMock);
    onCatchErrorReplyFailureTest(tcMock.handleAction, secondError);
  },
);


test(
  'twilly fc.resolveActionFromState throws error, onCatchError returns Reply, TwilioController throws Error',
  async () => {
    const router = twilly({
      ...defaultArgs,
      onCatchError: onCatchErrorMock,
      onMessage: onMessageMock,
    });
    const handleSmsWebhook = getHandler(router);
    const secondError = new Error(uniqueString());
    const reply = new Reply(uniqueString());

    onCatchErrorMock.mockReturnValue(reply);
    fcMock.onInteractionEnd = onInteractionEndMock;
    fcMock.resolveActionFromState.mockRejectedValue(errorMock);
    tcMock.handleAction.mockRejectedValue(secondError);

    await handleSmsWebhook(reqMock, resMock);
    onCatchErrorReplyFailureTest(onMessageMock, secondError);
  },
);


test('twilly onMessage throws error', async () => {
  const router = twilly({
    ...defaultArgs,
    onMessage: onMessageMock,
  });
  const handleSmsWebhook = getHandler(router);

  onMessageMock.mockRejectedValue(errorMock);
  fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
  fcMock.resolveActionFromState.mockResolvedValueOnce(null);

  await handleSmsWebhook(reqMock, resMock);
  baseCaseTest();
});


test('twilly onMessage throws error with onCatchError hook', async () => {
  const router = twilly({
    ...defaultArgs,
    onCatchError: onCatchErrorMock,
    onMessage: onMessageMock,
  });
  const handleSmsWebhook = getHandler(router);

  onMessageMock.mockRejectedValue(errorMock);
  fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
  fcMock.resolveActionFromState.mockResolvedValueOnce(null);

  await handleSmsWebhook(reqMock, resMock);
  baseCaseTest();
  expectMockToBeCalledWith(
    onCatchErrorMock, 1, [[cookieMock.interactionContext, null, errorMock]]);
});


test('twilly onMessage throws error with onCatchError and getUserContext hook', async () => {
  const router = twilly({
    ...defaultArgs,
    getUserContext: getUserContextMock,
    onCatchError: onCatchErrorMock,
    onMessage: onMessageMock,
  });
  const handleSmsWebhook = getHandler(router);

  fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
  fcMock.resolveActionFromState.mockResolvedValueOnce(null);

  onMessageMock.mockRejectedValue(errorMock);

  await handleSmsWebhook(reqMock, resMock);
  baseCaseTest(userMock);
  expectMockToBeCalledWith(
    onCatchErrorMock, 1, [[cookieMock.interactionContext, userMock, errorMock]]);
});


test('twilly onMessage hook: tc.sendMessageNotification throws error', async () => {
  const router = twilly({
    ...defaultArgs,
    onMessage: onMessageMock,
  });
  const handleSmsWebhook = getHandler(router);
  const msg = new Message(uniqueString(), uniqueString());

  fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
  fcMock.resolveActionFromState.mockResolvedValueOnce(null);

  onMessageMock.mockResolvedValue(msg);
  tcMock.sendMessageNotification.mockRejectedValue(errorMock);
  fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);

  await handleSmsWebhook(reqMock, resMock);

  expectMockToBeCalledWith(tcMock.getSmsCookeFromRequest, 1, [[reqMock]]);
  expectMockToBeCalledWith(
    fcMock.resolveActionFromState,
    2,
    [[reqMock, cookieMock, null],
    [reqMock, cookieMock, null]],
  );
  expectMockToBeCalledWith(tcMock.handleAction, 1, [[reqMock, actionMock]]);
  expectMockToBeCalledWith(
    fcMock.resolveNextStateFromAction, 1, [[reqMock, cookieMock, actionMock]]);
  expectMockToBeCalledWith(tcMock.setSmsCookie, 1, [[resMock, cookieMock]]);
  expectMockToBeCalledWith(tcMock.sendEmptyResponse, 1, [[resMock]]);
});


test('twilly onMessage hook: tc.sendMessageNotification throws error with onCatchError hook', async () => {
  const router = twilly({
    ...defaultArgs,
    onCatchError: onCatchErrorMock,
    onMessage: onMessageMock,
  });
  const handleSmsWebhook = getHandler(router);
  const msg = new Message(uniqueString(), uniqueString());

  fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
  fcMock.resolveActionFromState.mockResolvedValueOnce(null);

  onMessageMock.mockResolvedValue(msg);
  tcMock.sendMessageNotification.mockRejectedValue(errorMock);

  await handleSmsWebhook(reqMock, resMock);

  expectMockToBeCalledWith(tcMock.getSmsCookeFromRequest, 1, [[reqMock]]);
  expectMockToBeCalledWith(
    fcMock.resolveActionFromState,
    2,
    [[reqMock, cookieMock, null],
    [reqMock, cookieMock, null]],
  );
  expectMockToBeCalledWith(tcMock.handleAction, 1, [[reqMock, actionMock]]);
  expectMockToBeCalledWith(
    fcMock.resolveNextStateFromAction, 1, [[reqMock, cookieMock, actionMock]]);
  expectMockToBeCalledWith(tcMock.setSmsCookie, 1, [[resMock, cookieMock]]);
  expectMockToBeCalledWith(tcMock.sendEmptyResponse, 1, [[resMock]]);
  expectMockToBeCalledWith(
    onCatchErrorMock, 1, [[cookieMock.interactionContext, null, errorMock]]);
});


test(
  'twilly onMessage hook: tc.sendMessageNotification throws error with onCatchError and getUserContext hook',
  async () => {
    const router = twilly({
      ...defaultArgs,
      getUserContext: getUserContextMock,
      onCatchError: onCatchErrorMock,
      onMessage: onMessageMock,
    });
    const handleSmsWebhook = getHandler(router);
    const msg = new Message(uniqueString(), uniqueString());

    onMessageMock.mockResolvedValue(msg);
    tcMock.sendMessageNotification.mockRejectedValue(errorMock);
    fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
    fcMock.resolveActionFromState.mockResolvedValueOnce(null);

    await handleSmsWebhook(reqMock, resMock);

    expectMockToBeCalledWith(tcMock.getSmsCookeFromRequest, 1, [[reqMock]]);
    expectMockToBeCalledWith(
      fcMock.resolveActionFromState,
      2,
      [[reqMock, cookieMock, userMock],
        [reqMock, cookieMock, userMock]],
    );
    expectMockToBeCalledWith(tcMock.handleAction, 1, [[reqMock, actionMock]]);
    expectMockToBeCalledWith(
      fcMock.resolveNextStateFromAction, 1, [[reqMock, cookieMock, actionMock]]);
    expectMockToBeCalledWith(tcMock.setSmsCookie, 1, [[resMock, cookieMock]]);
    expectMockToBeCalledWith(tcMock.sendEmptyResponse, 1, [[resMock]]);
    expectMockToBeCalledWith(
      onCatchErrorMock, 1, [[cookieMock.interactionContext, userMock, errorMock]]);
  },
);


test('twilly tc.handleAction throws error', async () => {
  const router = twilly(defaultArgs);
  const handleSmsWebhook = getHandler(router);

  fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
  fcMock.resolveActionFromState.mockResolvedValueOnce(null);

  tcMock.handleAction.mockRejectedValue(errorMock);
  await handleSmsWebhook(reqMock, resMock);
  baseCaseErrorTest(fcMock.resolveNextStateFromAction);
});


test('twilly tc.handleAction throws error with onCatchError hook', async () => {
  const router = twilly({
    ...defaultArgs,
    onCatchError: onCatchErrorMock,
  });
  const handleSmsWebhook = getHandler(router);

  fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
  fcMock.resolveActionFromState.mockResolvedValueOnce(null);

  tcMock.handleAction.mockRejectedValue(errorMock);
  await handleSmsWebhook(reqMock, resMock);
  onCatchErrorTest(fcMock.resolveNextStateFromAction);
});


test('twilly tc.handleAction throws error with onCatchError and onInteractionEnd hooks', async () => {
  const router = twilly({
    ...defaultArgs,
    onCatchError: onCatchErrorMock,
  });
  const handleSmsWebhook = getHandler(router);

  fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
  fcMock.resolveActionFromState.mockResolvedValueOnce(null);

  tcMock.handleAction.mockRejectedValue(errorMock);
  fcMock.onInteractionEnd = onInteractionEndMock;
  await handleSmsWebhook(reqMock, resMock);
  onCatchErrorOnInteractionEndTest(fcMock.resolveNextStateFromAction);
});


test(
  'twilly tc.handleAction throws error with onInteractionEnd, if onCatchError returns Reply',
  async () => {
    const router = twilly({
      ...defaultArgs,
      onCatchError: onCatchErrorMock,
    });
    const handleSmsWebhook = getHandler(router);
    const reply = new Reply(uniqueString());

    fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
    fcMock.resolveActionFromState.mockResolvedValueOnce(null);

    onCatchErrorMock.mockReturnValue(reply);
    (<jest.Mock>updateContext).mockReturnValue(cookieMock);
    fcMock.onInteractionEnd = onInteractionEndMock;
    tcMock.handleAction
      .mockRejectedValueOnce(errorMock)
      .mockResolvedValueOnce(null);

    await handleSmsWebhook(reqMock, resMock);
    onCatchErrorReturnsReplyTest(fcMock.resolveNextStateFromAction, reply, true);
  },
);


test(
  'twilly tc.handleAction throws error with onCatchError, onInteractionEnd throws Error',
  async () => {
    const router = twilly({
      ...defaultArgs,
      onCatchError: onCatchErrorMock,
    });
    const handleSmsWebhook = getHandler(router);
    const secondError = new Error(uniqueString());

    fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
    fcMock.resolveActionFromState.mockResolvedValueOnce(null);

    fcMock.onInteractionEnd = onInteractionEndMock;
    tcMock.handleAction.mockRejectedValue(errorMock);
    onInteractionEndMock.mockRejectedValue(secondError);

    await handleSmsWebhook(reqMock, resMock);
    onInteractionEndThrowsErrorTest(fcMock.resolveNextStateFromAction, secondError);
  },
);


test(
  'twilly tc.handleAction throws error, onCatchError returns Reply, TwilioController throws Error',
  async () => {
    const router = twilly({
      ...defaultArgs,
      onCatchError: onCatchErrorMock,
    });
    const handleSmsWebhook = getHandler(router);
    const secondError = new Error(uniqueString());
    const reply = new Reply(uniqueString());

    fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
    fcMock.resolveActionFromState.mockResolvedValueOnce(null);

    onCatchErrorMock.mockReturnValue(reply);
    fcMock.onInteractionEnd = onInteractionEndMock;
    tcMock.handleAction
      .mockRejectedValueOnce(errorMock)
      .mockRejectedValueOnce(secondError);

    await handleSmsWebhook(reqMock, resMock);
    onCatchErrorReplyFailureTest(fcMock.resolveNextStateFromAction, secondError);
  },
);


test('twilly fc.resolveNextStateFromAction throws error', async () => {
  const router = twilly(defaultArgs);
  const handleSmsWebhook = getHandler(router);

  fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
  fcMock.resolveActionFromState.mockResolvedValueOnce(null);

  fcMock.resolveNextStateFromAction.mockRejectedValue(errorMock);
  await handleSmsWebhook(reqMock, resMock);
  baseCaseErrorTest(tcMock.setSmsCookie);
});


test('twilly fc.resolveNextStateFromAction throws error with onCatchError hook', async () => {
  const router = twilly({
    ...defaultArgs,
    onCatchError: onCatchErrorMock,
  });
  const handleSmsWebhook = getHandler(router);

  fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
  fcMock.resolveActionFromState.mockResolvedValueOnce(null);

  fcMock.resolveNextStateFromAction.mockRejectedValue(errorMock);
  await handleSmsWebhook(reqMock, resMock);
  onCatchErrorTest(tcMock.setSmsCookie);
});


test(
  'twilly fc.resolveNextStateFromAction throws error with onCatchError and onInteractionEnd hooks',
  async () => {
    const router = twilly({
      ...defaultArgs,
      onCatchError: onCatchErrorMock,
    });
    const handleSmsWebhook = getHandler(router);

    fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
    fcMock.resolveActionFromState.mockResolvedValueOnce(null);

    fcMock.resolveNextStateFromAction.mockRejectedValue(errorMock);
    fcMock.onInteractionEnd = onInteractionEndMock;
    await handleSmsWebhook(reqMock, resMock);
    onCatchErrorOnInteractionEndTest(tcMock.setSmsCookie);
  },
);
// HERE


test(
  'twilly fc.resolveNextStateFromAction throws error with onInteractionEnd, if onCatchError returns Reply',
  async () => {
    const router = twilly({
      ...defaultArgs,
      onCatchError: onCatchErrorMock,
    });
    const handleSmsWebhook = getHandler(router);
    const reply = new Reply(uniqueString());

    fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
    fcMock.resolveActionFromState.mockResolvedValueOnce(null);

    onCatchErrorMock.mockReturnValue(reply);
    (<jest.Mock>updateContext).mockReturnValue(cookieMock);
    fcMock.onInteractionEnd = onInteractionEndMock;
    fcMock.resolveNextStateFromAction.mockRejectedValue(errorMock);
    tcMock.handleAction.mockResolvedValue(null);

    await handleSmsWebhook(reqMock, resMock);
    onCatchErrorReturnsReplyTest(tcMock.setSmsCookie, reply, true);
  },
);


test(
  'twilly fc.resolveNextStateFromAction throws error with onCatchError, onInteractionEnd throws Error',
  async () => {
    const router = twilly({
      ...defaultArgs,
      onCatchError: onCatchErrorMock,
    });
    const handleSmsWebhook = getHandler(router);
    const secondError = new Error(uniqueString());

    fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
    fcMock.resolveActionFromState.mockResolvedValueOnce(null);

    onInteractionEndMock.mockRejectedValue(secondError);
    fcMock.onInteractionEnd = onInteractionEndMock;
    fcMock.resolveNextStateFromAction.mockRejectedValue(errorMock);
    fcMock.onInteractionEnd.mockRejectedValue(secondError);
    tcMock.handleAction.mockResolvedValue(null);

    await handleSmsWebhook(reqMock, resMock);
    onInteractionEndThrowsErrorTest(tcMock.setSmsCookie, secondError);
  },
);


test(
  'twilly fc.resolveNextStateFromAction throws error, onCatchError returns Reply, TwilioController throws Error',
  async () => {
    const router = twilly({
      ...defaultArgs,
      onCatchError: onCatchErrorMock,
    });
    const handleSmsWebhook = getHandler(router);
    const secondError = new Error(uniqueString());
    const reply = new Reply(uniqueString());

    fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
    fcMock.resolveActionFromState.mockResolvedValueOnce(null);

    onCatchErrorMock.mockReturnValue(reply);
    fcMock.onInteractionEnd = onInteractionEndMock;
    fcMock.resolveNextStateFromAction.mockRejectedValue(errorMock);
    tcMock.handleAction
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(secondError);

    await handleSmsWebhook(reqMock, resMock);
    onCatchErrorReplyFailureTest(tcMock.setSmsCookie, secondError);
  },
);


test('twilly fc.onInteractionEnd in main block throws error', async () => {
  const router = twilly(defaultArgs);
  const handleSmsWebhook = getHandler(router);

  fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
  fcMock.resolveActionFromState.mockResolvedValueOnce(null);

  cookieMock.isComplete = true;
  fcMock.onInteractionEnd = onInteractionEndMock;
  onInteractionEndMock.mockRejectedValue(errorMock);

  await handleSmsWebhook(reqMock, resMock);
  baseCaseErrorTest();
});


test(
  'twilly fc.onInteractionEnd in main block throws error with onCatchError hook',
  async () => {
    const router = twilly({
      ...defaultArgs,
      onCatchError: onCatchErrorMock,
    });
    const handleSmsWebhook = getHandler(router);

    fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
    fcMock.resolveActionFromState.mockResolvedValueOnce(null);

    cookieMock.isComplete = true;
    fcMock.onInteractionEnd = onInteractionEndMock;
    onInteractionEndMock
      .mockRejectedValueOnce(errorMock)
      .mockResolvedValueOnce(null);

    await handleSmsWebhook(reqMock, resMock);
    onCatchErrorOnInteractionEndTest();
  },
);


test('twilly tc.sendMessageNotification in main block throws error', async () => {
  const router = twilly(defaultArgs);
  const handleSmsWebhook = getHandler(router);
  const msg = new Message(uniqueString(), uniqueString());

  fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
  fcMock.resolveActionFromState.mockResolvedValueOnce(null);

  cookieMock.isComplete = true;
  fcMock.onInteractionEnd = onInteractionEndMock;
  onInteractionEndMock.mockResolvedValue(msg);
  tcMock.sendMessageNotification.mockRejectedValue(errorMock);

  await handleSmsWebhook(reqMock, resMock);
  baseCaseErrorTest();
});


test(
  'twilly fc.onInteractionEnd in main block throws error with onCatchError hook',
  async () => {
    const router = twilly({
      ...defaultArgs,
      onCatchError: onCatchErrorMock,
    });
    const handleSmsWebhook = getHandler(router);
    const msg = new Message(uniqueString(), uniqueString());

    fcMock.resolveActionFromState.mockResolvedValueOnce(actionMock);
    fcMock.resolveActionFromState.mockResolvedValueOnce(null);

    cookieMock.isComplete = true;
    fcMock.onInteractionEnd = onInteractionEndMock;
    onInteractionEndMock.mockResolvedValue(msg);
    tcMock.sendMessageNotification.mockRejectedValue(errorMock);

    await handleSmsWebhook(reqMock, resMock);
    onCatchErrorOnInteractionEndTest();
  },
);
