import { NAME, FLOW_LENGTH } from '../symbols';
import { Action } from '../Actions';


export type FlowAction = (context: any, userContext?: any) => Action;


export default class Flow {
  private readonly actions: FlowAction[];

  public readonly [NAME]: string;

  constructor(
    name: string,
  ) {
    this[NAME] = name;
    this.actions = [];
  }

  get [FLOW_LENGTH]() {
    return this.actions.length;
  }

  public selectAction(i: number) {
    return this.actions[i];
  }

  public addAction(action: FlowAction): Flow {
    this.actions.push(action);
    return this;
  }

  public addActions(...actions: Array<FlowAction|FlowAction[]>): Flow {
    for (let action of actions) {
      if (Array.isArray(action)) this.addActions(action);
      else this.actions.push(action);
    }
    return this;
  }
}
