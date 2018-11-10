import Reply from './Reply';
import { GetContext } from './Action';
import { uniqueString } from '../util';


test('Reply should set constructor argument as body property', () => {
  const body = uniqueString();
  const reply = new Reply(body);

  expect(reply.body).toBe(body);
});


test(
  'Reply should throw a TypeError if the '
    + 'constructor argument is not a non-empty string',
  () => {
    let caught: Error;
    const executeTest = (body: any) => {
      try {
        new Reply(body);
      } catch (err) {
        caught = err;
      }
      expect(caught instanceof TypeError).toBeTruthy();
      expect(caught.message).toBe(
        'Reply constructor expects a non-empty string as the first argument');
    }

    executeTest(1);
    executeTest('');
    executeTest({});
    executeTest([]);
    executeTest(false);
    executeTest(() => {});
  },
);


test('Reply should contain body in the context', () => {
  const body = uniqueString();
  const reply = new Reply(body);

  expect(reply[GetContext]()).toEqual({ body });
});
