import {
  Exit,
  GetContext,
  ActionGetContext,
} from '../../src/Actions';
import { uniqueString } from '../../src/util';


test('Exit should set its messageBody with the constructor and it should be saved to context', () => {
  const messageBody = uniqueString();
  const exit = new Exit(messageBody);

  expect(exit[GetContext]()).toEqual({ messageBody });
  expect(exit[ActionGetContext]()).toHaveProperty('type', 'Exit');
});
