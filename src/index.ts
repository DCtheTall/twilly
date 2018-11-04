import { Router, Response } from 'express';
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
  InteractionEndHook,
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


const DEFAULT_EXIT_TEXT = 'Goodbye.';


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

      state = await fc.deriveNextStateFromAction(req, state, userCtx, action);
      if (
        (state.isComplete)
        || (action instanceof Question && !action.isComplete)
      ) break;
      action = await fc.deriveActionFromState(req, state, userCtx);
      if (action === null) break
    }

    if (state.isComplete) {
      fc.onInteractionEnd(state.context, userCtx);
      tc.clearSmsCookie(res);
    } else {
      tc.setSmsCookie(res, state);
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
  onInteractionEnd?: InteractionEndHook;
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

  onInteractionEnd = null,

  root,
  schema = null,

  cookieSecret = null,
  cookieKey = null,

  sendOnExit = DEFAULT_EXIT_TEXT,
  testForExit = null,
}: TwillyParams): Router {
  if (!cookieKey) {
    cookieKey = getSha256Hash(accountSid, accountSid).slice(0, 10);
  }
  if (!cookieSecret) {
    cookieSecret = getSha256Hash(accountSid, authToken);
  }

  const fc = new FlowController(root, schema, {
    testForExit,
    onInteractionEnd,
  });
  const tc = new TwilioController({
    accountSid,
    authToken,
    cookieKey,
    messageServiceId,
    sendOnExit,
  });
  const router = Router();

  router.use(cookieParser(cookieSecret));
  router.post(
    '/', handleIncomingSmsWebhook.bind(null, getUserContext, fc, tc));
  return router;
}
