import { Response } from 'express';
import * as MessagingResponse from 'twilio/lib/twiml/MessagingResponse';

import { XmlContentTypeHeader } from './TwilioWebhookRequest';

const MsgResp = require('twilio/lib/twiml/MessagingResponse');


export const DEFAULT_RESPONSE_CODE = 200;

export const EMPTY_TWIML_RESPONSE =
  '<?xml version="1.0" encoding="UTF-8"?><Response />';



const TwimlResponseXml = Symbol('xml');

export default class TwimlResponse {
  private [TwimlResponseXml]: string;

  constructor(
    private readonly res: Response,
  ) {
    this[TwimlResponseXml] = EMPTY_TWIML_RESPONSE;
  }

  get xml(): string {
    return this[TwimlResponseXml];
  }

  public setMessage(message: string): TwimlResponse {
    const msgRes = <MessagingResponse>(new MsgResp());
    msgRes.message(message);
    this[TwimlResponseXml] = msgRes.toString();
    return this;
  }

  public send(code: number = DEFAULT_RESPONSE_CODE) {
    this.res.writeHead(code, XmlContentTypeHeader);
    this.res.end(this.xml);
  }
}
