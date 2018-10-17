import { Router, Request, Response } from 'express';
import * as cookieParser from 'cookie-parser';

import { getSha256Hash } from './util';

import TwilioController, { TwilioControllerOpts } from './TwilioController';
import InteractionController from './InteractionController';
import { Flow, FlowSchema } from './Flows';


export { default as Flow } from './Flows/Flow';


export interface TwillyParams extends TwilioControllerOpts {
  cookieSecret?: string;
  inboundMessagePath: string;
  rootInteraction: Flow,
  interactions?: FlowSchema,
}


function handleIncomingSmsWebhook(
  ic: InteractionController,
  tc: TwilioController,
  req: Request,
  res: Response,
) {
  const state = tc.getSmsCookeFromRequest(req);

  tc.sendEmptyResponse(res);
}


export function twilly({
  inboundMessagePath,

  accountSid,
  authToken,
  messageServiceId,

  cookieSecret = null,
  cookieKey = null,

  rootInteraction,
  interactions,
}: TwillyParams): Router {
  if (!cookieKey) {
    cookieKey = getSha256Hash(accountSid, accountSid).slice(0, 10);
  }

  const ic = new InteractionController(rootInteraction, interactions);
  const tc = new TwilioController({
    accountSid,
    authToken,
    messageServiceId,
    cookieKey,
  });
  const router = Router();

  if (!cookieSecret) { // If no cookieSecret is provided, generate a hash from the Twilio credentials
    cookieSecret = getSha256Hash(accountSid, authToken);
  }
  router.use(cookieParser(cookieSecret));
  router.post(inboundMessagePath, handleIncomingSmsWebhook.bind(null, ic, tc));
  return router;
}
