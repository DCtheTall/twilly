export type Numberlike = string | number;

export interface TwilioWebhookRequestBody {
  ToCountry: string,
  ToState: string,
  SmsMessageSid: string,
  NumMedia: Numberlike,
  ToCity: string,
  FromZip: Numberlike,
  SmsSid: string,
  FromState: string,
  SmsStatus: string,
  FromCity: string,
  Body: string,
  FromCountry: string,
  To: string,
  MessagingServiceSid: string,
  ToZip: Numberlike,
  NumSegments: Numberlike,
  MessageSid: string,
  AccountSid: string,
  From: string,
  ApiVersion: string,
}
