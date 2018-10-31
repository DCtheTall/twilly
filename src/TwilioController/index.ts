import * as Twilio from 'twilio';
import * as TwilioClient from 'twilio/lib/rest/Twilio';
import { Response } from 'express';

import { TwilioWebhookRequest } from './TwilioWebhookRequest';
import {
  SmsCookie,
  createSmsCookie,
} from '../SmsCookie';
import TwimlResponse from './TwimlResponse';
import {
  Action,
  Message,
  Question,
  QuestionGetBody,
  Reply,
} from '../Actions';

export * from './TwilioWebhookRequest';


export interface TwilioControllerArgs {
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
  }: TwilioControllerArgs) {
    this.twilio = Twilio(accountSid, authToken);
    this.messageServiceId = messageServiceId;
    this.cookieKey = cookieKey;
  }

  private sendSmsResponse(res: Response, msg: string): void {
    return new TwimlResponse(res).setMessage(msg).send();
  }

  public clearSmsCookie(res: Response) {
    res.clearCookie(this.cookieKey);
  }

  public getSmsCookeFromRequest(req: TwilioWebhookRequest): SmsCookie {
    return req.cookies[this.cookieKey] || createSmsCookie(req);
  }

  public async handleAction(
    req: TwilioWebhookRequest,
    state: SmsCookie,
    action: Action,
  ): Promise<void> {
    try {
      let sid: string | string[];

      switch (action.constructor) {
        case Message:
          sid = <string[]>(await this.sendSmsMessage(
            (<Message>action).to,
            (<Message>action).body,
          ));
          (<Message>action).setMessageSids(sid);
          break;

        case Question:
          if ((<Question>action).isAnswered) break;
          sid = <string>(await this.sendSmsMessage(
            req.body.From,
            (<Question>action)[QuestionGetBody](state),
          ));
          break;

        case Reply:
          sid = <string>(await this.sendSmsMessage(
            req.body.From,
            (<Reply>action).body,
          ));
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

  public sendEmptyResponse(res: Response): void {
    return new TwimlResponse(res).send();
  }

  public async sendSmsMessage(
    to: string | string[],
    body: string,
  ): Promise<string | string[]> {
    if (Array.isArray(to)) {
      const data = await Promise.all(
        to.map((dst: string) =>
          this.twilio.messages.create({
            to: dst,
            body,
            messagingServiceSid: this.messageServiceId,
          })));
      return data.map(m => m.sid);
    }
    try {
      const data = await this.twilio.messages.create({
        to: <string>to,
        body,
        messagingServiceSid: this.messageServiceId,
      });
      return data.sid;
    } catch (err) {
      // TODO error handling
      throw err;
    }
  }

  public setSmsCookie(res: Response, payload: SmsCookie) {
    res.cookie(this.cookieKey, payload);
  }
}
