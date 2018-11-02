import {
  Router,
  Response,
} from 'express';
import * as cookieParser from 'cookie-parser';

import { getSha256Hash } from './util';
import TwilioController, {
  TwilioControllerArgs,
  TwilioWebhookRequest,
} from './TwilioController';
import {
  ExitKeywordTest,
  Flow,
  FlowController,
  FlowSchema,
} from './Flows';
import { Question } from './Actions';

export {
  Flow,
  FlowSchema,
} from './Flows';
export {
  Message,
  Question,
  Trigger,
  Reply,
} from './Actions';


type UserContextGetter = (from: string) => any;


async function handleIncomingSmsWebhook(
  getUserContext: UserContextGetter,
  fc: FlowController,
  tc: TwilioController,
  req: TwilioWebhookRequest,
  res: Response,
) {
  try {
    const userCtx = await getUserContext(req.body.From);

    let state = tc.getSmsCookeFromRequest(req);
    let action = await fc.deriveActionFromState(req, state, userCtx);

    while (action !== null) {
      await tc.handleAction(req, state, action);
      await new Promise(resolve => setTimeout(resolve, 1000));

      state = await fc.deriveNextStateFromAction(req, state, action);
      if (
        (state === null)
        || (action instanceof Question && !action.isComplete)
      ) break;
      action = await fc.deriveActionFromState(req, state, userCtx);
      if (action === null) state = null;
    }

    if (state) {
      tc.setSmsCookie(res, state);
    } else {
      tc.clearSmsCookie(res);
    }

    tc.sendEmptyResponse(res);
  } catch (err) {
    // TODO errors?
    console.log(err);
    tc.sendEmptyResponse(res);
  }
}

interface TwillyParams extends TwilioControllerArgs {
  cookieSecret?: string;
  getUserContext?: UserContextGetter;
  inboundMessagePath: string;
  root: Flow,
  schema?: FlowSchema,
  sendOnExit: string;
  testForExit?: ExitKeywordTest;
}


export function twilly({
  accountSid,
  authToken,
  messageServiceId,

  getUserContext = () => null,

  root,
  schema,

  cookieSecret = null,
  cookieKey = null,

  sendOnExit = 'Goodbye.',
  testForExit = null,
}: TwillyParams): Router {
  if (!cookieKey) {
    cookieKey = getSha256Hash(accountSid, accountSid).slice(0, 10);
  }
  if (!cookieSecret) {
    cookieSecret = getSha256Hash(accountSid, authToken);
  }

  const fc = new FlowController(root, schema);
  const tc = new TwilioController({
    accountSid,
    authToken,
    cookieKey,
    messageServiceId,
    sendOnExit,
  });
  const router = Router();

  if (testForExit) {
    fc.setTestForExit(testForExit);
  }
  router.use(cookieParser(cookieSecret));
  router.post('/', handleIncomingSmsWebhook.bind(null, getUserContext, fc, tc));
  return router;
}
