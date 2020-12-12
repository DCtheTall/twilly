import {
  Flow,
  FlowController,
  FlowSchema,
  FlowSelectActionName,
} from '../../src/Flows';
import {
  Exit,
  GetContext,
  Question,
  QuestionEvaluate,
  QuestionSetIsAnswered,
  QuestionSetIsFailed,
  Reply,
  Trigger,
} from '../../src/Actions';
import { uniqueString, randomFlow } from '../../src/util';
import { getMockTwilioWebhookRequest } from '../../src/twllio';
import * as SmsCookieModule from '../../src/SmsCookie';

const { createSmsCookie } = SmsCookieModule;

test('FlowController base case: root flow with one action', () => {
  let caught: Error;
  try {
    new FlowController(
      new Flow().addAction(
        uniqueString(),
        () => new Reply(uniqueString())));
  } catch (err) {
    caught = err;
  }
  expect(caught).toBe(undefined);
});


test(
  'FlowController constructor should throw a TypeError '
  + 'if the first argument is not a Flow',
  () => {
    const executeTest = (root: any) => {
      let caught: Error;
      try {
        new FlowController(root);
      } catch (err) {
        caught = err;
      }
      expect(caught.constructor).toBe(TypeError);
      expect(caught.message).toBe(
        'root parameter must be an instance of Flow');
    };

    executeTest('');
    executeTest(1);
    executeTest(null);
    executeTest(undefined);
    executeTest({});
    executeTest(() => { });
    executeTest([]);
    executeTest(new FlowSchema({}));
  },
);


test(
  'FlowController constructor should throw a TypeError '
  + 'if the root flow has no actions',
  () => {
    let caught: Error;
    try {
      new FlowController(
        new Flow());
    } catch (err) {
      caught = err;
    }
    expect(caught.constructor).toBe(TypeError);
    expect(caught.message).toBe(
      'All Flows must perform at least one action. Check the root Flow');
  },
);


test('FlowController schema parameter: base case', () => {
  let caught: Error;
  try {
    new FlowController(
      new Flow().addAction(
        uniqueString(),
        () => new Reply(uniqueString())),
      new FlowSchema({
        [uniqueString()]: new Flow().addAction(
          uniqueString(),
          () => new Reply(uniqueString()))
      }),
    );
  } catch (err) {
    caught = err;
  }
  expect(caught).toBe(undefined);
});


test(
  'FlowController constructor should throw a TypeError '
  + 'if schema is not a FlowSchema instance',
  () => {
    const executeTest = (schema: any) => {
      let caught: Error;
      try {
        new FlowController(
          new Flow().addAction(
            uniqueString(),
            () => new Reply(uniqueString())),
          schema,
        );
      } catch (err) {
        caught = err;
      }
      expect(caught.constructor).toBe(TypeError);
      expect(caught.message).toBe(
        'schema parameter must be an instance of FlowSchema');
    };

    executeTest('abc');
    executeTest(1);
    executeTest({});
    executeTest(() => { });
    executeTest([]);
    executeTest(new Flow());
  },
);


test(
  'FlowController constructor should throw a TypeError '
  + 'if testForExit is not a function',
  () => {
    const executeTest = (testForExit: any) => {
      let caught: Error;
      try {
        new FlowController(
          new Flow().addAction(
            uniqueString(),
            () => new Reply(uniqueString())),
          null,
          { testForExit },
        );
      } catch (err) {
        caught = err;
      }
      expect(caught.constructor).toBe(TypeError);
      expect(caught.message).toBe(
        'testForExit parameter must be a function');
    };

    executeTest('abc');
    executeTest(1);
    executeTest({});
    executeTest(new Reply('Test'));
    executeTest([]);
    executeTest(new Flow());
  },
);


test(
  'FlowController constructor should throw a TypeError '
  + 'if the schema does not use each Flow only once',
  () => {
    const root = new Flow().addAction(
      uniqueString(),
      () => new Reply(uniqueString()));
    let caught: Error;
    try {
      new FlowController(root, new FlowSchema({
        [uniqueString()]: root,
        [uniqueString()]: new FlowSchema({
          [uniqueString()]: root,
        }),
      }));
    } catch (err) {
      caught = err;
    }
    expect(caught.constructor).toBe(TypeError);
    expect(caught.message).toBe(
      `All Flows must be unique. Unexpected duplicate name: ${root.name}`);
  }
);


