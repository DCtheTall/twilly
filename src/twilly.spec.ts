import {
  Flow,
  FlowSchema,
  Message,
  Question,
  Reply,
  Trigger,
  twilly,
} from '.'; // tests should fail if not all objects in build are exported
import FlowController from './Flows/Controller';
import TwilioController from './twllio/Controller';
import { uniqueString, randomFlow, getSha256Hash } from './util';
import { updateContext, SmsCookie } from './SmsCookie';
import { TwilioWebhookRequest, getMockTwilioWebhookRequest } from './twllio';
import { QuestionSetIsAnswered } from './Actions';


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
  sendOnMessageNotification: jest.fn(),
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

let getUserContextMock: jest.Mock;
let onCatchErrorMock: jest.Mock;
let onMessageMock: jest.Mock;


const defaultArgs = <any>{
  accountSid: uniqueString(),
  authToken: uniqueString(),
  messagingServiceSid: uniqueString(),
  root: randomFlow(),
};


beforeEach(() => {
  cookieMock = <SmsCookie>{};
  actionMock = {};
  reqMock = getMockTwilioWebhookRequest();
  resMock = {};

  cookieParserMock = require('cookie-parser');
  cookieParserMock.mockReturnValue(cookieParserMiddleware);

  fcConstructorMock.mockReturnValue(fcMock);
  tcConstructorMock.mockReturnValue(tcMock);

  (<jest.Mock>(<any>FlowController)).mockImplementation(fcConstructorMock);
  (<jest.Mock>(<any>TwilioController)).mockImplementation(tcConstructorMock);

  fcMock.resolveNextStateFromAction.mockResolvedValue(cookieMock);

  tcMock.getSmsCookeFromRequest.mockReturnValue(cookieMock);

  getUserContextMock = jest.fn();
  onMessageMock = jest.fn();
  onCatchErrorMock = jest.fn();
});

afterEach(() => {
  cookieParserMiddleware.mockRestore();
  fcConstructorMock.mockRestore();
  tcConstructorMock.mockRestore();

  (<jest.Mock>(<any>FlowController)).mockRestore();
  (<jest.Mock>(<any>TwilioController)).mockRestore();

  fcMock.getCurrentFlow.mockRestore();
  fcMock.resolveActionFromState.mockRestore();
  fcMock.resolveNextStateFromAction.mockRestore();

  tcMock.clearSmsCookie.mockRestore();
  tcMock.getSmsCookeFromRequest.mockRestore();
  tcMock.handleAction.mockRestore();
  tcMock.sendOnMessageNotification.mockRestore();
  tcMock.sendEmptyResponse.mockRestore();
  tcMock.setSmsCookie.mockRestore();

  (<jest.Mock>(<any>updateContext)).mockRestore();
});


test('twilly base case: all default parameters', () => {
  const { Router } = require('express');
  const router = twilly(defaultArgs);

  expect(fcConstructorMock).toBeCalledTimes(1);
  expect(fcConstructorMock).toBeCalledWith(defaultArgs.root, null, {
    onInteractionEnd: null,
    testForExit: null,
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
    testForExit: null,
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
    testForExit: null,
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

  expect(tcMock.getSmsCookeFromRequest).toBeCalledTimes(1);
  expect(tcMock.getSmsCookeFromRequest).toBeCalledWith(reqMock);

  expect(fcMock.resolveActionFromState).toBeCalledTimes(2);
  expect(fcMock.resolveActionFromState.mock.calls[0]).toEqual([reqMock, cookieMock, null]);
  expect(fcMock.resolveActionFromState.mock.calls[1]).toEqual([reqMock, cookieMock, null]);

  expect(tcMock.sendOnMessageNotification).not.toBeCalled();

  expect(tcMock.handleAction).toBeCalledTimes(1);
  expect(tcMock.handleAction).toBeCalledWith(reqMock, actionMock);

  expect(fcMock.resolveNextStateFromAction).toBeCalledTimes(1);
  expect(fcMock.resolveNextStateFromAction).toBeCalledWith(reqMock, cookieMock, actionMock);

  expect(tcMock.setSmsCookie).toBeCalledTimes(1);
  expect(tcMock.setSmsCookie).toBeCalledWith(resMock, cookieMock);

  expect(tcMock.sendEmptyResponse).toBeCalledTimes(1);
  expect(tcMock.sendEmptyResponse).toBeCalledWith(resMock);
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

  expect(fcMock.resolveActionFromState).toBeCalledTimes(4);
  [...Array(4)].map(
    (_, i: number) =>
      expect(fcMock.resolveActionFromState.mock.calls[i]).toEqual([reqMock, cookieMock, null]));

  expect(tcMock.sendOnMessageNotification).not.toBeCalled();

  expect(tcMock.handleAction).toBeCalledTimes(3);
  actionMocks.forEach(
    (mock: any, i: number) =>
      expect(tcMock.handleAction.mock.calls[i]).toEqual([reqMock, mock]));

  expect(fcMock.resolveNextStateFromAction).toBeCalledTimes(3);
  actionMocks.forEach(
    (mock: any, i: number) =>
      expect(fcMock.resolveNextStateFromAction.mock.calls[i]).toEqual([reqMock, cookieMock, mock]));

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
  fcMock.resolveActionFromState.mockResolvedValueOnce(null);

  await handleSmsWebhook(reqMock, resMock);

  expect(tcMock.getSmsCookeFromRequest).toBeCalledTimes(1);
  expect(tcMock.getSmsCookeFromRequest).toBeCalledWith(reqMock);

  expect(fcMock.resolveActionFromState).toBeCalledTimes(1);
  expect(fcMock.resolveActionFromState).toBeCalledWith(reqMock, cookieMock, null);

  expect(tcMock.sendOnMessageNotification).not.toBeCalled();

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

  expect(tcMock.sendOnMessageNotification).not.toBeCalled();

  expect(tcMock.handleAction).toBeCalledTimes(1);
  expect(tcMock.handleAction).toBeCalledWith(reqMock, actionMock);

  expect(fcMock.resolveNextStateFromAction).toBeCalledTimes(1);
  expect(fcMock.resolveNextStateFromAction).toBeCalledWith(reqMock, cookieMock, actionMock);

  expect(tcMock.setSmsCookie).toBeCalledTimes(1);
  expect(tcMock.setSmsCookie).toBeCalledWith(resMock, cookieMock);

  expect(tcMock.sendEmptyResponse).toBeCalledTimes(1);
  expect(tcMock.sendEmptyResponse).toBeCalledWith(resMock);
});
