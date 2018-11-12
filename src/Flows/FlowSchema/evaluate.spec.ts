import { evaluateSchema, EvaluatedSchema } from './evaluate';
import FlowSchema from '.';
import Flow from '../Flow';
import { uniqueString } from '../../util';
import { Reply } from '../../Actions';


function newMockFlow(name = uniqueString()): Flow {
  const flow = new Flow(name);
  return flow.addAction(
    uniqueString(), () => new Reply(uniqueString()));
}


test('evaluateSchema base case: a schema with one Flow', () => {
  const root = new Flow(uniqueString());
  const flow = newMockFlow();

  let result: EvaluatedSchema;
  let caught: Error;

  try {
    result = evaluateSchema(
      root,
      new FlowSchema({ [flow.name]: flow }),
    );
  } catch (err) {
    caught = err;
  }
  expect(caught).toBe(undefined);
  expect(result instanceof Map).toBe(true);
  expect(result.get(root.name)).toBe(root);
  expect(result.get(flow.name)).toBe(flow);
});


test('evaluateSchema test: evaluating multiple flows in schema', () => {
  const root = new Flow(uniqueString());
  const flow1 = newMockFlow();
  const flow2 = newMockFlow();
  const flow3 = newMockFlow();

  let result: EvaluatedSchema;
  let caught: Error;

  try {
    result = evaluateSchema(
      root,
      new FlowSchema({
        [flow1.name]: flow1,
        [flow2.name]: flow2,
        [flow3.name]: flow3,
      }),
    );
  } catch (err) {
    caught = err;
  }
  expect(caught).toBe(undefined);
  expect(result instanceof Map).toBe(true);
  expect(result.get(root.name)).toBe(root);
  expect(result.get(flow1.name)).toBe(flow1);
  expect(result.get(flow2.name)).toBe(flow2);
  expect(result.get(flow3.name)).toBe(flow3);
});

test('evaluateSchema test: evaluating a nested schema', () => {
  const root = new Flow(uniqueString());
  const flow1 = newMockFlow();
  const flow2 = newMockFlow();
  const flow3 = newMockFlow();

  let result: EvaluatedSchema;
  let caught: Error;

  try {
    result = evaluateSchema(
      root,
      new FlowSchema({
        [flow1.name]: flow1,
        [uniqueString()]: new FlowSchema({
          [flow2.name]: flow2,
          [uniqueString()]: new FlowSchema({
            [flow3.name]: flow3,
          }),
        }),
      }),
    );
  } catch (err) {
    caught = err;
  }
  expect(caught).toBe(undefined);
  expect(result instanceof Map).toBe(true);
  expect(result.get(root.name)).toBe(root);
  expect(result.get(flow1.name)).toBe(flow1);
  expect(result.get(flow2.name)).toBe(flow2);
  expect(result.get(flow3.name)).toBe(flow3);
});


test(
  'evaluateSchema test: FlowSchemas can share flow name keys '
  + 'if they point to the same Flow',
  () => {
    const root = new Flow(uniqueString());
    const flow1 = newMockFlow();
    const flow2 = newMockFlow();

    let result: EvaluatedSchema;
    let caught: Error;

    try {
      result = evaluateSchema(
        root,
        new FlowSchema({
          [flow1.name]: flow1,
          [uniqueString()]: new FlowSchema({
            [flow2.name]: flow2,
          }),
          [uniqueString()]: new FlowSchema({
            [flow2.name]: flow2,
          }),
        }),
      );
    } catch (err) {
      caught = err;
    }
    expect(caught).toBe(undefined);
    expect(result instanceof Map).toBe(true);
    expect(result.size).toBe(3);
    expect(result.get(root.name)).toBe(root);
    expect(result.get(flow1.name)).toBe(flow1);
    expect(result.get(flow2.name)).toBe(flow2);
  },
);


test(
  'evaluateSchema should throw a TypeError if '
    + 'there are two distinct flows with the same name',
  () => {
    const root = new Flow(uniqueString());
    const flowName = uniqueString();
    const flow1 = newMockFlow(flowName);
    const flow2 = newMockFlow(flowName);

    let caught: Error;

    try {
      evaluateSchema(
        root,
        new FlowSchema({
          [flowName]: flow1,
          [uniqueString()]: new FlowSchema({
            [flowName]: flow2,
          }),
        }),
      );
    } catch (err) {
      caught = err;
    }
    expect(caught instanceof TypeError).toBeTruthy();
    expect(caught.message).toBe(
      `All Flows must have unique names. Unexpected duplicate name: ${flowName}`);
  },
);

test(
  'evaluateSchema should throw a TypeError '
  + 'if any Flows in the schema perform no actions',
  () => {
    const root = new Flow(uniqueString());
    const flow = new Flow(uniqueString());

    let caught: Error;

    try {
      evaluateSchema(
        root,
        new FlowSchema({
          [flow.name]: flow,
        }),
      );
    } catch (err) {
      caught = err;
    }
    expect(caught instanceof TypeError).toBeTruthy();
    expect(caught.message).toBe(
      `All Flows must perform at least one action. Check flow: ${flow.name}`);
  },
);


test('evaluateSchema should throw a TypeError when it receives an empty schema', () => {
  const root = new Flow(uniqueString());
  const flow = new Flow(uniqueString());

  let caught: Error;

  try {
    evaluateSchema(
      root,
      new FlowSchema({
        [uniqueString()]: new FlowSchema({}),
      }),
    );
  } catch (err) {
    caught = err;
  }
  expect(caught instanceof TypeError).toBeTruthy();
  expect(caught.message).toBe(
    'All FlowSchemas must contain at least one Flow object');
});