test('FlowController should take an onInteractionEnd option', () => {
  const root = randomFlow();
  const onInteractionEnd = () => {};
  const fc = new FlowController(root, null, { onInteractionEnd });

  expect(fc.onInteractionEnd).toBe(onInteractionEnd);
});


test(
  'FlowController resolveActionFromState should return null if interaction is complete',
  async () => {
    const fc = new FlowController(randomFlow());
    const req = getMockTwilioWebhookRequest();
    const user = {};
    const state = createSmsCookie();

    state.isComplete = true;
    const result = await fc.resolveActionFromState(req.body.Body, state, user);

    expect(result).toBe(null);
  },
);


test(
  'FlowController resolveActionFromState should test if the user wants to exit the interaction',
  async () => {
    const testForExit = jest.fn();
    const flow = randomFlow();
    const fc = new FlowController(flow, null, {
      testForExit,
    });
    const req = getMockTwilioWebhookRequest();
    const user = {};
    const state = createSmsCookie();

    testForExit.mockResolvedValue(false);
    const result = await fc.resolveActionFromState(req.body.Body, state, user);

    expect(testForExit).toBeCalledTimes(1);
    expect(testForExit).toBeCalledWith(req.body.Body);
    expect(result.name).toBe(flow[FlowSelectActionName](0));
  },
);


test(
  'FlowController resolveActionFromState should return an Exit action '
  + 'if the testForExit test resolves true',
  async () => {
    const testForExit = jest.fn();
    const flow = randomFlow();
    const fc = new FlowController(flow, null, {
      testForExit,
    });
    const req = getMockTwilioWebhookRequest({ body: uniqueString() });
    const user = {};
    const state = createSmsCookie();

    testForExit.mockResolvedValue(true);
    const result = <Exit>(await fc.resolveActionFromState(req.body.Body, state, user));

    expect(result instanceof Exit).toBeTruthy();
    expect(result[GetContext]()).toEqual({ messageBody: req.body.Body });
  }
)


test(
  'FlowController resolveActionFromState should default to the first action '
  + 'of the root if no Flow has been started',
  async () => {
    const replyName = uniqueString();
    const rootReply = new Reply(replyName);
    const resolver = jest.fn();
    const fc = new FlowController(
      new Flow().addAction(replyName, resolver));
    const req = getMockTwilioWebhookRequest();
    const user = {};
    const state = createSmsCookie();

    resolver.mockResolvedValue(rootReply);
    const result = await fc.resolveActionFromState(req.body.Body, state, user);

    expect(resolver).toBeCalledTimes(1);
    expect(resolver).toBeCalledWith(state.flowContext, user);
    expect(result).toBe(rootReply);
    expect(result.name).toBe(replyName);
  },
);


test(
  'FlowController resolveActionFromState should resolve an action in the root flow '
  + 'if the current flow in the SMS cookie is the root',
  async () => {
    const replyName = uniqueString();
    const rootReply = new Reply(replyName);
    const resolver = jest.fn();
    const root = new Flow().addAction(replyName, resolver);
    const fc = new FlowController(root);
    const req = getMockTwilioWebhookRequest();
    const user = {};
    const state = createSmsCookie();

    state.flow = root.name;
    resolver.mockResolvedValue(rootReply);
    const result = await fc.resolveActionFromState(req.body.Body, state, user);

    expect(resolver).toBeCalledTimes(1);
    expect(resolver).toBeCalledWith(state.flowContext, user);
    expect(result).toBe(rootReply);
    expect(result.name).toBe(replyName);
  },
);


test(
  'FlowController resolveActionFromState should resolve the current flow from the schema',
  async () => {
    const replyName = uniqueString();
    const flowReply = new Reply(replyName);
    const flowParentName = uniqueString();
    const flowName = uniqueString();
    const resolver = jest.fn();
    const root = randomFlow();
    const schema = new FlowSchema({
      [uniqueString()]: randomFlow(),
      [flowParentName]: new FlowSchema({
        [flowName]: new Flow().addAction(replyName, resolver),
      }),
    });
    const fc = new FlowController(root, schema);
    const req = getMockTwilioWebhookRequest();
    const user = {};
    const state = createSmsCookie();

    state.flow = `${flowParentName}.${flowName}`;
    resolver.mockResolvedValue(flowReply);
    const result = await fc.resolveActionFromState(req.body.Body, state, user);

    expect(resolver).toBeCalledTimes(1);
    expect(resolver).toBeCalledWith(state.flowContext, user);
    expect(result).toBe(flowReply);
    expect(result.name).toBe(replyName);
  },
);


