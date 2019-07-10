import {
  TwilioController,
  TwilioControllerArgs,
  getMockTwilioWebhookRequest,
} from '../../src/twllio';
import TwimlResponse from '../../src/twllio/TwimlResponse';
import { uniqueString } from '../../src/util';
import { createSmsCookie } from '../../src/SmsCookie';
import {
  ActionSetMessageSid,
  ActionSetMessageSids,
  Exit,
  Message,
  Question,
  QuestionSetIsAnswered,
  QuestionSetIsFailed,
  QuestionSetShouldSendInvalidRes,
  Reply,
} from '../../src/Actions';


jest.mock('twilio', () => jest.fn());
jest.mock('../../src/twllio/TwimlResponse', () => jest.fn());


const twilioMessagesCreate = jest.fn();
const twimlResponseMock = {
  send: jest.fn(),
  setMessage: jest.fn()
};
const twimlResponseConstructorMock = jest.fn();

let twilio: jest.Mock;
let setSids: jest.Mock;


beforeEach(() => {
  twilio = <jest.Mock>require('twilio');
  twilio.mockReturnValue({
    messages: {
      create: twilioMessagesCreate,
    },
  });
  twimlResponseConstructorMock.mockReturnValue(twimlResponseMock);
  twimlResponseMock.setMessage.mockReturnValue(twimlResponseMock);
  (<any>TwimlResponse).mockImplementation(twimlResponseConstructorMock);
});

afterEach(() => {
  twilio.mockRestore();
  twilioMessagesCreate.mockRestore();
  (<any>TwimlResponse).mockRestore();
  twimlResponseMock.send.mockRestore();
  twimlResponseConstructorMock.mockRestore();
});


const args = <TwilioControllerArgs>{
  accountSid: uniqueString(),
  authToken: uniqueString(),
  cookieKey: uniqueString(),
  messagingServiceSid: uniqueString(),
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
    () => ['', 1, {}, [], () => {}, null].forEach(testcase => executeTest(testcase));

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
  const {createdAt, interactionId, ...rest} = createSmsCookie();
  const cookie = tc.getSmsCookieFromRequest(req);
  expect(cookie).toMatchObject(rest);
  expect(cookie.createdAt.constructor).toBe(Date);
  expect(typeof cookie.interactionId).toBe('string');
});


test('TwilioController getSmsCookeFromRequest with cookie set', () => {
  const req = getMockTwilioWebhookRequest();
  const tc = new TwilioController(args);
  const prevCookie = createSmsCookie();

  req.cookies[args.cookieKey] = prevCookie;
  const cookie = tc.getSmsCookieFromRequest(req);

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
    messagingServiceSid: args.messagingServiceSid,
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
    messagingServiceSid: args.messagingServiceSid,
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
  const sids = [
    uniqueString(),
    uniqueString(),
    uniqueString(),
  ];

  sids.forEach(sid =>
    twilioMessagesCreate.mockResolvedValueOnce({ sid }));
  msg[ActionSetMessageSids] = setSids = jest.fn();

  await tc.handleAction(req, msg);

  expect(twilioMessagesCreate).toBeCalledTimes(3);
  [...Array(3)].map(
    (_, i: number) =>
      expect(twilioMessagesCreate.mock.calls[i][0]).toEqual({
        to: msg.to[i],
        body: msg.body,
        messagingServiceSid: args.messagingServiceSid,
      }));
  expect(setSids).toBeCalledTimes(1);
  expect(setSids.mock.calls[0][0]).toEqual(sids);
});


test('TwilioController handleAction receives Question that has been answered', async () => {
  const tc = new TwilioController(args);
  const req = getMockTwilioWebhookRequest();
  const q = new Question(uniqueString());

  q[ActionSetMessageSids] = setSids = jest.fn();
  q[QuestionSetIsAnswered]();

  await tc.handleAction(req, q);

  expect(twilioMessagesCreate).toBeCalledTimes(0);
  expect(setSids).toBeCalledTimes(0);
});


test('TwilioController handleAction receives Question that has been failed', async () => {
  const tc = new TwilioController(args);
  const req = getMockTwilioWebhookRequest();
  const q = new Question(uniqueString());
  const sid = uniqueString();

  q[ActionSetMessageSids] = setSids = jest.fn();
  twilioMessagesCreate.mockResolvedValue({ sid });
  q[QuestionSetIsFailed]();

  await tc.handleAction(req, q);

  expect(twilioMessagesCreate).toBeCalledTimes(1);
  expect(twilioMessagesCreate).toBeCalledWith({
    to: req.body.From,
    body: q.failedAnswerResponse,
    messagingServiceSid: args.messagingServiceSid,
  });
  expect(setSids).toBeCalledTimes(1);
  expect(setSids).toBeCalledWith([sid]);
});


