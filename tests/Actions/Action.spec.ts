import Action, {
  ActionGetContext,
  ActionSetMessageSid,
  ActionSetMessageSids,
  ActionSetName,
  GetContext,
} from '../../src/Actions/Action';
import { uniqueString } from '../../src/util';


test('Action should not have a name or any sid when it is instantiated', () => {
  const action = new Action();

  expect(action.name).toBe(undefined);
  expect(action.sid).toBe(undefined);
});


test('Action should be able to set name using ActionSetName symbol', () => {
  const action = new Action();
  const name = uniqueString();

  action[ActionSetName](name);
  expect(action.name).toBe(name);
});


test('ActionSetMessageSid symbol should save message sid', () => {
  const action = new Action();
  const sid = uniqueString();

  action[ActionSetMessageSid](sid);
  expect(action.sid).toBe(sid);
});

test('ActionSetMessageSids symbol should save message sids', () => {
  const action = new Action();
  const sids = [uniqueString(), uniqueString()];

  action[ActionSetMessageSids](sids);
  expect(action.sid).toBe(sids);
});


test('Action should be able to get context', () => {
  const action = new Action();
  const name = uniqueString();
  const sids = [uniqueString(), uniqueString()];

  action[ActionSetName](name);
  action[ActionSetMessageSids](sids);
  action[GetContext] = () => ({});

  const ctx = action[ActionGetContext]();

  expect(ctx).toHaveProperty('actionName', name);
  expect(ctx).toHaveProperty('type', 'Action');
  expect(ctx).toHaveProperty('createdAt');
  expect(ctx.createdAt.constructor).toBe(Date);
});