test(
  'FlowController resolveActionFromState should throw an error '
  + 'if the state specifies a flow not in the schema',
  async () => {
    const root = randomFlow();
    const req = getMockTwilioWebhookRequest();
    const user = {};
    const state = createSmsCookie();
    const fc = new FlowController(root);

    let caught: Error;

    try {
      state.flow = uniqueString();
      await fc.resolveActionFromState(req.body.Body, state, user);
    } catch (err) {
      caught = err;
    }

    expect(caught.constructor).toBe(TypeError);
    expect(caught.message).toBe(
      `Received invalid flow name in SMS cookie: ${state.flow}`);
  },
);


test(
  'FlowController resolveActionFromState should determine '
  + 'which action in the root Flow to resolve',
  async () => {
    const replyName = uniqueString();
    const reply = new Reply(replyName);
    const resolver = jest.fn();
    const root = new Flow().addActions([
      { name: uniqueString(), resolve: () => new Reply(uniqueString()) },
      { name: uniqueString(), resolve: () => new Reply(uniqueString()) },
      { name: replyName, resolve: resolver },
      { name: uniqueString(), resolve: () => new Reply(uniqueString()) },
    ]);
    const fc = new FlowController(root);
    const req = getMockTwilioWebhookRequest();
    const user = {};
    const state = createSmsCookie();

    state.flowKey = 2;
    resolver.mockResolvedValue(reply);
    const result = await fc.resolveActionFromState(req.body.Body, state, user);

    expect(resolver).toBeCalledTimes(1);
    expect(resolver).toBeCalledWith(state.flowContext, user);
    expect(result).toBe(reply);
    expect(result.name).toBe(replyName);
  },
);


test(
  'FlowController resolveActionFromState should determine '
  + 'which action to use in the Flow schema',
  async () => {
    const replyName = uniqueString();
    const reply = new Reply(replyName);
    const resolver = jest.fn();
    const flow = new Flow().addActions([
      { name: uniqueString(), resolve: () => new Reply(uniqueString()) },
      { name: replyName, resolve: resolver },
      { name: uniqueString(), resolve: () => new Reply(uniqueString()) },
      { name: uniqueString(), resolve: () => new Reply(uniqueString()) },
    ]);
    const fc = new FlowController(randomFlow(), new FlowSchema({
      [uniqueString()]: flow,
      [uniqueString()]: randomFlow(),
    }));
    const req = getMockTwilioWebhookRequest();
    const user = {};
    const state = createSmsCookie();

    state.flow = flow.name;
    state.flowKey = 1;
    resolver.mockResolvedValue(reply);
    const result = await fc.resolveActionFromState(req.body.Body, state, user);

    expect(resolver).toBeCalledTimes(1);
    expect(resolver).toBeCalledWith(state.flowContext, user);
    expect(result).toBe(reply);
    expect(result.name).toBe(replyName);
  },
);


test(
  'FlowController resolveActionFromState should return null '
  + 'if there is no action left to take',
  async () => {
    const root = randomFlow();
    const fc = new FlowController(root);
    const req = getMockTwilioWebhookRequest();
    const user = {};
    const state = createSmsCookie();

    state.flowKey = 1;
    let result = await fc.resolveActionFromState(req.body.Body, state, user);

    expect(result).toBe(null);

    root.addAction(uniqueString(), () => new Reply(uniqueString()));
    state.flowKey = 2;
    result = await fc.resolveActionFromState(req.body.Body, state, user);

    expect(result).toBe(null);
  },
);


test(
  'FlowController resolveActionFromState should evaluate the state of a Question action',
  async () => {
    const root = randomFlow();
    const q = new Question(uniqueString());
    const qname = uniqueString();
    const resolver = jest.fn();

    root.addAction(qname, resolver);
    q[QuestionEvaluate] = jest.fn();

    const req = getMockTwilioWebhookRequest();
    const user = {};
    const state = createSmsCookie();
    const fc = new FlowController(root);

    resolver.mockResolvedValue(q);
    state.flowKey = 1;
    const result = await fc.resolveActionFromState(req.body.Body, state, user);

    expect(result).toBe(q);
    expect(q[QuestionEvaluate]).toBeCalledTimes(1);
    expect(q[QuestionEvaluate]).toBeCalledWith(req.body.Body, state);
  },
);


