import Message from './Message';
import { ActionGetContext, GetContext } from './Action';
import { uniqueString } from '../util';


test('Message should set the to and body in the constructor', () => {
  const to = [uniqueString(), uniqueString()];
  const body = uniqueString();
  const msg = new Message(to, body);

  expect(msg.to).toBe(to);
  expect(msg.body).toBe(body);
});


test('Message should throw a TypeError if the 1st constructor argument is not a string, an empty string, or array of strings', () => {
  const body = uniqueString();
  const executeTest = (to: any) => {
    let caught: Error;

    try {
      new Message(to, body);
    } catch (err) {
      caught = err;
    }
    expect(caught instanceof TypeError).toBeTruthy();
    expect(caught.message).toBe(
      'Message constructor expects a non-empty string or an array of non-empty strings as the first argument');
  }

  executeTest(1);
  executeTest([1, 'str']);
  executeTest('');
  executeTest(['a', '']);
});


test('Message should throw a TypeError if the 2nd constructor argument is not a string', () => {
  const to = uniqueString();
  const executeTest = (body: any) => {
    let caught: Error;
    try {
      new Message(to, body);
    } catch (err) {
      caught = err;
    }
    expect(caught instanceof TypeError).toBeTruthy();
    expect(caught.message).toBe(
      'Message constructor expects a non-empty string as the second argument');
  }

  executeTest(['a', 'b']);
  executeTest('');
});


test('Message.to should always be an array of strings', () => {
  const body = uniqueString();
  let to: string | string[] = uniqueString();

  const msg1 = new Message(to, body);
  expect(msg1.to).toEqual([to]);

  to = [uniqueString(), uniqueString()];
  const msg2 = new Message(to, body);
  expect(msg2.to).toBe(to);
});


test('Message should record its to and body properties when getting context', () => {
  const to = uniqueString();
  const body = uniqueString();
  const msg = new Message(to, body);

  expect(msg[GetContext]()).toEqual({
    to: [to],
    body,
  });
  expect(msg[ActionGetContext]()).toHaveProperty('type', 'Message');
});
