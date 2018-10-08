import { Router } from 'express';
import * as cookieParser from 'cookie-parser';

import TwilioController, { TwilioControllerParams } from './TwilioController';
import { getCookieSecret } from './util';

import InteractionController from './InteractionController';
import Interaction from './InteractionController/Interaction';


export { default as Interaction } from './InteractionController/Interaction';


export interface TwillyParams extends TwilioControllerParams {
  inboundMessagePath: string;
  cookieSecret?: string;
  cookieKey?: string;
  interactions: Interaction[],
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
  const tc = new TwilioController({
    accountSid,
    authToken,
    messageServiceId,
  });
  const router = Router();
  const interactionController = new InteractionController(interactions);

  if (!cookieSecret) {
    // If no cookieSecret is provided, generate a hash from the Twilio credentials
    cookieSecret = getCookieSecret(accountSid, authToken);
  }

  router.use(cookieParser(cookieSecret));
  router.post(inboundMessagePath, tc.handleSmsMessage.bind(tc));
  return router;
}
