import * as TwilioClient from 'twilio/lib/rest/Twilio';
import * as MessagingResponse from 'twilio/lib/twiml/MessagingResponse';
import { Request, Response } from 'express';

import { bootstrapClient } from './client';
import { XmlContentTypeHeader } from './RequestHeader';

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
    this.twilio = bootstrapClient(accountSid, authToken);
    this.messageServiceId = messageServiceId;
  }

  public handleSmsMessage(_: Request, res: Response): void {
    const twiml = new MessagingResponse();
    twiml.message('Testing handleSmsMessage');
    res.writeHead(200, XmlContentTypeHeader);
    res.end(twiml.toString());
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
      // log message instance results
    } catch (err) {
      // TODO error handling
    }
  }
}