test(
  'FlowController resolveActionFromState should return null '
  + 'if the resolver returns any object that is not an Action',
  async () => {
    const executeTest = async (obj: any) => {
      const root = randomFlow();
      const resolver = jest.fn();

      root.addAction(uniqueString(), resolver);

      const req = getMockTwilioWebhookRequest();
      const user = {};
      const state = createSmsCookie();
      const fc = new FlowController(root);

      resolver.mockResolvedValue(obj);
      state.flowKey = 1;
      const result = await fc.resolveActionFromState(req.body.Body, state, user);

      expect(result).toBe(null);
    };

    await executeTest(uniqueString());
    await executeTest(1);
    await executeTest({});
    await executeTest(() => { });
    await executeTest([]);
    await executeTest(new Buffer(uniqueString()));
  },
);


test(
  'FlowController resolveNextStateFromAction should complete the interaction '
    + 'if it is called with anything other than an action',
  () => {
    const executeTest = (action: any) => {
      const fc = new FlowController(randomFlow());
      const body = uniqueString();
      const state = createSmsCookie();
      const newState = { ...state };

      const completeInteraction = jest.spyOn(SmsCookieModule, 'completeInteraction');

      completeInteraction.mockReturnValue(newState);
      const result = fc.resolveNextStateFromAction(body, state, action);

      expect(completeInteraction).toBeCalledTimes(1);
      expect(completeInteraction).toBeCalledWith(state);
      expect(result).toBe(newState);

      completeInteraction.mockRestore();
    };

    executeTest(1);
    executeTest([]);
    executeTest({});
    executeTest(uniqueString());
    executeTest(() => {});
    executeTest(new Buffer(uniqueString()));
  },
);


test(
  'FlowController resolveNextStateFromAction should end the interaction '
    + 'if it receives an Exit action',
  () => {
    const root = randomFlow();
    const body = uniqueString();
    const state = createSmsCookie();
    const exit = new Exit(uniqueString());
    const fc = new FlowController(root);
    const updatedState = { ...state };
    const newState = { ...state };

    const completeInteraction = jest.spyOn(SmsCookieModule, 'completeInteraction');
    const updateContext = jest.spyOn(SmsCookieModule, 'updateContext');

    updateContext.mockReturnValue(updatedState);
    completeInteraction.mockReturnValue(newState);
    const result = fc.resolveNextStateFromAction(body, state, exit);

    expect(updateContext).toBeCalledTimes(1);
    expect(updateContext).toBeCalledWith(state, root, exit);
    expect(completeInteraction).toBeCalledTimes(1);
    expect(completeInteraction).toBeCalledWith(updatedState);
    expect(result).toBe(newState);

    updateContext.mockRestore();
    completeInteraction.mockRestore();
  },
);


test(
  'FlowController resolveNextStateFromAction should handle an answered Question',
  () => {
    const root = randomFlow();
    const body = uniqueString();
    const state = createSmsCookie();
    const stateWithAttempt = { ...state };
    const updatedState = { ...state };
    const newState = { ...state };
    const q = new Question(uniqueString());
    const fc = new FlowController(root);

    const addQuestionAttempt = jest.spyOn(SmsCookieModule, 'addQuestionAttempt');
    const incrementFlowAction = jest.spyOn(SmsCookieModule, 'incrementFlowAction');
    const updateContext = jest.spyOn(SmsCookieModule, 'updateContext');

    state.question.isAnswering = true;
    q[QuestionSetIsAnswered]();
    addQuestionAttempt.mockReturnValue(stateWithAttempt);
    updateContext.mockReturnValue(updatedState);
    incrementFlowAction.mockReturnValue(newState);
    const result = fc.resolveNextStateFromAction(body, state, q);

    expect(addQuestionAttempt).toBeCalledTimes(1);
    expect(addQuestionAttempt).toBeCalledWith(state, body);
    expect(updateContext).toBeCalledTimes(1);
    expect(updateContext).toBeCalledWith(stateWithAttempt, root, q);
    expect(incrementFlowAction).toBeCalledTimes(1);
    expect(incrementFlowAction).toBeCalledWith(updatedState, root);
    expect(result).toBe(newState);

    addQuestionAttempt.mockRestore();
    incrementFlowAction.mockRestore();
    updateContext.mockRestore();
  },
);


