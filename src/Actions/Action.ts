export interface ActionContext {
  messagingSid?: string | string[];
  name?: string;
  type?: string;
}


export const GetActionContext = Symbol('getContext');


const ActionName = Symbol('name');
const ActionMessageSid = Symbol('sid');

export default class Action {
  private [ActionName]: string;
  private [ActionMessageSid]: string | string[];

  public [GetActionContext]: () => ActionContext;

  private addTypeToContext(o: ActionContext): ActionContext {
    const result = {
      type: this.constructor.name,
      name: this[ActionName],
      ...o,
    };
    if (this[ActionMessageSid]) {
      result.messagingSid = this[ActionMessageSid];
    }
    return result;
  }

  get name(): string {
    return this[ActionName];
  }

  get sid(): string | string[] {
    return this[ActionMessageSid];
  }

  public getContext(): ActionContext {
    return this.addTypeToContext(this[GetActionContext]());
  }

  public setMessageSid(sid: string) {
    this[ActionMessageSid] = sid;
  }

  public setName(name: string) {
    this[ActionName] = name;
  }
}
