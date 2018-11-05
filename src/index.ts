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
import {
  Message,
  Question,
} from './Actions';
import { InteractionContext } from './SmsCookie';

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
type OnMessageHook =
  (context: InteractionContext, user: any, messageBody: string) => any;


async function handleIncomingSmsWebhook(
  getUserContext: UserContextGetter,
  onMessage: OnMessageHook,
  fc: FlowController,
  tc: TwilioController,
  req: TwilioWebhookRequest,
  res: Response,
) {
  try {
    const userCtx = await getUserContext(req.body.From);

    let state = tc.getSmsCookeFromRequest(req);
    let action = await fc.deriveActionFromState(req, state, userCtx);

    if (onMessage) {
      try {
        const result = await onMessage(
          state.context, userCtx, req.body.Body);
        if (result instanceof Message) {
          await tc.sendOnMessageNotification(result);
        }
      } catch (err) {
        // error handling
        throw err;
      }
    }

    while (action !== null) {
      await tc.handleAction(req, state, action);
      await new Promise(resolve => setTimeout(resolve, 1000)); // for preserving message order

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

interface TwillyParameters extends TwilioControllerArgs {
  cookieSecret?: string;
  getUserContext?: UserContextGetter;
  onInteractionEnd?: InteractionEndHook;
  onMessage?: OnMessageHook;
  root: Flow,
  schema?: FlowSchema,
  sendOnExit: string;
  testForExit?: ExitKeywordTest;
}

const defaultParameters = <TwillyParameters>{
  cookieKey: null,
  cookieSecret: null,
  getUserContext: <UserContextGetter>(() => null),
  onInteractionEnd: null,
  onMessage: null,
  schema: null,
  sendOnExit: DEFAULT_EXIT_TEXT,
  testForExit: null,
};

export function twilly({
  accountSid,
  authToken,
  messageServiceId,

  cookieKey = defaultParameters.cookieKey,
  cookieSecret = defaultParameters.cookieSecret,

  getUserContext = defaultParameters.getUserContext,

  onInteractionEnd = defaultParameters.onInteractionEnd,
  onMessage = defaultParameters.onMessage,

  root,
  schema = defaultParameters.schema,

  sendOnExit = defaultParameters.sendOnExit,
  testForExit = defaultParameters.testForExit,
}: TwillyParameters): Router {
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
    '/',
    handleIncomingSmsWebhook.bind(
      null, getUserContext, onMessage, fc, tc));
  return router;
}
