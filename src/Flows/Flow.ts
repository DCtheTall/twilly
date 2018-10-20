import { NAME } from '../symbols';


export default class Flow {
  public readonly [NAME]: string;
  constructor(
    name: string,
  ) {
    this[NAME] = name;
  }
}
