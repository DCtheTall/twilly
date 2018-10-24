import {
  Router,
  Response,
} from 'express';
import * as cookieParser from 'cookie-parser';

import { getSha256Hash } from './util';

import TwilioController, {
  TwilioControllerOpts,
  TwilioWebhookRequest,
} from './TwilioController';
import { FlowController } from './Flows';
import { Flow, FlowSchema } from './Flows';
import { HALTING_ACTION } from './symbols';

export {
  Flow,
  FlowSchema,
} from './Flows';
export {
  Message,
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
    let action = await fc.deriveActionFromState(state, userCtx);

    while (action !== null) {
      await tc.handleAction(req, res, action);

      state = await fc.deriveNextStateFromAction(state, action);
      if (action[HALTING_ACTION] || !state) break;
      action = await fc.deriveActionFromState(state, userCtx);
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

interface TwillyParams extends TwilioControllerOpts {
  inboundMessagePath: string;
  root: Flow,
  schema?: FlowSchema,
  cookieSecret?: string;
  getUserContext?: UserContextGetter;
}


export function twilly({
  accountSid,
  authToken,
  messageServiceId,

  root,
  schema,

  cookieSecret = null,
  cookieKey = null,

  getUserContext = (from: string) => null,
}: TwillyParams): Router {
  if (!cookieKey) {
    cookieKey = getSha256Hash(accountSid, accountSid).slice(0, 10);
  }
  if (!cookieSecret) { // If no cookieSecret is provided, generate a hash from the Twilio credentials
    cookieSecret = getSha256Hash(accountSid, authToken);
  }

  const ic = new FlowController(root, schema);
  const tc = new TwilioController({
    accountSid,
    authToken,
    messageServiceId,
    cookieKey,
  });
  const router = Router();

  router.use(cookieParser(cookieSecret));
  router.post('/', handleIncomingSmsWebhook.bind(null, getUserContext, ic, tc));
  return router;
}
