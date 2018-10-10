import { Router, Request, Response } from 'express';
import * as cookieParser from 'cookie-parser';

import { getSha256Hash } from './util';

import TwilioController, { TwilioControllerOpts } from './TwilioController';
import InteractionController, { InteractionMap } from './InteractionController';


export { default as TwillyInteraction } from './InteractionController/TwillyInteraction';
export { default as TwilioController } from './TwilioController';


export interface TwillyParams extends TwilioControllerOpts {
  cookieSecret?: string;
  inboundMessagePath: string;
  interactions: InteractionMap,
}


function handleIncomingSmsWebhook(
  ic: InteractionController,
  tc: TwilioController,
  req: Request,
  res: Response,
) {
  ic.deriveStateFromSmsCookie(req);
}


export function twilly({
  inboundMessagePath,

  accountSid,
  authToken,
  messageServiceId,

  cookieSecret = null,
  cookieKey = null,

  interactions,
}: TwillyParams): Router {
  if (!cookieSecret) { // If no cookieSecret is provided, generate a hash from the Twilio credentials
    cookieSecret = getSha256Hash(accountSid, authToken);
  }
  if (!cookieKey) {
    cookieKey = getSha256Hash(accountSid, accountSid).slice(0, 10);
  }

  const ic = new InteractionController(cookieKey, interactions);
  const tc = new TwilioController({
    accountSid,
    authToken,
    messageServiceId,
    cookieKey,
  });
  const router = Router();

  router.use(cookieParser(cookieSecret));
  router.post(inboundMessagePath, handleIncomingSmsWebhook.bind(null, ic, tc));
  return router;
}
