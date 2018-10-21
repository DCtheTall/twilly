import { NAME, HALTING_ACTION } from '../symbols';


export default class Action {
  public readonly [NAME]: string;
  public [HALTING_ACTION]: boolean;

  constructor(name: string) {
    this[NAME] = name;
  }
}
