import { HALTING_ACTION, NAME, MESSAGING_SID } from '../symbols';

import Action, { ActionContext, GetActionContext } from './Action';


export interface ReplyContext extends ActionContext {
  body: string;
}


const ReplyBody = Symbol('body');

export default class Reply extends Action {
  private [ReplyBody]: string;

  constructor(body: string) {
    super();
    this[HALTING_ACTION] = false;
    this[ReplyBody] = body;
    this[GetActionContext] =
      (): ReplyContext => ({ body: this[ReplyBody] });
  }

  get body(): string {
    return this[ReplyBody];
  }
}
