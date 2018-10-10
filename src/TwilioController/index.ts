import * as Twilio from 'twilio';
import * as TwilioClient from 'twilio/lib/rest/Twilio';
import * as MessagingResponse from 'twilio/lib/twiml/MessagingResponse';
import { Request, Response } from 'express';

import { XmlContentTypeHeader } from './headers';
import { TwilioWebhookRequestBody } from './TwilioWebhookRequest';
import InteractionController from '../InteractionController';


const EMPTY_TWIML_RESPONSE = '<?xml version="1.0" encoding="UTF-8"?><Response />';


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

  private getSmsCookeFromRequest(req: Request) {
    return req.cookies[this.cookieKey];
  }

  private setSmsCookie(res: Response, payload: string) {
    res.cookie(this.cookieKey, payload);
  }

  private writeSuccessResponse(res: Response, msg: string) {
    res.writeHead(200, XmlContentTypeHeader);
    res.end(msg);
  }

  private sendEmptyResponse(res: Response): void {
    this.writeSuccessResponse(res, EMPTY_TWIML_RESPONSE);
  }

  private sendSmsResponse(res: Response, msg: string): void {
    const msgResponse = new MessagingResponse();
    msgResponse.message(msg);
    this.writeSuccessResponse(res, msgResponse.toString());
  }

  public handleSmsMessage(req: Request, res: Response): void {
    // TODO handle getting multiple segments
    const body = <TwilioWebhookRequestBody>req.body;
    console.log(this.getSmsCookeFromRequest(req));
    this.sendSmsResponse(res, 'test');
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