test(
  'FlowController resolveNextStateFromAction should handle a failed Question '
    + 'when it should continue on fail',
  () => {
    const root = randomFlow();
    const body = uniqueString();
    const state = createSmsCookie();
    const stateWithAttempt = { ...state };
    const updatedState = { ...state };
    const newState = { ...state };
    const q = new Question(uniqueString(), { continueOnFailure: true });
    const fc = new FlowController(root);

    const addQuestionAttempt = jest.spyOn(SmsCookieModule, 'addQuestionAttempt');
    const incrementFlowAction = jest.spyOn(SmsCookieModule, 'incrementFlowAction');
    const updateContext = jest.spyOn(SmsCookieModule, 'updateContext');

    state.question.isAnswering = true;
    q[QuestionSetIsFailed]();
    addQuestionAttempt.mockReturnValue(stateWithAttempt);
    updateContext.mockReturnValue(updatedState);
    incrementFlowAction.mockReturnValue(newState);
    const result = fc.resolveNextStateFromAction(body, state, q);

    expect(addQuestionAttempt).toBeCalledTimes(1);
    expect(addQuestionAttempt).toBeCalledWith(state, body);
    expect(updateContext).toBeCalledTimes(1);
    expect(updateContext).toBeCalledWith(stateWithAttempt, root, q);
    expect(incrementFlowAction).toBeCalledTimes(1);
    expect(incrementFlowAction).toBeCalledWith(updatedState, root);
    expect(result).toBe(newState);

    addQuestionAttempt.mockRestore();
    incrementFlowAction.mockRestore();
    updateContext.mockRestore();
  },
);


test(
  'FlowController resolveNextStateFromAction should handle a failed Question '
  + 'when it should not continue on fail',
  () => {
    const root = randomFlow();
    const body = uniqueString();
    const state = createSmsCookie();
    const stateWithAttempt = { ...state };
    const updatedState = { ...state };
    const newState = { ...state };
    const q = new Question(uniqueString());
    const fc = new FlowController(root);

    const addQuestionAttempt = jest.spyOn(SmsCookieModule, 'addQuestionAttempt');
    const completeInteraction = jest.spyOn(SmsCookieModule, 'completeInteraction');
    const updateContext = jest.spyOn(SmsCookieModule, 'updateContext');

    state.question.isAnswering = true;
    q[QuestionSetIsFailed]();
    addQuestionAttempt.mockReturnValue(stateWithAttempt);
    updateContext.mockReturnValue(updatedState);
    completeInteraction.mockReturnValue(newState);
    const result = fc.resolveNextStateFromAction(body, state, q);

    expect(addQuestionAttempt).toBeCalledTimes(1);
    expect(addQuestionAttempt).toBeCalledWith(state, body);
    expect(updateContext).toBeCalledTimes(1);
    expect(updateContext).toBeCalledWith(stateWithAttempt, root, q);
    expect(completeInteraction).toBeCalledTimes(1);
    expect(completeInteraction).toBeCalledWith(updatedState);
    expect(result).toBe(newState);

    addQuestionAttempt.mockRestore();
    completeInteraction.mockRestore();
    updateContext.mockRestore();
  },
);


test(
  'FlowController resolveNextStateFromAction should update context '
    + 'while a Question is being answered',
  () => {
    const root = randomFlow();
    const body = uniqueString();
    const state = createSmsCookie();
    const stateWithAttempt = { ...state };
    const newState = { ...state };
    const q = new Question(uniqueString());
    const fc = new FlowController(root);

    const addQuestionAttempt = jest.spyOn(SmsCookieModule, 'addQuestionAttempt');
    const updateContext = jest.spyOn(SmsCookieModule, 'updateContext');

    state.question.isAnswering = true;
    addQuestionAttempt.mockReturnValue(stateWithAttempt);
    updateContext.mockReturnValue(newState);
    const result = fc.resolveNextStateFromAction(body, state, q);

    expect(addQuestionAttempt).toBeCalledTimes(1);
    expect(addQuestionAttempt).toBeCalledWith(state, body);
    expect(updateContext).toBeCalledTimes(1);
    expect(updateContext).toBeCalledWith(stateWithAttempt, root, q);
    expect(result).toBe(newState);

    addQuestionAttempt.mockRestore();
    updateContext.mockRestore();
  },
);


