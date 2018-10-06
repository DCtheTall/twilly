import { Request, Response, Router } from 'express';

import TwilioController, { TwilioControllerParams } from './TwilioController';


export interface TwillyParams extends TwilioControllerParams {
  inboundMessagePath: string;
}


export function twilly({
  inboundMessagePath,
  accountSid,
  authToken,
  messageServiceId,
}: TwillyParams): Router {
  const tc = new TwilioController({
    accountSid,
    authToken,
    messageServiceId,
  });
  const router = Router();
  router.post(inboundMessagePath, tc.handleSmsMessage);
  return router;
}
