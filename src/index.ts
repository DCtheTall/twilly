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


type UserContextGetter = (from: string) => any;


interface TwillyParams extends TwilioControllerOpts {
  inboundMessagePath: string;
  rootFlow: Flow,
  flowSchema?: FlowSchema,
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
    const userCtx = await getUserContext(req.body.From);
    const state = tc.getSmsCookeFromRequest(req);

    fc.deriveActionFromState(state);
    tc.sendSmsResponse(res, 'Hello world!');
  } catch (err) {
    // TODO errors?
    throw err;
  }
}


export function twilly({
  accountSid,
  authToken,
  messageServiceId,

  rootFlow,
  flowSchema,

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

  const ic = new FlowController(rootFlow, flowSchema);
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
