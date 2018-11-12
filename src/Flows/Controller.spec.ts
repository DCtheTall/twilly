import FlowController from './Controller';
import Flow from './Flow';
import FlowSchema from './FlowSchema';
import { Reply } from '../Actions';
import { uniqueString } from '../util';
import { exec } from 'child_process';


test('FlowController base case: root flow with one action', () => {
  let caught: Error;
  try {
    new FlowController(
      new Flow(uniqueString()).addAction(
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
      expect(caught instanceof TypeError).toBeTruthy();
      expect(caught.message).toBe(
        'root parameter must be an instance of Flow');
    };

    executeTest('');
    executeTest(1);
    executeTest(null);
    executeTest(undefined);
    executeTest({});
    executeTest(() => {});
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
        new Flow(uniqueString()));
    } catch (err) {
      caught = err;
    }
    expect(caught instanceof TypeError).toBeTruthy();
    expect(caught.message).toBe(
      'All Flows must perform at least one action. Check the root Flow');
  },
);


test('FlowController schema parameter: base case', () => {
  let caught: Error;
  try {
    new FlowController(
      new Flow(uniqueString()).addAction(
        uniqueString(),
        () => new Reply(uniqueString())),
      new FlowSchema({
        [uniqueString()]: new Flow(uniqueString()).addAction(
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
          new Flow(uniqueString()).addAction(
            uniqueString(),
            () => new Reply(uniqueString())),
          schema,
        );
      } catch (err) {
        caught = err;
      }
      expect(caught instanceof TypeError).toBeTruthy();
      expect(caught.message).toBe(
        'schema parameter must be an instance of FlowSchema');
    };

    executeTest('');
    executeTest(1);
    executeTest(null);
    executeTest({});
    executeTest(() => { });
    executeTest([]);
    executeTest(new Flow(uniqueString()));
  },
);


test(
  'FlowController constructor should throw a TypeError '
    + 'if the schema does not define any Flows distinct from the root',
  () => {
    const root = new Flow(uniqueString()).addAction(
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
    expect(caught instanceof TypeError).toBeTruthy();
    expect(caught.message).toBe(
      'If you provide the schema parameter, it must include a flow distinct from the root Flow');
  }
);


// test optional params with type checking
// test getCurrentFlow and different cases
// test resolveActionFromState
// test resolveNextStateFromAction
