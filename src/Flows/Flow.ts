import { NAME, FLOW_LENGTH } from '../symbols';
import { Action } from '../Actions';


const FlowActionNames = Symbol('actionNames');
const FlowActions = Symbol('actions');


export type FlowAction = (context: any, userContext?: any) => Action;
interface FlowActionEntry {
  name: string;
  action: FlowAction;
}


export default class Flow {
  private readonly [FlowActions]: FlowActionEntry[];
  private readonly [FlowActionNames]: Set<string>;

  public readonly [NAME]: string;

  constructor(
    name: string,
  ) {
    this[NAME] = name;
    this[FlowActions] = [];
    this[FlowActionNames] = new Set<string>();
  }

  get [FLOW_LENGTH]() {
    return this[FlowActions].length;
  }

  public selectAction(i: number): FlowAction {
    const flowEntry = this[FlowActions][i];
    if (!flowEntry) return null;
    return flowEntry.action;
  }

  public selectName(i: number): string {
    const flowEntry = this[FlowActions][i];
    if (!flowEntry) return null;
    return flowEntry.name;
  }

  public addAction(name: string, action: FlowAction): Flow {
    if (this[FlowActionNames].has(name)) {
      throw new TypeError(
        `Every Flow's action names must be unique. Unexpected duplicate name: ${name}`);
    }
    this[FlowActionNames].add(name);
    this[FlowActions].push({ name, action });
    return this;
  }

  public addActions(actions: { [index: string]: FlowAction }): Flow {
    Object.keys(actions).map(
      (key: string) => this.addAction(key, actions[key]));
    return this;
  }
}
