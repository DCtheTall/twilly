import * as Twilio from 'twilio';
import * as TwilioClient from 'twilio/lib/rest/Twilio';
import {
  Request,
  Response,
} from 'express';

import { TwilioWebhookRequestBody, TwilioWebhookRequest } from './TwilioWebhookRequest';
import { SmsCookie } from '../SmsCookie';
import TwimlResponse from './TwimlResponse';

export * from './TwilioWebhookRequest';


export interface TwilioControllerOpts {
  accountSid: string;
  authToken: string;
  messageServiceId: string;
  cookieKey?: string;
}


export default class TwilioController {
  private readonly twilio: TwilioClient;
  private readonly messageServiceId: string;
  private readonly cookieKey: string;

  constructor({
      accountSid,
      authToken,
      messageServiceId,
      cookieKey,
  }: TwilioControllerOpts) {
    this.twilio = Twilio(accountSid, authToken);
    this.messageServiceId = messageServiceId;
    this.cookieKey = cookieKey;
  }

  public sendEmptyResponse(res: Response): void {
    return new TwimlResponse(res).send();
  }

  public sendSmsResponse(res: Response, msg: string): void {
    return new TwimlResponse(res).setMessage(msg).send();
  }

  public getSmsCookeFromRequest(req: TwilioWebhookRequest): SmsCookie {
    return req.cookies[this.cookieKey];
  }

  public setSmsCookie(res: Response, payload: SmsCookie) {
    res.cookie(this.cookieKey, payload);
  }

  public clearSmsCookie(res: Response) {
    res.clearCookie(this.cookieKey);
  }

  public async sendSmsMessage(
    to: string,
    body: string,
  ): Promise<void> {
    try {
      const data = await this.twilio.messages.create({
        to,
        body,
        messagingServiceSid: this.messageServiceId,
      });
    } catch (err) {
      // TODO error handling
      throw err;
    }
  }
}
