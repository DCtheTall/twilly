import { HALTING_ACTION, NAME } from '../symbols';

import Action, { ActionContext } from './Action';


const ReplyBody = Symbol('body');


export interface ReplyContext extends ActionContext {
  body: string;
  messageSid: string;
}


export default class Reply extends Action {
  private [ReplyBody]: string;

  constructor(body: string) {
    super();
    this[ReplyBody] = body;
    this[HALTING_ACTION] = false;
  }

  get body(): string {
    return this[ReplyBody];
  }

  public getContext(): ReplyContext {
    return {
      body: this[ReplyBody],
      name: this[NAME],
      messageSid: '',
    };
  }
}
