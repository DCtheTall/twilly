import * as Twilio from 'twilio';
import * as TwilioClient from 'twilio/lib/rest/Twilio';

export const bootstrapClient =
  (accountSid: string, authToken: string): TwilioClient =>
    Twilio(accountSid, authToken);
