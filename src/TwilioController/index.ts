import * as Twilio from 'twilio';
import * as TwilioClient from 'twilio/lib/rest/Twilio';
import { Response } from 'express';

import { HALTING_ACTION } from '../symbols';

import { TwilioWebhookRequest } from './TwilioWebhookRequest';
import { SmsCookie } from '../SmsCookie';
import TwimlResponse from './TwimlResponse';
import { Action, Message, Reply } from '../Actions';

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

  private sendEmptyResponse(res: Response): void {
    return new TwimlResponse(res).send();
  }

  private sendSmsResponse(res: Response, msg: string): void {
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
      // TODO collect metadata for cookie
    } catch (err) {
      // TODO error handling
      throw err;
    }
  }

  public async handleAction(
    req: TwilioWebhookRequest,
    res: Response,
    action: Action,
  ): Promise<void> {
    try {
      switch (true) {
        case action instanceof Reply:
          await this.sendSmsMessage(req.body.From, (<Reply>action).body);

        case action instanceof Message:
          await this.sendSmsMessage((<Message>action).to, (<Message>action).body);
          break;

        default:
          break;
      }

      if (action[HALTING_ACTION]) { // can potentially have this send replies later
        this.sendEmptyResponse(res);
      }
    } catch (err) {
      // TODO err handling
      this.sendEmptyResponse(res);
    }
  }
}
