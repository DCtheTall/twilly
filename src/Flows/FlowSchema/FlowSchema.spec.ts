import FlowSchema from '.';
import Flow, { FlowActionResolver } from '../Flow';
import { uniqueString } from '../../util';


test('FlowSchema base case: one added Flow', () => {
  const f =
    new Flow(uniqueString()).addAction(
      uniqueString(),
      <FlowActionResolver>(() => null));
  const schemaDef = { [uniqueString()]: f };
  let caught: Error;
  try {
    new FlowSchema(schemaDef);
  } catch (err) {
    caught = err;
  }
  expect(caught).toBe(undefined);
});


test('FlowSchema should allow multiple uniquely named flows', () => {
  const f1 =
    new Flow(uniqueString()).addAction(
      uniqueString(),
      <FlowActionResolver>(() => null));
  const f2 =
    new Flow(uniqueString()).addAction(
      uniqueString(),
      <FlowActionResolver>(() => null));
  const schemaDef = {
    [uniqueString()]: f1,
    [uniqueString()]: f2,
  };
  let caught: Error;
  try {
    new FlowSchema(schemaDef);
  } catch (err) {
    caught = err;
  }
  expect(caught).toBe(undefined);
});


test('FlowSchema should allow nesting with other FlowSchema instances', () => {
  const f1 =
    new Flow(uniqueString()).addAction(
      uniqueString(),
      <FlowActionResolver>(() => null));
  const f2 =
    new Flow(uniqueString()).addAction(
      uniqueString(),
      <FlowActionResolver>(() => null));
  let caught: Error;
  try {
    const innerSchema = new FlowSchema({ [uniqueString()]: f1 });
    new FlowSchema({
      [uniqueString()]: f2,
      [uniqueString()]: innerSchema,
    });
  } catch (err) {
    caught = err;
  }
  expect(caught).toBe(undefined);
});


test('FlowSchema should only accept objects as its constructor argument', () => {
  const executeTest = (schemaDef: any) => {
    let caught: Error;
    try {
      new FlowSchema(schemaDef);
    } catch (err) {
      caught = err;
    }
    expect(caught.constructor).toBe(TypeError);
    expect(caught.message).toBe(
      'The argument of the flow schema constructor must be an object');
  };

  executeTest(1);
  executeTest('');
  executeTest(() => {});
  executeTest(null);
  executeTest([]);
});


test('FlowSchema should only allow keys to be set to FlowSchemas or Flows', () => {
  const executeTest = (flow: any) => {
    let caught: Error;
    try {
      new FlowSchema({ [uniqueString()]: flow });
    } catch (err) {
      caught = err;
    }
    expect(caught.constructor).toBe(TypeError);
    expect(caught.message).toBe(
      'Each key of a FlowSchema must be a Flow or another FlowSchema');
  };

  executeTest(1);
  executeTest('');
  executeTest({});
  executeTest([]);
  executeTest(() => {});
  executeTest(undefined);
  executeTest(null);
});
