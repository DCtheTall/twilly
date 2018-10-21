import { Request } from 'express';

import { SmsCookie } from "../SmsCookie";


type Numberlike = string | number;


export interface TwilioWebhookRequestBody {
  ApiVersion: string,
  AccountSid: string,
  Body: string,
  From: string,
  FromCity: string,
  FromCountry: string,
  FromState: string,
  FromZip: Numberlike,
  MessageSid: string,
  MessagingServiceSid: string,
  NumMedia: Numberlike,
  NumSegments: Numberlike,
  SmsMessageSid: string,
  SmsSid: string,
  SmsStatus: string,
  To: string,
  ToCountry: string,
  ToState: string,
  ToCity: string,
  ToZip: Numberlike,
}

export interface TwilioWebhookRequest extends Request {
  cookies: { [index: string]: SmsCookie };
  body: TwilioWebhookRequestBody;
}
