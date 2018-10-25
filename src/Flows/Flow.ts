import { Action } from '../Actions';
import { InteractionContext } from '../SmsCookie';


export type FlowActionResolver =
  (context: InteractionContext, userContext?: any) => Action | Promise<Action>;


interface FlowAction {
  name: string;
  resolve: FlowActionResolver;
}

const FlowName = Symbol('name');
const FlowActions = Symbol('actions');
const FlowActionNames = Symbol('actionNames');

export default class Flow {
  private readonly [FlowActions]: FlowAction[];
  private readonly [FlowActionNames]: Set<string>;

  public readonly [FlowName]: string;

  constructor(name: string) {
    this[FlowName] = name;
    this[FlowActions] = [];
    this[FlowActionNames] = new Set<string>();
  }

  get length() {
    return this[FlowActions].length;
  }

  get name() {
    return this[FlowName];
  }

  public addAction(name: string, resolve: FlowActionResolver): Flow {
    if (this[FlowActionNames].has(name)) {
      throw new TypeError(
        `Every Flow's action names must be unique. Unexpected duplicate name: ${name}`);
    }
    this[FlowActionNames].add(name);
    this[FlowActions].push({ name, resolve });
    return this;
  }

  public addActions(actions: FlowAction[]): Flow {
    actions.map(
      (flowAction: FlowAction) =>
        this.addAction(flowAction.name, flowAction.resolve));
    return this;
  }

  public selectActionResolver(i: number): FlowActionResolver {
    const flowEntry = this[FlowActions][i];
    if (!flowEntry) return null;
    return flowEntry.resolve;
  }

  public selectName(i: number): string {
    const flowEntry = this[FlowActions][i];
    if (!flowEntry) return null;
    return flowEntry.name;
  }
}
