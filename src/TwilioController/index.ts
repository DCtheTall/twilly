import * as Twilio from 'twilio';
import * as TwilioClient from 'twilio/lib/rest/Twilio';
import { Response } from 'express';

import { HALTING_ACTION } from '../symbols';

import { TwilioWebhookRequest } from './TwilioWebhookRequest';
import { SmsCookie, createSmsCookie } from '../SmsCookie';
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

  private sendSmsResponse(res: Response, msg: string): void {
    return new TwimlResponse(res).setMessage(msg).send();
  }

  public sendEmptyResponse(res: Response): void {
    return new TwimlResponse(res).send();
  }

  public getSmsCookeFromRequest(req: TwilioWebhookRequest): SmsCookie {
    const state = req.cookies[this.cookieKey];
    if (state) return state;
    return createSmsCookie(req);
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
  ): Promise<string> {
    try {
      const data = await this.twilio.messages.create({
        to,
        body,
        messagingServiceSid: this.messageServiceId,
      });
      return data.sid;
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
      let sid: string;

      switch (true) {
        case action instanceof Reply:
          sid = await this.sendSmsMessage(req.body.From, (<Reply>action).body);
          action.setMessageSid(sid);
          break;

        case action instanceof Message:
          if (Array.isArray((<Message>action).to)) {
            sid = (await Promise.all(
              (<string[]>(<Message>action).to).map(
                (to: string): Promise<string> =>
                  this.sendSmsMessage(to, (<Message>action).body)))).join(';');
          } else {
            sid = await this.sendSmsMessage(
              <string>(<Message>action).to, (<Message>action).body);
          }
          action.setMessageSid(sid);
          break;

        default:
          break;
      }
    } catch (err) {
      // TODO err handling
      throw err;
    }
  }
}
