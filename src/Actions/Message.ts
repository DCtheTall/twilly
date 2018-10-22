import { HALTING_ACTION, NAME } from '../symbols';

import Action, { ActionContext } from './Action';
import { SmsCookie } from '../SmsCookie';


const MessageTo = Symbol('to');
const MessageBody = Symbol('body');


export interface MessageContext extends ActionContext {
  body: string;
  to: string;
  messageSid: string;
}


export default class Messsage extends Action {
  private [MessageTo]: string | string[];
  private [MessageBody]: string;

  constructor(
    to: string | string,
    body: string,
  ) {
    super();
    this[MessageTo] = to;
    this[MessageBody] = body;
    this[HALTING_ACTION] = false;
  }

  get to() {
    return this[MessageTo];
  }

  get body() {
    return this[MessageBody];
  }

  public getContext(): MessageContext {
    return {
      body: this[MessageBody],
      name: this[NAME],
      messageSid: '',
      to: Array.isArray(this[MessageTo]) ?
        (<string[]>this[MessageTo]).join(';')
        : <string>this[MessageTo],
    };
  }
}
