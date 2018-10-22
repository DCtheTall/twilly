import { NAME, HALTING_ACTION, MESSAGING_SID } from '../symbols';


export interface ActionContext {
  name: string;
}


export default class Action {
  public [HALTING_ACTION]: boolean;
  private [NAME]: string;
  private [MESSAGING_SID]: string;

  public getContext(): ActionContext {
    return { name: this[NAME] };
  }

  public setName(name: string) {
    this[NAME] = name;
  }

  public setMessageSid(sid: string) {
    this[MESSAGING_SID] = sid;
  }
}
