import Action, {
  ActionContext,
  GetContext,
} from './Action';


export interface ReplyContext extends ActionContext {
  body: string;
}


const ReplyBody = Symbol('body');

export default class Reply extends Action {
  private [ReplyBody]: string;

  constructor(body: string) {
    if (typeof body !== 'string' || !body.length) {
      throw new TypeError(
        'Reply constructor expects a non-empty string as the first argument');
    }
    super();
    this[ReplyBody] = body;
    this[GetContext] =
      (): ReplyContext => ({ body });
  }

  get body(): string {
    return this[ReplyBody];
  }
}
