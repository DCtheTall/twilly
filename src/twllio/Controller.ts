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


type TwilioFactory = (accountSid: string, authToken: string) => TwilioClient;

const twilio = <TwilioFactory>require('twilio');


export interface TwilioControllerArgs {
  accountSid: string;
  authToken: string;
  cookieKey?: string;
  messagingServiceSid: string;
  sendOnExit?: string;
}


export default class TwilioController {
  static isValidString(s: string): boolean {
    return typeof s === 'string' && Boolean(s.length);
  }

  static typeCheckArguments(args: TwilioControllerArgs) {
    Object.keys(args).map((option: string) => {
      if (!TwilioController.isValidString(args[option])) {
        throw new TypeError(
          `${option} twilly option must be a non-empty string`);
      }
    });
  }

  private readonly cookieKey: string;
  private readonly messagingServiceSid: string;
  private readonly sendOnExit: string;
  private readonly twilio: TwilioClient;

  constructor({
      accountSid,
      authToken,
      cookieKey,
      messagingServiceSid,
      sendOnExit,
  }: TwilioControllerArgs) {
    TwilioController.typeCheckArguments({
      accountSid,
      authToken,
      cookieKey,
      messagingServiceSid,
      sendOnExit,
    });
    this.cookieKey = cookieKey;
    this.messagingServiceSid = messagingServiceSid;
    this.sendOnExit = sendOnExit;
    this.twilio = twilio(accountSid, authToken);
  }

  private async sendSmsMessage(
    to: string | string[],
    body: string,
  ): Promise<string | string[]> {
    if (Array.isArray(to)) {
      const data = await Promise.all(
        to.map((dst: string) =>
          this.twilio.messages.create({
            body,
            messagingServiceSid: this.messagingServiceSid,
            to: dst,
          })));
      return data.map(m => m.sid);
    }
    const { sid } = await this.twilio.messages.create({
      to: <string>to,
      body,
      messagingServiceSid: this.messagingServiceSid,
    });
    return sid;
  }

  public clearSmsCookie(res: Response) {
    res.clearCookie(this.cookieKey);
  }

  public getSmsCookieFromRequest(req: TwilioWebhookRequest): SmsCookie {
    return req.cookies[this.cookieKey] || createSmsCookie();
  }

  public async handleAction(
    phoneNumber: string,
    action: Action,
  ): Promise<void> {
    let sid: string;
    let sids: string[];

    switch (action.constructor) {
      case Exit:
        sid = <string>(await this.sendSmsMessage(
          phoneNumber,
          this.sendOnExit));
        action[ActionSetMessageSid](<string>sid);
        return;

      case Message:
        sids = <string[]>(await this.sendSmsMessage(
          (<Message>action).to,
          (<Message>action).body));
        action[ActionSetMessageSids](sids);
        return;

      case Question:
        await (async () => {
          const question = <Question>action;
          sids = [];
          if (question.isAnswered) return;
          if (question.isFailed) {
            sids.push(<string>(await this.sendSmsMessage(
              phoneNumber,
              question.failedAnswerResponse)));
            action[ActionSetMessageSids](sids);
            return;
          }
          if (question.shouldSendInvalidRes) {
            sids.push(<string>(await this.sendSmsMessage(
              phoneNumber,
              question.invalidAnswerResponse)));
          }
          sids.push(<string>(await this.sendSmsMessage(
            phoneNumber,
            question.body)));
          action[ActionSetMessageSids](sids);
        })();
        return;

      case Reply:
        sid = <string>(await this.sendSmsMessage(
          phoneNumber,
          (<Reply>action).body));
        action[ActionSetMessageSid](sid);
        return;

      default:
        return;
    }
  }

  public sendEmptyResponse(res: Response): void {
    return new TwimlResponse(res).send();
  }

  public async sendMessageNotification(msg: Message) {
    await this.sendSmsMessage(msg.to, msg.body);
  }

  public sendSmsResponse(res: Response, msg: string): void {
    return new TwimlResponse(res).setMessage(msg).send();
  }

  public setSmsCookie(res: Response, payload: SmsCookie) {
    res.cookie(this.cookieKey, payload);
  }
}
