import * as SmsCookieModule from '.';
import { getMockTwilioWebhookRequest } from '../twllio';
import { uniqueString } from '../util';
import { Trigger, Reply } from '../Actions';
import { Flow } from '../Flows';


test('SmsCookie addQuestionAttempt', () => {
  const req = getMockTwilioWebhookRequest();
  const attempt1 = uniqueString();
  const attempt2 = uniqueString();

  let cookie = SmsCookieModule.createSmsCookie(req);

  cookie.question.attempts = [attempt1];
  cookie = SmsCookieModule.addQuestionAttempt(cookie, attempt2);
  expect(cookie.question.attempts).toEqual([attempt1, attempt2]);
});


test('SmsCookie completeInteraction', () => {
  const req = getMockTwilioWebhookRequest();

  let cookie = SmsCookieModule.createSmsCookie(req);

  cookie = SmsCookieModule.completeInteraction(cookie);
  expect(cookie.isComplete).toBe(true);
});


test('SmsCookie createSmsCookie', () => {
  const req = getMockTwilioWebhookRequest();
  const cookie = SmsCookieModule.createSmsCookie(req);

  expect(cookie).toMatchObject({
    flow: null,
    flowContext: {},
    flowKey: 0,
    from: req.body.From,
    interactionComplete: false,
    interactionContext: [],
    isComplete: false,
    question: {
      attempts: [],
      isAnswering: false,
    },
  });
  expect(typeof cookie.interactionId).toBe('string');
  expect(cookie.createdAt.constructor).toBe(Date);
});


test('SmsCookie handleTrigger', () => {
  const req = getMockTwilioWebhookRequest();
  const trigger = new Trigger(uniqueString());

  let cookie = SmsCookieModule.createSmsCookie(req);

  cookie = SmsCookieModule.handleTrigger(cookie, trigger);
  expect(cookie).toMatchObject({
    flow: trigger.flowName,
    flowKey: 0,
  });
});


test('SmsCookie incrementFlowAction flow not yet complete', () => {
  const req = getMockTwilioWebhookRequest();
  const flow = new Flow(uniqueString());
  const completeInteraction = jest.spyOn(SmsCookieModule, 'completeInteraction');

  let cookie = SmsCookieModule.createSmsCookie(req);

  cookie.flowKey = 1;
  flow.addActions([
    { name: uniqueString(), resolve: () => new Reply(uniqueString()) },
    { name: uniqueString(), resolve: () => new Reply(uniqueString()) },
    { name: uniqueString(), resolve: () => new Reply(uniqueString()) },
  ]);
  cookie = SmsCookieModule.incrementFlowAction(cookie, flow);
  expect(cookie).toMatchObject({
    flowKey: 2,
    isComplete: false,
  });
});


test('SmsCookie incrementFlowAction flow not yet complete', () => {
  const req = getMockTwilioWebhookRequest();
  const flow = new Flow(uniqueString());

  let cookie = SmsCookieModule.createSmsCookie(req);

  cookie.flowKey = 2;
  flow.addActions([
    { name: uniqueString(), resolve: () => new Reply(uniqueString()) },
    { name: uniqueString(), resolve: () => new Reply(uniqueString()) },
    { name: uniqueString(), resolve: () => new Reply(uniqueString()) },
  ]);
  cookie = SmsCookieModule.incrementFlowAction(cookie, flow);
  expect(cookie).toMatchObject({
    flowKey: 2,
    isComplete: true,
  });
});


test('SmsCookie startQuestion', () => {
  const req = getMockTwilioWebhookRequest();

  let cookie = SmsCookieModule.createSmsCookie(req);

  cookie = SmsCookieModule.startQuestion(cookie);
  expect(cookie).toMatchObject({
    question: {
      isAnswering: true,
      attempts: [],
    },
  });
});
