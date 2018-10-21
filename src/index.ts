import { Router, Response } from 'express';
import * as cookieParser from 'cookie-parser';

import { getSha256Hash } from './util';

import TwilioController, {
  TwilioControllerOpts,
  TwilioWebhookRequest,
} from './TwilioController';
import FlowController from './FlowController';
import { Flow, FlowSchema } from './Flows';


export { Flow, FlowSchema } from './Flows';
export {
  Message,
  Reply,
} from './Actions';



type UserContextGetter = (from: string) => any;


interface TwillyParams extends TwilioControllerOpts {
  inboundMessagePath: string;
  root: Flow,
  schema?: FlowSchema,
  cookieSecret?: string;
  getUserContext?: UserContextGetter;
}


async function handleIncomingSmsWebhook(
  getUserContext: UserContextGetter,
  fc: FlowController,
  tc: TwilioController,
  req: TwilioWebhookRequest,
  res: Response,
) {
  try {
    const state = tc.getSmsCookeFromRequest(req);
    const userCtx = await getUserContext(req.body.From);
    const action = await fc.deriveActionFromState(state, userCtx);

    tc.handleAction(req, res, action);
  } catch (err) {
    // TODO errors?
    throw err;
  }
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
