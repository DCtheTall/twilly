import {
  ROOT,
  EvaluatedSchema,
  Flow,
  FlowSchema,
  evaluateSchema,
} from '../../../src/Flows';
import { uniqueString } from '../../../src/util';
import { Reply } from '../../../src/Actions';


function newMockFlow(): Flow {
  const flow = new Flow();
  return flow.addAction(
    uniqueString(), () => new Reply(uniqueString()));
}


test('evaluateSchema base case: a schema with one Flow', () => {
  const root = new Flow();
  const flow = newMockFlow();
  const flowName = uniqueString();

  let result: EvaluatedSchema;
  let caught: Error;

  try {
    result = evaluateSchema(
      root,
      new FlowSchema({ [flowName]: flow }),
    );
  } catch (err) {
    caught = err;
  }
  expect(caught).toBe(undefined);
  expect(result instanceof Map).toBe(true);
  expect(result.get(ROOT)).toBe(root);
  expect(flow.name).toBe(flowName);
  expect(result.get(flowName)).toBe(flow);
});


test('evaluateSchema test: evaluating multiple flows in schema', () => {
  const root = new Flow();
  const flowNames = [...Array(3)].map(() => uniqueString());
  const flows = [...Array(3)].map(() => newMockFlow());

  let result: EvaluatedSchema;
  let caught: Error;

  try {
    result = evaluateSchema(
      root,
      new FlowSchema({
        [flowNames[0]]: flows[0],
        [flowNames[1]]: flows[1],
        [flowNames[2]]: flows[2],
      }),
    );
  } catch (err) {
    caught = err;
  }
  expect(caught).toBe(undefined);
  expect(result instanceof Map).toBe(true);
  expect(result.get(root.name)).toBe(root);
  [...Array(3)].map(
    (_, i: number) => expect(result.get(flowNames[i])).toBe(flows[i]));
});


test('evaluateSchema test: evaluating a nested schema', () => {
  const root = new Flow();

  const flow1Name = uniqueString();
  const flow1 = newMockFlow();

  const parentKey1 = uniqueString();
  const flow2Name = uniqueString();
  const flow2 = newMockFlow();

  const parentKey2 = uniqueString();
  const flow3Name = uniqueString();
  const flow3 = newMockFlow();

  let result: EvaluatedSchema;
  let caught: Error;

  try {
    result = evaluateSchema(
      root,
      new FlowSchema({
        [flow1Name]: flow1,
        [parentKey1]: new FlowSchema({
          [flow2Name]: flow2,
          [parentKey2]: new FlowSchema({
            [flow3Name]: flow3,
          }),
        }),
      }),
    );
  } catch (err) {
    caught = err;
  }
  expect(caught).toBe(undefined);
  expect(result instanceof Map).toBe(true);
  expect(result.get(ROOT)).toBe(root);
  expect(result.get(flow1Name)).toBe(flow1);
  expect(result.get(`${parentKey1}.${flow2Name}`)).toBe(flow2);
  expect(result.get(`${parentKey1}.${parentKey2}.${flow3Name}`)).toBe(flow3);
});


test(
  'evaluateSchema should throw a TypeError '
  + 'if any Flows in the schema perform no actions',
  () => {
    const root = new Flow();
    const flow = new Flow();

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
    expect(caught.constructor).toBe(TypeError);
    expect(caught.message).toBe(
      `All Flows must perform at least one action. Check flow: ${flow.name}`);
  },
);


test('evaluateSchema should throw a TypeError when it receives an empty schema', () => {
  const root = new Flow();

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
  expect(caught.constructor).toBe(TypeError);
  expect(caught.message).toBe(
    'All FlowSchemas must contain at least one Flow object');
});
