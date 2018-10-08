export type numberlike = string | number;

export interface TwilioWebhookRequestBody {
  ToCountry: string,
  ToState: string,
  SmsMessageSid: string,
  NumMedia: numberlike,
  ToCity: string,
  FromZip: numberlike,
  SmsSid: string,
  FromState: string,
  SmsStatus: string,
  FromCity: string,
  Body: string,
  FromCountry: string,
  To: string,
  MessagingServiceSid: string,
  ToZip: numberlike,
  NumSegments: numberlike,
  MessageSid: string,
  AccountSid: string,
  From: string,
  ApiVersion: string,
}
