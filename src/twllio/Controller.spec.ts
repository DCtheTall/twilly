import TwilioController, { TwilioControllerArgs } from './Controller';
import { uniqueString } from '../util';


test('TwilioController should type check its arguments', () => {
  const args = <TwilioControllerArgs>{
    accountSid: uniqueString(),
    authToken: uniqueString(),
    cookieKey: uniqueString(),
    messageServiceId: uniqueString(),
    sendOnExit: uniqueString(),
  };

  let executeTest: (object: any) => void;

  const selectOption =
    (option: string) => (executeTest = ((object: any) => {
      let caught: Error;

      args[option] = object;
      try {
        new TwilioController(args);
      } catch (err) {
        caught = err;
      }
      args[option] = uniqueString();

      expect(caught.constructor).toBe(TypeError);
      expect(caught.message).toBe(
        `${option} twilly option must be a non-empty string`);
    }));
  const executeTests =
    () =>
      executeTest('')
      || executeTest(1)
      || executeTest({})
      || executeTest([])
      || executeTest(() => { })
      || executeTest(null);

  Object.keys(args).map((option: string) => {
    selectOption(option);
    executeTests();
  });
});
