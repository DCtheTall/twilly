import { Request as ExpressRequest } from 'express';

import { SmsCookie } from "../SmsCookie";
import { uniqueString } from '../util';


type Numberlike = string | number;


export interface RequestHeader {
  [index: string]: string;
  'Content-Type'?: string;
  'Set-Cookie'?: string;
}


export const XmlContentTypeHeader = <RequestHeader>{
  'Content-Type': 'text/xml',
};


export interface TwilioWebhookRequestBody {
  ApiVersion?: string,
  AccountSid?: string,
  Body?: string,
  From?: string,
  FromCity?: string,
  FromCountry?: string,
  FromState?: string,
  FromZip?: Numberlike,
  MessageSid?: string,
  MessagingServiceSid?: string,
  NumMedia?: Numberlike,
  NumSegments?: Numberlike,
  SmsMessageSid?: string,
  SmsSid?: string,
  SmsStatus?: string,
  To?: string,
  ToCountry?: string,
  ToState?: string,
  ToCity?: string,
  ToZip?: Numberlike,
}

export interface TwilioWebhookRequest extends ExpressRequest {
  cookies: { [index: string]: SmsCookie };
  body: TwilioWebhookRequestBody;
}


export interface MockTwilioWebhookRequestOpts {
  body?: string;
  cookieKey?: string;
  from?: string;
}

const defaultOptions = <MockTwilioWebhookRequestOpts>{
  body: uniqueString(),
  cookieKey: uniqueString(),
  from: uniqueString(),
};

export function getMockTwilioWebhookRequest({
  body = defaultOptions.body,
  cookieKey = defaultOptions.cookieKey,
  from = defaultOptions.from,
}: MockTwilioWebhookRequestOpts = defaultOptions): TwilioWebhookRequest {
  return <TwilioWebhookRequest>{
    cookies: { [cookieKey]: {} },
    body: {
      Body: body,
      From: from,
    },
  };
}
