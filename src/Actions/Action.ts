import { NAME, HALTING_ACTION } from '../symbols';


export interface ActionContext {
  name: string;
}


export default class Action {
  public [HALTING_ACTION]: boolean;
  private [NAME]: string;

  public setName(name: string) {
    this[NAME] = name;
  }

  public getContext(): ActionContext {
    return { name: this[NAME] };
  }
}
