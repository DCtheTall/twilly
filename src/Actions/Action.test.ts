import Action, {
  ActionGetContext,
  ActionSetMessageSid,
  ActionSetMessageSids,
  ActionSetName,
} from './Action';
import { uniqueString } from '../util';

test('Action should not have a name when it is instantiated', () => {
  const action = new Action();

  expect(action.name).toBe(undefined);
});

test('Action should be able to set name using ActionSetName symbol', () => {
  const action = new Action();
  const name = uniqueString();

  action[ActionSetName](name);
  expect(action.name).toBe(name);
});
