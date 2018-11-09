export interface ActionContext {
  createdAt?: Date;
  actionName?: string;
  flowName?: string;
  messageSid?: string | string[];
  type?: string;
}


export const GetContext = Symbol('getContext');

const ActionName = Symbol('name');

export const ActionGetContext = Symbol('getContext');
export const ActionMessageSid = Symbol('messageSid');
export const ActionSetMessageSid = Symbol('setMessageSid');
export const ActionSetMessageSids = Symbol('setMessageSids');
export const ActionSetName = Symbol('setName');

export default class Action {
  private [ActionName]: string;
  private [ActionMessageSid]: string | string[];

  public [GetContext]: () => ActionContext;

  private addTypeToContext(o: ActionContext): ActionContext {
    const result = <ActionContext>{
      createdAt: new Date(),
      type: this.constructor.name,
      actionName: this[ActionName],
      ...o,
    };
    if (this[ActionMessageSid]) {
      result.messageSid = this[ActionMessageSid];
    }
    return result;
  }

  get name(): string {
    return this[ActionName];
  }

  get sid(): string | string[] {
    return this[ActionMessageSid];
  }

  public [ActionGetContext](): ActionContext {
    return this.addTypeToContext(this[GetContext]());
  }

  public [ActionSetMessageSid](sid: string) {
    this[ActionMessageSid] = sid;
  }

  public [ActionSetMessageSids](sids: string[]) {
    this[ActionMessageSid] = sids;
  }

  public [ActionSetName](name: string) {
    this[ActionName] = name;
  }
}
