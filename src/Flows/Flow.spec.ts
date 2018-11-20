import Flow, {
  FlowSelectActionResolver,
  FlowSelectName,
  FlowSetName,
} from './Flow';
import { Action } from '../Actions';
import { uniqueString } from '../util';


test('Flow constructor test', () => {
  let caught: Error;
  try {
    new Flow();
  } catch (err) {
    caught = err;
  }
  expect(caught).toBe(undefined);
});


test('Flow setName should set name property', () => {
  const name = uniqueString();
  const flow = new Flow();

  flow[FlowSetName](name);

  expect(flow.name).toBe(name);
});


test(
  'Flow setName should throw an error '
    + 'if it does not receive an empty string.',
  () => {
    const executeTest = (name: any) => {
      let caught;
      try {
        new Flow()[FlowSetName](name);
      } catch (err) {
        caught = err;
      }
      expect(caught.constructor).toBe(TypeError);
      expect(caught.message).toBe(
        'Flow constructor expects a non-empty string as the first argument');
    };

    executeTest('');
    executeTest(1);
    executeTest(null);
    executeTest([]);
    executeTest(false);
    executeTest({});
  },
);


test('Flow addAction should store the action name and resolver', () => {
  const flow = new Flow();
  const name = uniqueString();
  const resolve = <() => Action>(() => null);

  flow.addAction(name, resolve);
  expect(flow[FlowSelectName](0)).toBe(name);
  expect(flow[FlowSelectActionResolver](0)).toBe(resolve);
});


test('Flow addAction should modify the flow\'s length', () => {
  const flow = new Flow();

  expect(flow.length).toBe(0);
  flow.addAction('test', () => null);
  expect(flow.length).toBe(1);
});


test('Flow addAction should throw a TypeError if the first argument is not a non-empty string', () => {
  const executeTest = (name: any) => {
    let caught: Error;
    try {
      const flow = new Flow();
      flow.addAction(name, <() => Action>(() => null));
    } catch (err) {
      caught = err;
    }
    expect(caught.constructor).toBe(TypeError);
    expect(caught.message).toBe(
      'Flow addAction expects a non-empty string as the first argument');
  };

  executeTest('');
  executeTest(1);
  executeTest([]);
  executeTest({});
  executeTest(false);
  executeTest(null);
  executeTest(() => {});
});


test('Flow addAction duplicate action names should throw a TypeError', () => {
  const f = new Flow();
  const name = uniqueString();

  let caught: Error;
  try {
    f.addAction(name, <() => Action>(() => null));
    f.addAction(name, <() => Action>(() => null));
  } catch (err) {
    caught = err;
  }
  expect(caught.constructor).toBe(TypeError);
  expect(caught.message).toBe(
    `Every Flow's action names must be unique. Unexpected duplicate name: ${name}`);
});


test('Flow addAction should throw a TypeError if the second argument is not a function', () => {
  const executeTest = (resolve: any) => {
    let caught: Error;
    try {
      const flow = new Flow();
      flow.addAction(uniqueString(), resolve);
    } catch (err) {
      caught = err;
    }
    expect(caught.constructor).toBe(TypeError);
    expect(caught.message).toBe(
      'Flow addAction expects a function as the second argument');
  };

  executeTest('');
  executeTest(1);
  executeTest([]);
  executeTest({});
  executeTest(false);
  executeTest(null);
});


test('Flow addActions should add multiple actions at once to the flow', () => {
  const f = new Flow();
  const names = [uniqueString(), uniqueString()];
  const resolvers = [
    <() => Action>(() => null),
    <() => Action>(() => null),
  ];
  f.addActions(
    { name: names[0], resolve: resolvers[0] },
    { name: names[1], resolve: resolvers[1] },
  );

  expect(f.length).toBe(2);
  expect(f[FlowSelectActionResolver](0)).toBe(resolvers[0]);
  expect(f[FlowSelectActionResolver](1)).toBe(resolvers[1]);
  expect(f[FlowSelectName](0)).toBe(names[0]);
  expect(f[FlowSelectName](1)).toBe(names[1]);
});


test('Flow addActions should take an array of actions', () => {
  const f = new Flow();
  const names = [uniqueString(), uniqueString()];
  const resolvers = [
    <() => Action>(() => null),
    <() => Action>(() => null),
  ];
  f.addActions([
    { name: names[0], resolve: resolvers[0] },
    { name: names[1], resolve: resolvers[1] },
  ]);

  expect(f.length).toBe(2);
  expect(f[FlowSelectActionResolver](0)).toBe(resolvers[0]);
  expect(f[FlowSelectActionResolver](1)).toBe(resolvers[1]);
  expect(f[FlowSelectName](0)).toBe(names[0]);
  expect(f[FlowSelectName](1)).toBe(names[1]);
});


test('Flow addActions should throw a TypeError if an invalid name is provided', () => {
  const executeTest = (param: any) => {
    const f = new Flow();
    let caught: Error;
    try{
      f.addActions(param);
    } catch (err) {
      caught = err;
    }
    expect(caught.constructor).toBe(TypeError);
    expect(caught.message).toBe(
      'Flow addActions expects an array of objects with a name property set to a non-empty string');
  }

  const resolve = <() => Action>(() => null);
  executeTest({ name: 1, resolve });
  executeTest({ name: '', resolve });
  executeTest({ resolve });
  executeTest(1);
  executeTest(null);
  executeTest({});
  executeTest([[]]);
  executeTest(() => {});
});


test('Flow addActions should throw a TypeError', () => {
  const f = new Flow();
  let caught: Error;
  const isTypeError =
    () => expect(
      caught instanceof TypeError).toBeTruthy();
  const testMessage =
    () => expect(caught.message).toBe(
      'Flow addActions must add at least one action to the flow');

  try {
    f.addActions();
  } catch (err) {
    caught = err;
  }
  isTypeError();
  testMessage();

  try {
    f.addActions([]);
  } catch (err) {
    caught = err;
  }
  isTypeError();
  testMessage();
});


// TODO test FlowSelectActionResolver, FlowSelectName
