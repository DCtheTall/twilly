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
  Exit,
  Message,
  Question,
  Reply,
} from '../Actions';
import { ErrorHandler } from '../util';

export * from './TwilioWebhookRequest';


export interface TwilioControllerArgs {
  accountSid: string;
  authToken: string;
  cookieKey?: string;
  messageServiceId: string;
  sendOnExit: string;
}


export default class TwilioController {
  private readonly cookieKey: string;
  private readonly messageServiceId: string;
  private readonly sendOnExit: string;
  private readonly twilio: TwilioClient;

  constructor({
      accountSid,
      authToken,
      messageServiceId,
      cookieKey,
      sendOnExit,
  }: TwilioControllerArgs) {
    this.cookieKey = cookieKey;
    this.messageServiceId = messageServiceId;
    this.sendOnExit = sendOnExit;
    this.twilio = Twilio(accountSid, authToken);
  }

  public clearSmsCookie(res: Response) {
    res.clearCookie(this.cookieKey);
  }

  public getSmsCookeFromRequest(req: TwilioWebhookRequest): SmsCookie {
    return req.cookies[this.cookieKey] || createSmsCookie(req);
  }

  public async handleAction(
    req: TwilioWebhookRequest,
    action: Action,
    handleError: ErrorHandler,
  ): Promise<void> {
    try {
      let sid: string | string[];

      switch (action.constructor) {
        case Exit:
          sid = <string>(await this.sendSmsMessage(
            req.body.From,
            this.sendOnExit,
          ));
          action.setMessageSid(sid);
          break;

        case Message:
          sid = <string[]>(await this.sendSmsMessage(
            (<Message>action).to,
            (<Message>action).body,
          ));
          action.setMessageSids(sid);
          break;

        case Question:
          (async () => {
            const question = <Question>action;
            sid = [];
            if (question.isAnswered) return;
            if (question.isFailed) {
              sid.push(<string>(await this.sendSmsMessage(
                req.body.From,
                question.failedAnswerResponse,
              )));
              action.setMessageSids(sid);
              return;
            }
            if (question.shouldSendInvalidRes) {
              sid.push(<string>(await this.sendSmsMessage(
                req.body.From,
                question.invalidAnswerResponse,
              )));
            }
            sid.push(<string>(await this.sendSmsMessage(
              req.body.From,
              question.body,
            )));
            action.setMessageSids(sid);
          })();
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
      handleError(err);
    }
  }

  public sendEmptyResponse(res: Response): void {
    return new TwimlResponse(res).send();
  }

  public async sendOnMessageNotification(msg: Message, handleError: ErrorHandler) {
    try {
      await this.sendSmsMessage(msg.to, msg.body);
    } catch (err) {
      handleError(err);
    }
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

  public sendSmsResponse(res: Response, msg: string): void {
    return new TwimlResponse(res).setMessage(msg).send();
  }

  public setSmsCookie(res: Response, payload: SmsCookie) {
    res.cookie(this.cookieKey, payload);
  }
}
