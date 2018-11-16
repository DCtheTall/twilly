import TwilioController, { TwilioControllerArgs } from './Controller';
import { uniqueString } from '../util';
import { getMockTwilioWebhookRequest } from './TwilioWebhookRequest';
import { createSmsCookie } from '../SmsCookie';
import {
  ActionSetMessageSid,
  Exit,
  Message,
  ActionSetMessageSids,
} from '../Actions';


jest.mock('twilio', () => jest.fn());


const twilioMessagesCreate = jest.fn();
let twilio;

beforeEach(() => {
  twilio = require('twilio');
  twilio.mockReturnValue({
    messages: {
      create: twilioMessagesCreate,
    },
  });
});
afterEach(() => {
  twilio.mockRestore();
  twilioMessagesCreate.mockRestore();
});


const args = <TwilioControllerArgs>{
  accountSid: uniqueString(),
  authToken: uniqueString(),
  cookieKey: uniqueString(),
  messageServiceId: uniqueString(),
  sendOnExit: uniqueString(),
};


test('TwilioController should type check its arguments', () => {
  let executeTest: (object: any) => void;

  const selectOption =
    (option: string) => (executeTest = ((object: any) => {
      let caught: Error;

      args[option] = object;
      try {
        new TwilioController(args);
      } catch (err) {
        caught = err;
      }
      args[option] = uniqueString();

      expect(caught.constructor).toBe(TypeError);
      expect(caught.message).toBe(
        `${option} twilly option must be a non-empty string`);
    }));
  const executeTests =
    () =>
      executeTest('')
      || executeTest(1)
      || executeTest({})
      || executeTest([])
      || executeTest(() => { })
      || executeTest(null);

  Object.keys(args).map((option: string) => {
    selectOption(option);
    executeTests();
  });
});


test('TwilioController constructor should create an instance of the twilio module', () => {
  new TwilioController(args);
  expect(twilio).toBeCalledTimes(1);
  expect(twilio).toBeCalledWith(args.accountSid, args.authToken);
});


test('TwilioController clearSmsCookie test', () => {
  const res = <any>{ clearCookie: jest.fn() };
  const tc = new TwilioController(args);
  tc.clearSmsCookie(res);
  expect(res.clearCookie).toBeCalledTimes(1);
  expect(res.clearCookie).toBeCalledWith(args.cookieKey);
});


test('TwilioController getSmsCookeFromRequest with no cookie set', () => {
  const req = getMockTwilioWebhookRequest();
  const tc = new TwilioController(args);
  const { createdAt, interactionId, ...rest } = createSmsCookie(req);
  const cookie = tc.getSmsCookeFromRequest(req);
  expect(cookie).toMatchObject(rest);
  expect(cookie.createdAt.constructor).toBe(Date);
  expect(typeof cookie.interactionId).toBe('string');
});


test('TwilioController getSmsCookeFromRequest with cookie set', () => {
  const req = getMockTwilioWebhookRequest();
  const tc = new TwilioController(args);
  const prevCookie = createSmsCookie(req);

  req.cookies[args.cookieKey] = prevCookie;
  const cookie = tc.getSmsCookeFromRequest(req);

  expect(cookie).toBe(prevCookie);
});


test('TwilioController handleAction receives Exit action', async () => {
  const tc = new TwilioController(args);
  const req = getMockTwilioWebhookRequest();
  const exit = new Exit(uniqueString());
  const sid = uniqueString();

  exit[ActionSetMessageSid] = jest.fn();
  twilioMessagesCreate.mockResolvedValue({ sid });
  await tc.handleAction(req, exit);

  expect(twilioMessagesCreate).toBeCalledTimes(1);
  expect(twilioMessagesCreate).toBeCalledWith({
    to: req.body.From,
    body: args.sendOnExit,
    messagingServiceSid: args.messageServiceId,
  });
  expect(exit[ActionSetMessageSid]).toBeCalledTimes(1);
  expect(exit[ActionSetMessageSid]).toBeCalledWith(sid);
});


test('TwilioController handleAction receives Message action with single recipient', async () => {
  const tc = new TwilioController(args);
  const req = getMockTwilioWebhookRequest();
  const msg = new Message(uniqueString(), uniqueString());
  const sid = uniqueString();

  msg[ActionSetMessageSids] = jest.fn();
  twilioMessagesCreate.mockResolvedValue({ sid });
  await tc.handleAction(req, msg);

  expect(twilioMessagesCreate).toBeCalledTimes(1);
  expect(twilioMessagesCreate).toBeCalledWith({
    to: msg.to[0],
    body: msg.body,
    messagingServiceSid: args.messageServiceId,
  });
  expect(msg[ActionSetMessageSids]).toBeCalledTimes(1);
  expect(msg[ActionSetMessageSids]).toBeCalledWith([sid]);
});


test('TwilioController handleAction receives Message action with multiple recipients', async () => {
  const tc = new TwilioController(args);
  const req = getMockTwilioWebhookRequest();
  const to = [
    uniqueString(),
    uniqueString(),
    uniqueString(),
  ];
  const msg = new Message(to, uniqueString());

  const sids = <string[]>[];
  function getSid(): string {
    sids.push(uniqueString());
    return sids[sids.length - 1];
  }

  let setSids;
  msg[ActionSetMessageSids] = setSids = jest.fn();
  twilioMessagesCreate
    .mockResolvedValueOnce({ sid: getSid() })
    .mockResolvedValueOnce({ sid: getSid() })
    .mockResolvedValueOnce({ sid: getSid() });

  await tc.handleAction(req, msg);

  expect(twilioMessagesCreate).toBeCalledTimes(3);
  [...Array(3)].map(
    (_, i: number) =>
      expect(twilioMessagesCreate.mock.calls[i][0]).toEqual({
        to: msg.to[i],
        body: msg.body,
        messagingServiceSid: args.messageServiceId,
      }));
  expect(setSids).toBeCalledTimes(1);
  expect(setSids.mock.calls[0][0]).toEqual(sids);
});
