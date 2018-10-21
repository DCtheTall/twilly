import * as MessagingResponse from 'twilio/lib/twiml/MessagingResponse';
import { Response } from 'express';

import { XmlContentTypeHeader } from './headers';


const EMPTY_TWIML_RESPONSE =
  '<?xml version="1.0" encoding="UTF-8"?><Response />';


export default class TwimlResponse {
  private xml: string;

  constructor(
    private readonly res: Response,
  ) {
    this.xml = EMPTY_TWIML_RESPONSE;
  }

  public setMessage(message: string): TwimlResponse {
    const msgRes = new MessagingResponse();
    msgRes.message(message);
    this.xml = msgRes.toString();
    return this;
  }

  public send(code: number = 200) {
    this.res.writeHead(code, XmlContentTypeHeader);
    this.res.end(this.xml);
  }
}
