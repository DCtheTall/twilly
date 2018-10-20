import { Router, Request, Response } from 'express';
import * as cookieParser from 'cookie-parser';

import { getSha256Hash } from './util';

import TwilioController, { TwilioControllerOpts } from './TwilioController';
import FlowController from './FlowController';
import { Flow, FlowSchema } from './Flows';

export { Flow, FlowSchema } from './Flows';


interface TwillyParams extends TwilioControllerOpts {
  cookieSecret?: string;
  inboundMessagePath: string;
  rootFlow: Flow,
  flowSchema?: FlowSchema,
}


function handleIncomingSmsWebhook(
  fc: FlowController,
  tc: TwilioController,
  req: Request,
  res: Response,
) {
  const state = tc.getSmsCookeFromRequest(req);

  fc.deriveActionFromState(state);
  tc.sendEmptyResponse(res);
}


export function twilly({
  accountSid,
  authToken,
  messageServiceId,

  rootFlow,
  flowSchema,

  cookieSecret = null,
  cookieKey = null,
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
  router.post('/', handleIncomingSmsWebhook.bind(null, ic, tc));
  return router;
}
