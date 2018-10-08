import { Request, Response, Router } from 'express';
import * as cookieParser from 'cookie-parser';

import TwilioController, { TwilioControllerParams } from './TwilioController';
import { getCookieSecret } from './util';


export interface TwillyParams extends TwilioControllerParams {
  inboundMessagePath: string;
  cookieSecret: string;
}


export function twilly({
  inboundMessagePath,

  accountSid,
  authToken,
  messageServiceId,

  cookieSecret = null,
}: TwillyParams): Router {
  const tc = new TwilioController({
    accountSid,
    authToken,
    messageServiceId,
  });
  const router = Router();

  if (!cookieSecret) {
    // If no cookieSecret is provided, generate a hash from the Twilio credentials
    cookieSecret = getCookieSecret(accountSid, authToken);
  }

  router.use(cookieParser(cookieSecret));
  router.post(inboundMessagePath, tc.handleSmsMessage.bind(tc));
  return router;
}
