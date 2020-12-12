// Imports...
import {
  uniqueString,
  randomFlow,
} from '../src/util';
import { expectMockToBeCalledWith } from './testutil';
import {
  FlowController,
  Flow,
} from '../src/Flows';
import { TwilioController } from '../src/twllio';
import { triggerFlow, Reply } from '../src';
import { SmsCookie } from '../src/SmsCookie';
import { Action } from '../src/Actions';

jest.mock('../src/Flows/Controller');
jest.mock('../src/twllio/Controller');
jest.mock('../src/SmsCookie');

const fcMock = {
  getCurrentFlow: jest.fn(),
  onInteractionEnd: null,
  resolveActionFromState: jest.fn(),
  resolveNextStateFromAction: jest.fn(),
};
const tcMock = {
  clearSmsCookie: jest.fn(),
  getSmsCookieFromRequest: jest.fn(),
  handleAction: jest.fn(),
  sendMessageNotification: jest.fn(),
  sendEmptyResponse: jest.fn(),
  setSmsCookie: jest.fn(),
};

const fcConstructorMock = jest.fn();
const tcConstructorMock = jest.fn();

let userMock: any;
let flowMock: Flow;
let cookieMock: SmsCookie;
let actionMock: Action;
let errorMock: Error;

let getUserContextMock: jest.Mock;
let onCatchErrorMock: jest.Mock;

const to = uniqueString();

const defaultParameters = {
  accountSid: uniqueString(),
  authToken: uniqueString(),
  messagingServiceSid: uniqueString(),
};

beforeEach(() => {
  cookieMock = {
    createdAt: new Date(),
    flow: null,
    flowContext: {},
    flowKey: 0,
    interactionComplete: false,
    interactionContext: [],
    interactionId: uniqueString(),
    isComplete: false,
    question: {
      attempts: [],
      isAnswering: false,
    },
  };

  fcConstructorMock.mockReturnValue(fcMock);
  tcConstructorMock.mockReturnValue(tcMock);

  (<jest.Mock>(<any>FlowController)).mockImplementation(fcConstructorMock);
  (<jest.Mock>(<any>TwilioController)).mockImplementation(tcConstructorMock);

  fcMock.resolveNextStateFromAction.mockResolvedValue(cookieMock);

  getUserContextMock = jest.fn();
  getUserContextMock.mockResolvedValue(userMock);
  onCatchErrorMock = jest.fn();

  errorMock = new Error(uniqueString());
});

afterEach(() => {
  fcConstructorMock.mockRestore();
  tcConstructorMock.mockRestore();

  (<jest.Mock>(<any>FlowController)).mockRestore();
  (<jest.Mock>(<any>TwilioController)).mockRestore();

  fcMock.onInteractionEnd = null;
  fcMock.getCurrentFlow.mockRestore();
  fcMock.resolveActionFromState.mockRestore();
  fcMock.resolveNextStateFromAction.mockRestore();

  tcMock.clearSmsCookie.mockRestore();
  tcMock.getSmsCookieFromRequest.mockRestore();
  tcMock.handleAction.mockRestore();
  tcMock.sendMessageNotification.mockRestore();
  tcMock.sendEmptyResponse.mockRestore();
  tcMock.setSmsCookie.mockRestore();
});

test('base case: triggerFlow with an empty flow', async () => {
  userMock = null;
  actionMock = new Reply(uniqueString());
  flowMock = new Flow();

  fcMock.resolveActionFromState.mockResolvedValueOnce(null);
  await triggerFlow(to, flowMock, defaultParameters);
});

// Test with 1 Reply, 1 Message, one of each

// Test type checking or arguments

// Test action type checking

// Test errors with and without onCatchError
