import * as Twilio from 'twilio';
import * as TwilioClient from 'twilio/lib/rest/Twilio';
import { Request, Response } from 'express';

import { XmlContentTypeHeader } from './headers';
import { TwilioWebhookRequestBody } from './TwilioWebhookRequest';


const EMPTY_TWIML_RESPONSE = '<?xml version="1.0" encoding="UTF-8"?><Response />';


export interface TwilioControllerParams {
  accountSid: string;
  authToken: string;
  messageServiceId: string;
}


export default class TwilioController {
  private readonly twilio: TwilioClient;
  private readonly messageServiceId: string;

  constructor({
    accountSid,
    authToken,
    messageServiceId,
  }: TwilioControllerParams) {
    this.twilio = Twilio(accountSid, authToken);
    this.messageServiceId = messageServiceId;
  }

  private setCookie(req: Request) {

  }

  private sendEmptyResponse(req: Request, res: Response): void {
    res.writeHead(200, XmlContentTypeHeader);
    res.end(EMPTY_TWIML_RESPONSE);
  }

  public handleSmsMessage(req: Request, res: Response): void {
    // TODO handle getting multiple segments
    const body = <TwilioWebhookRequestBody>req.body;
    this.sendEmptyResponse(req, res);
  }

  public async sendSmsMessage(
    to: string,
    body: string,
  ): Promise<void> {
    try {
      await this.twilio.messages.create({
        to,
        body,
        messagingServiceSid: this.messageServiceId,
      });
    } catch (err) {
      // TODO error handling
    }
  }
}
