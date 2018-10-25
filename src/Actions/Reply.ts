import Action, { ActionContext, GetActionContext } from './Action';


export interface ReplyContext extends ActionContext {
  body: string;
}


const ReplyBody = Symbol('body');

export default class Reply extends Action {
  private [ReplyBody]: string;

  constructor(body: string) {
    if (typeof body !== 'string') {
      throw new TypeError(
        'Reply constructor expects a string as the first argument');
    }
    super();
    this[ReplyBody] = body;
    this[GetActionContext] =
      (): ReplyContext => ({ body });
  }

  get body(): string {
    return this[ReplyBody];
  }
}
