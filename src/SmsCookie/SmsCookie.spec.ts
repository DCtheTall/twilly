import * as SmsCookieModule from '.';
import { getMockTwilioWebhookRequest } from '../twllio';
import {
  randomFlow,
  uniqueString,
} from '../util';
import {
  ActionGetContext,
  ActionSetMessageSids,
  ActionSetName,
  Question,
  Reply,
  Trigger,
} from '../Actions';
import {
  Flow,
  FlowSetName,
  pipeSmsCookieUpdates,
} from '../Flows';


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
    flowContext: {},
  });
});


test('SmsCookie incrementFlowAction flow not yet complete', () => {
  const req = getMockTwilioWebhookRequest();
  const flow = new Flow();

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


test('SmsCookie incrementFlowAction flow complete', () => {
  const req = getMockTwilioWebhookRequest();
  const flow = new Flow();

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

test('SmsCookie updateContext should return null if state is null or falsey', () => {
  const reply = new Reply(uniqueString());
  const flow = randomFlow();

  const executeTest = (obj: any) => {
    expect(SmsCookieModule.updateContext(obj, flow, reply)).toBe(null);
  }

  executeTest(null);
  executeTest(undefined);
  executeTest(false);
});


test(
  'SmsCookie updateContext should throw an Error '
    + 'if the Action provided does not belong',
  () => {
    const reply = new Reply(uniqueString());
    const flow = randomFlow();

    let caught: Error;

    try {
      SmsCookieModule.updateContext(
        SmsCookieModule.createSmsCookie(getMockTwilioWebhookRequest()), flow, reply);
    } catch (err) {
      caught = err;
    }

    expect(caught.constructor).toBe(Error);
    expect(caught.message).toBe(
      `Flow ${flow.name} does not have an action named ${reply.name}`);
  },
);


test('SmsCookie updateContext base case: An interaction with a single reply', () => {
  const reply = new Reply(uniqueString());
  const flow = randomFlow();

  reply[ActionSetName](uniqueString());
  flow.addAction(
    reply.name,
    () => reply,
  );

  const { createdAt, ...rest } = reply[ActionGetContext]();

  const update = state => SmsCookieModule.updateContext(state, flow, reply);
  const cookie = update(
    SmsCookieModule.createSmsCookie(getMockTwilioWebhookRequest()));

  expect(cookie.flowContext[reply.name].createdAt.constructor).toBe(Date);
  expect(cookie.flowContext[reply.name]).toMatchObject(rest);
  expect(cookie.interactionContext.length).toBe(1);
  expect(cookie.interactionContext[0].createdAt.constructor).toBe(Date);
  expect(cookie.interactionContext[0]).toMatchObject({
    flowName: flow.name,
    ...rest,
  });
});


test('SmsCookie updateContext: Interaction with mutliple actions', () => {
  const reply1 = new Reply(uniqueString());
  const reply2 = new Reply(uniqueString());
  const flow = randomFlow();

  reply1[ActionSetName](uniqueString());
  reply2[ActionSetName](uniqueString());
  flow.addActions(
    { name: reply1.name, resolve: () => reply1 },
    { name: reply2.name, resolve: () => reply2 },
  );

  const { createdAt: c1, ...rest1 } = reply1[ActionGetContext]();
  const { createdAt: c2, ...rest2 } = reply2[ActionGetContext]();

  const update1 =
    (state: SmsCookieModule.SmsCookie) =>
      SmsCookieModule.updateContext(state, flow, reply1);
  const update2 =
    (state: SmsCookieModule.SmsCookie) =>
      SmsCookieModule.updateContext(state, flow, reply2);

  const cookie = pipeSmsCookieUpdates(
    update1,
    update2,
  )();

  expect(cookie.flowContext[reply1.name]).toMatchObject(rest1);
  expect(cookie.flowContext[reply1.name].createdAt.constructor).toBe(Date);
  expect(cookie.flowContext[reply2.name]).toMatchObject(rest2);
  expect(cookie.flowContext[reply2.name].createdAt.constructor).toBe(Date);
});


test('SmsCookie updateContext: Interaction with multiple Flows', () => {
  const flow1 = randomFlow();
  const flow2 = randomFlow();

  flow2[FlowSetName](uniqueString());

  const reply1 = new Reply(uniqueString());
  const reply2 = new Reply(uniqueString());
  const trigger = new Trigger(flow2.name);

  reply1[ActionSetName](uniqueString());
  reply2[ActionSetName](uniqueString());
  trigger[ActionSetName](uniqueString());
  flow1.addActions(
    { name: reply1.name, resolve: () => reply1 },
    { name: trigger.name, resolve: () => trigger },
  );
  flow2.addAction(reply2.name, () => reply2);

  const { createdAt: c1, ...r1Rest } = reply1[ActionGetContext]();
  const { createdAt: c2, ...r2Rest } = reply2[ActionGetContext]();
  const { createdAt: c3, ...tRest } = trigger[ActionGetContext]();

  const update1 =
    (state: SmsCookieModule.SmsCookie) =>
      SmsCookieModule.updateContext(state, flow1, reply1);
  const update2 =
    (state: SmsCookieModule.SmsCookie) =>
      SmsCookieModule.handleTrigger(
        SmsCookieModule.updateContext(state, flow1, trigger), trigger);
  const update3 =
    (state: SmsCookieModule.SmsCookie) =>
      SmsCookieModule.updateContext(state, flow2, reply2);

  const cookie = pipeSmsCookieUpdates(
    update1,
    update2,
    update3,
  )();

  expect(cookie.flowContext).not.toHaveProperty(reply1.name);
  expect(cookie.flowContext).not.toHaveProperty(trigger.name);
  expect(cookie.flowContext[reply2.name]).toMatchObject(r2Rest);
  expect(cookie.flowContext[reply2.name].createdAt.constructor).toBe(Date);
  expect(cookie.interactionContext.length).toBe(3);

  expect(cookie.interactionContext[0]).toMatchObject(r1Rest);
  expect(cookie.interactionContext[0].createdAt.constructor).toBe(Date);
  expect(cookie.interactionContext[0].flowName).toBe(flow1.name);

  expect(cookie.interactionContext[1]).toMatchObject(tRest);
  expect(cookie.interactionContext[1].createdAt.constructor).toBe(Date);
  expect(cookie.interactionContext[1].flowName).toBe(flow1.name);

  expect(cookie.interactionContext[2]).toMatchObject(r2Rest);
  expect(cookie.interactionContext[2].createdAt.constructor).toBe(Date);
  expect(cookie.interactionContext[2].flowName).toBe(flow2.name);
});


test('SmsCookie updateContext: recording Question sids', () => {
  const flow = randomFlow();
  const q = new Question(uniqueString());
  const sids1 = [uniqueString(), uniqueString()];
  const sids2 = [uniqueString()];

  q[ActionSetName](uniqueString());
  flow.addAction(q.name, () => q);
  q[ActionSetMessageSids](sids1);

  let { createdAt, ...rest } = q[ActionGetContext]();

  let cookie = SmsCookieModule.updateContext(
    SmsCookieModule.createSmsCookie(getMockTwilioWebhookRequest()), flow, q);

  expect(cookie.flowContext[q.name]).toMatchObject(rest);
  expect(cookie.flowContext[q.name].createdAt.constructor).toBe(Date);

  q[ActionSetMessageSids](sids2);

  cookie = SmsCookieModule.updateContext(cookie, flow, q);

  expect(cookie.flowContext[q.name]).toMatchObject({
    ...rest,
    messageSid: [...sids1, ...sids2],
  });
});
