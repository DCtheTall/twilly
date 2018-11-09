import Message from './Message';
import { GetContext } from './Action';
import { uniqueString } from '../util';


test('Message should set the to and body in the constructor', () => {
  const to = [uniqueString(), uniqueString()];
  const body = uniqueString();
  const msg = new Message(to, body);

  expect(msg.to).toBe(to);
  expect(msg.body).toBe(body);
});

test('Message should throw a TypeError if the 1st constructor argument is not a string or array of strings', () => {
  const body = uniqueString();

  let to: any = 1;
  let caught: Error;

  try {
    new Message(to, body);
  } catch (err) {
    caught = err;
  }

  expect(caught instanceof TypeError).toBeTruthy();
  expect(caught.message).toBe(
    'Message constructor expects a string or an array of strings as the first argument');

  to = [1, 'str'];
  try {
    new Message(to, body);
  } catch (err) {
    caught = err;
  }

  expect(caught instanceof TypeError).toBeTruthy();
  expect(caught.message).toBe(
    'Message constructor expects a string or an array of strings as the first argument');
});

test('Message should throw a TypeError if the 2nd constructor argument is not a string', () => {
  const to = uniqueString();
  const body = <any>['a', 'b'];

  let caught: Error;

  try {
    new Message(to, body);
  } catch (err) {
    caught = err;
  }

  expect(caught instanceof TypeError).toBeTruthy();
  expect(caught.message).toBe(
    'Message constructor expects a string as the second argument');
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
});