test(
  'TwilioController handleAction receives Question '
    + 'with a wrong answer but has not failed yet',
  async () => {
    const tc = new TwilioController(args);
    const req = getMockTwilioWebhookRequest();
    const q = new Question(uniqueString());
    const sids = [
      uniqueString(),
      uniqueString(),
    ];

    sids.forEach(sid =>
      twilioMessagesCreate.mockResolvedValueOnce({ sid }));
    q[QuestionSetShouldSendInvalidRes]();
    q[ActionSetMessageSids] = setSids = jest.fn();

    await tc.handleAction(req, q);

    expect(twilioMessagesCreate).toBeCalledTimes(2);
    expect(twilioMessagesCreate.mock.calls[0][0]).toEqual({
      body: q.invalidAnswerResponse,
      messagingServiceSid: args.messagingServiceSid,
      to: req.body.From,
    });
    expect(twilioMessagesCreate.mock.calls[1][0]).toEqual({
      body: q.body,
      messagingServiceSid: args.messagingServiceSid,
      to: req.body.From,
    });
    expect(setSids).toBeCalledTimes(1);
    expect(setSids).toBeCalledWith(sids);
  },
);


test('TwilioController handleAction receives Question that has not yet been answered', async () => {
  const tc = new TwilioController(args);
  const req = getMockTwilioWebhookRequest();
  const q = new Question(uniqueString());
  const sid = uniqueString();

  twilioMessagesCreate.mockResolvedValueOnce({ sid });
  q[ActionSetMessageSids] = setSids = jest.fn();

  await tc.handleAction(req, q);

  expect(twilioMessagesCreate).toBeCalledTimes(1);
  expect(twilioMessagesCreate).toBeCalledWith({
    body: q.body,
    messagingServiceSid: args.messagingServiceSid,
    to: req.body.From,
  });
  expect(setSids).toBeCalledTimes(1);
  expect(setSids).toBeCalledWith([sid]);
});


test('TwilioController handleAction receives Reply', async () => {
  const tc = new TwilioController(args);
  const req = getMockTwilioWebhookRequest();
  const reply = new Reply(uniqueString());
  const sid = uniqueString();

  twilioMessagesCreate.mockResolvedValueOnce({ sid });
  reply[ActionSetMessageSid] = jest.fn();

  await tc.handleAction(req, reply);

  expect(twilioMessagesCreate).toBeCalledTimes(1);
  expect(twilioMessagesCreate).toBeCalledWith({
    body: reply.body,
    messagingServiceSid: args.messagingServiceSid,
    to: req.body.From,
  });
  expect(reply[ActionSetMessageSid]).toBeCalledTimes(1);
  expect(reply[ActionSetMessageSid]).toBeCalledWith(sid);
});


test('TwilioController sendEmptyResponse test', () => {
  const res = <any>{};
  const tc = new TwilioController(args);

  tc.sendEmptyResponse(res);

  expect(twimlResponseConstructorMock).toBeCalledTimes(1);
  expect(twimlResponseConstructorMock).toBeCalledWith(res);
  expect(twimlResponseMock.send).toBeCalledTimes(1);
  expect(twimlResponseMock.send).toBeCalledWith();
});


test('TwilioController sendOnMessageNotification test', async () => {
  const msg = new Message([uniqueString(), uniqueString()], uniqueString());
  const tc = new TwilioController(args);

  twilioMessagesCreate.mockResolvedValue({ sid: uniqueString() });
  await tc.sendMessageNotification(msg);

  expect(twilioMessagesCreate).toBeCalledTimes(2);
  [...Array(2)].map(
    (_, i: number) =>
      expect(twilioMessagesCreate.mock.calls[i][0]).toEqual({
        body: msg.body,
        messagingServiceSid: args.messagingServiceSid,
        to: msg.to[i],
      }));
});


test('TwilioController sendSmsResponse test', () => {
  const res = <any>{};
  const tc = new TwilioController(args);
  const body = uniqueString();

  tc.sendSmsResponse(res, body);

  expect(twimlResponseConstructorMock).toBeCalledTimes(1);
  expect(twimlResponseConstructorMock).toBeCalledWith(res);

  expect(twimlResponseMock.setMessage).toBeCalledTimes(1);
  expect(twimlResponseMock.setMessage).toBeCalledWith(body);

  expect(twimlResponseMock.send).toBeCalledTimes(1);
  expect(twimlResponseMock.send).toBeCalledWith();
});


test('TwilioController setSmsCookie test', () => {
  const res = <any>{ cookie: jest.fn() };
  const tc = new TwilioController(args);
  const cookie = createSmsCookie();

  tc.setSmsCookie(res, cookie);

  expect(res.cookie).toBeCalledTimes(1);
  expect(res.cookie).toBeCalledWith(args.cookieKey, cookie);
});
