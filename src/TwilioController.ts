import * as Twilio from 'twilio';
import * as TwilioClient from 'twilio/lib/rest/Twilio';
import { MessageInstance } from 'twilio/lib/rest/api/v2010/account/message';

export interface TwilioControllerParams {
  accountSid: string;
  authToken: string;
  messageServiceId: string;
}

export default class TwilioController {
  private twilio: TwilioClient;
  private messageServiceId: string;

  constructor({
    accountSid,
    authToken,
    messageServiceId,
  }: TwilioControllerParams) {
    this.twilio = Twilio(accountSid, authToken);
    this.messageServiceId = messageServiceId;
  }

  sendTextMessage(
    to: string,
    body: string,
  ): Promise<MessageInstance> {
    return this.twilio.messages.create({
      to,
      body,
      messagingServiceSid: this.messageServiceId,
    });
  }
}
