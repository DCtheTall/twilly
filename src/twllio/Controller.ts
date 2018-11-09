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
  ActionSetMessageSid,
  ActionSetMessageSids,
} from '../Actions';
import { ErrorHandler } from '../util';


type TwilioFactory = (accountSid: string, authToken: string) => TwilioClient;

const twilio = <TwilioFactory>require('twilio');


export * from './TwilioWebhookRequest';


export interface TwilioControllerArgs {
  accountSid: string;
  authToken: string;
  cookieKey?: string;
  messageServiceId: string;
  sendOnExit?: string;
}


export default class TwilioController {
  static create(args: TwilioControllerArgs) {
    return new TwilioController(args);
  }

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
    this.twilio = twilio(accountSid, authToken);
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
      throw new Error('Testing');
      let sid: string | string[];

      switch (action.constructor) {
        case Exit:
          sid = <string>(await this.sendSmsMessage(
            req.body.From,
            this.sendOnExit,
            handleError,
          ));
          action[ActionSetMessageSid](<string>sid);
          break;

        case Message:
          sid = <string[]>(await this.sendSmsMessage(
            (<Message>action).to,
            (<Message>action).body,
            handleError,
          ));
          action[ActionSetMessageSids](<string[]>sid);
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
                handleError,
              )));
              action[ActionSetMessageSids](sid);
              return;
            }
            if (question.shouldSendInvalidRes) {
              sid.push(<string>(await this.sendSmsMessage(
                req.body.From,
                question.invalidAnswerResponse,
                handleError,
              )));
            }
            sid.push(<string>(await this.sendSmsMessage(
              req.body.From,
              question.body,
              handleError,
            )));
            action[ActionSetMessageSids](sid);
          })();
          break;

        case Reply:
          sid = <string>(await this.sendSmsMessage(
            req.body.From,
            (<Reply>action).body,
            handleError,
          ));
          action[ActionSetMessageSid](<string>sid);
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
      await this.sendSmsMessage(
        msg.to, msg.body, handleError);
    } catch (err) {
      handleError(err);
    }
  }

  public async sendSmsMessage(
    to: string | string[],
    body: string,
    handleError: ErrorHandler,
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
      handleError(err);
    }
  }

  public sendSmsResponse(res: Response, msg: string): void {
    return new TwimlResponse(res).setMessage(msg).send();
  }

  public setSmsCookie(res: Response, payload: SmsCookie) {
    res.cookie(this.cookieKey, payload);
  }
}