test('FlowController resolveNextStateFromAction should start an unstarted Question', () => {
  const root = randomFlow();
  const body = uniqueString();
  const state = createSmsCookie();
  const stateStartedQuestion = { ...state };
  const newState = { ...state };
  const q = new Question(uniqueString());
  const fc = new FlowController(root);

  const startQuestion = jest.spyOn(SmsCookieModule, 'startQuestion');
  const updateContext = jest.spyOn(SmsCookieModule, 'updateContext');

  startQuestion.mockReturnValue(stateStartedQuestion);
  updateContext.mockReturnValue(newState);
  const result = fc.resolveNextStateFromAction(body, state, q);

  expect(startQuestion).toBeCalledTimes(1);
  expect(startQuestion).toBeCalledWith(state);
  expect(updateContext).toBeCalledTimes(1);
  expect(updateContext).toBeCalledWith(stateStartedQuestion, root, q);
  expect(result).toBe(newState);

  startQuestion.mockRestore();
  updateContext.mockRestore();
});


test(
  'FlowController resolveNextStateFromAction Trigger should throw a TypeError '
    + 'if there is no defined schema',
  () => {
    const body = uniqueString();
    const state = createSmsCookie();
    const trigger = new Trigger(uniqueString());
    const fc = new FlowController(randomFlow());

    let caught: Error;

    try {
      fc.resolveNextStateFromAction(body, state, trigger);
    } catch (err) {
      caught = err;
    }

    expect(caught.message).toBe(
      'Cannot use Trigger action without a defined Flow schema');
  },
);


test(
  'FlowController resolveNextStateFromAction Trigger should throw a TypeError '
    + 'if the Flow the Trigger starts is not in the schema',
  () => {
    const body = uniqueString();
    const state = createSmsCookie();
    const trigger = new Trigger(uniqueString());
    const fc = new FlowController(randomFlow(), new FlowSchema({
      [uniqueString()]: randomFlow(),
    }));

    let caught: Error;

    try {
      fc.resolveNextStateFromAction(body, state, trigger);
    } catch (err) {
      caught = err;
    }

    expect(caught.message).toBe(
      'Trigger constructors expect a name of an existing Flow');
  },
);


test('FlowController resolveNextStateFromAction should handle Trigger actions', () => {
  const body = uniqueString();
  const state = createSmsCookie();
  const flow1Name = uniqueString();
  const flow2Name = uniqueString();
  const flow1 = randomFlow();
  const flow2 = randomFlow();
  const trigger = new Trigger(flow2Name);
  const fc = new FlowController(randomFlow(), new FlowSchema({
    [flow1Name]: flow1,
    [flow2Name]: flow2,
  }));
  const updatedState = { ...state };
  const newState = { ...state };

  const updateContext = jest.spyOn(SmsCookieModule, 'updateContext');
  const handleTrigger = jest.spyOn(SmsCookieModule, 'handleTrigger');

  state.flow = flow1Name;
  updateContext.mockReturnValue(updatedState);
  handleTrigger.mockReturnValue(newState);
  const result = fc.resolveNextStateFromAction(body, state, trigger);

  expect(updateContext).toBeCalledTimes(1);
  expect(updateContext).toBeCalledWith(state, flow1, trigger);
  expect(handleTrigger).toBeCalledTimes(1);
  expect(handleTrigger).toBeCalledWith(updatedState, trigger);
  expect(result).toBe(newState);

  updateContext.mockRestore();
  handleTrigger.mockRestore();
});


test(
  'FlowController resolveNextStateFromAction should increment the flow action '
    + 'and update the context by default',
  () => {
    const body = uniqueString();
    const state = createSmsCookie();
    const root = randomFlow();
    const fc = new FlowController(root);
    const updatedState = { ...state };
    const newState = { ...state };
    const reply = new Reply(uniqueString());

    const updateContext = jest.spyOn(SmsCookieModule, 'updateContext');
    const incrementFlowAction = jest.spyOn(SmsCookieModule, 'incrementFlowAction');

    updateContext.mockReturnValue(updatedState);
    incrementFlowAction.mockReturnValue(newState);
    const result = fc.resolveNextStateFromAction(body, state, reply);

    expect(updateContext).toBeCalledTimes(1);
    expect(updateContext).toBeCalledWith(state, root, reply);
    expect(incrementFlowAction).toBeCalledTimes(1);
    expect(incrementFlowAction).toBeCalledWith(updatedState, root);
    expect(result).toBe(newState);

    updateContext.mockRestore();
    incrementFlowAction.mockRestore();
  },
);
