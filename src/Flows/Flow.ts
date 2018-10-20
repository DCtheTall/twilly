import { FLOW_NAME } from '../symbols';


export default class Flow {
  public readonly [FLOW_NAME]: string;
  constructor(
    name: string,
  ) {
    this[FLOW_NAME] = name;
  }
}
