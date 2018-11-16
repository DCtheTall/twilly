import TwilioController, { TwilioControllerArgs } from './Controller';
import { uniqueString } from '../util';
import { getMockTwilioWebhookRequest } from './TwilioWebhookRequest';
import { createSmsCookie } from '../SmsCookie';


jest.mock('twilio', () => jest.fn());

let twilio;
beforeEach(() => twilio = require('twilio'));
afterEach(() => twilio.mockRestore());


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
