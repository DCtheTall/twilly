import { NAME, FLOW_LENGTH } from '../symbols';
import { Action } from '../Actions';

export type FlowActionGetter = (context: any, userContext?: any) => Action;


interface FlowActionInstruction {
  name: string;
  getAction: FlowActionGetter;
}

const FlowActions = Symbol('actions');
const FlowActionNames = Symbol('actionNames');

export default class Flow {
  private readonly [FlowActions]: FlowActionInstruction[];
  private readonly [FlowActionNames]: Set<string>;

  public readonly [NAME]: string;

  constructor(name: string) {
    this[NAME] = name;
    this[FlowActions] = [];
    this[FlowActionNames] = new Set<string>();
  }

  get [FLOW_LENGTH]() {
    return this[FlowActions].length;
  }

  public addAction(name: string, getAction: FlowActionGetter): Flow {
    if (this[FlowActionNames].has(name)) {
      throw new TypeError(
        `Every Flow's action names must be unique. Unexpected duplicate name: ${name}`);
    }
    this[FlowActionNames].add(name);
    this[FlowActions].push({ name, getAction });
    return this;
  }

  public addActions(actions: { [index: string]: FlowActionGetter }): Flow {
    Object.keys(actions).map(
      (key: string) => this.addAction(key, actions[key]));
    return this;
  }

  public selectActionGetter(i: number): FlowActionGetter {
    const flowEntry = this[FlowActions][i];
    if (!flowEntry) return null;
    return flowEntry.getAction;
  }

  public selectName(i: number): string {
    const flowEntry = this[FlowActions][i];
    if (!flowEntry) return null;
    return flowEntry.name;
  }
}
