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


jest.mock('cookie-parser');

jest.mock('./Flows/Controller');
jest.mock('./twllio/Controller');

const fcMock = {};
const tcMock = {};

const fcConstructorMock = jest.fn();
const tcConstructorMock = jest.fn();

const cookieParserMiddleware = jest.fn();

let cookieParserMock: jest.Mock;


const defaultArgs = <any>{
  accountSid: uniqueString(),
  authToken: uniqueString(),
  messagingServiceSid: uniqueString(),
  root: randomFlow(),
};


beforeEach(() => {
  cookieParserMock = require('cookie-parser');
  cookieParserMock.mockReturnValue(cookieParserMiddleware);

  fcConstructorMock.mockReturnValue(fcMock);
  tcConstructorMock.mockReturnValue(tcMock);

  (<jest.Mock>(<any>FlowController)).mockImplementation(fcConstructorMock);
  (<jest.Mock>(<any>TwilioController)).mockImplementation(tcConstructorMock);
});

afterEach(() => {
  cookieParserMiddleware.mockRestore();
  fcConstructorMock.mockRestore();
  tcConstructorMock.mockRestore();

  (<jest.Mock>(<any>FlowController)).mockRestore();
  (<jest.Mock>(<any>TwilioController)).mockRestore();
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

  expect(router.constructor).toBe(Router().constructor);
  expect(router.stack.length).toBe(2);
  expect(router.stack[0].handle).toBe(cookieParserMiddleware);
  expect(router.stack[1].regexp).toEqual(/^\/?$/i);
});
