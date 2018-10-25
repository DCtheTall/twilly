import { NAME, MESSAGING_SID } from '../symbols';


export interface ActionContext {
  messagingSid?: string | string[];
  name?: string;
  type?: string;
}


export const GetActionContext = Symbol('getContext');

export default class Action {
  private [NAME]: string;
  private [MESSAGING_SID]: string | string[];

  public [GetActionContext]: () => ActionContext;

  private addTypeToContext(o: ActionContext): ActionContext {
    const result = {
      type: this.constructor.name,
      name: this[NAME],
      ...o,
    };
    if (this[MESSAGING_SID]) {
      result.messagingSid = this[MESSAGING_SID];
    }
    return result;
  }

  public getContext(): ActionContext {
    return this.addTypeToContext(this[GetActionContext]());
  }

  public setMessageSid(sid: string) {
    this[MESSAGING_SID] = sid;
  }

  public setName(name: string) {
    this[NAME] = name;
  }
}
