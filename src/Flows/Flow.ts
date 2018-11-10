import { Action } from '../Actions';
import { InteractionContext, FlowContext } from '../SmsCookie';


export type FlowActionResolver =
  (context: FlowContext, userContext?: any) => Action | Promise<Action>;


interface FlowAction {
  name: string;
  resolve: FlowActionResolver;
}

const FlowName = Symbol('name');
const FlowActions = Symbol('actions');
const FlowActionNames = Symbol('actionNames');

export const FlowSelectActionResolver = Symbol('selectActionResolver');
export const FlowSelectName = Symbol('selectName');

export default class Flow {
  static validString(s: string): boolean {
    return typeof s === 'string' && Boolean(s.length)
  }

  private readonly [FlowActions]: FlowAction[];
  private readonly [FlowActionNames]: Set<string>;

  public readonly [FlowName]: string;

  constructor(name: string) {
    if (typeof name !== 'string' || !name.length) {
      throw new TypeError(
        'Flow constructor expects a non-empty string as the first argument');
    }
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
    if (!Flow.validString(name)) {
      throw new TypeError(
        'Flow addAction expects a non-empty string as the first argument');
    }
    if (this[FlowActionNames].has(name)) {
      throw new TypeError(
        `Every Flow's action names must be unique. Unexpected duplicate name: ${name}`);
    }
    if (typeof resolve !== 'function') {
      throw new TypeError(
        'Flow addAction expects a function as the second argument');
    }
    this[FlowActionNames].add(name);
    this[FlowActions].push({ name, resolve });
    return this;
  }

  public addActions(...actions: (FlowAction|FlowAction[])[]): Flow {
    actions = <FlowAction[]>actions.reduce(
      (acc: FlowAction[], e: FlowAction | FlowAction[]) => {
        if (Array.isArray(e)) acc = [...acc, ...e];
        else acc.push(e);
        return acc;
      },
      (<FlowAction[]>[]),
    );
    if (actions.length === 0) {
      throw new TypeError(
        'Flow addActions must add at least one action to the flow');
    }
    actions.map(
      (flowAction: FlowAction) => {
        if (
          !(flowAction
            && flowAction.hasOwnProperty('name')
            && (typeof flowAction !== 'function')
            && (!Array.isArray(flowAction))
            && Flow.validString(flowAction.name))
        ) {
          throw new TypeError(
            'Flow addActions expects an array of objects with a name property set to a non-empty string');
        }
        if (
          !(flowAction.hasOwnProperty('resolve')
            && typeof flowAction.resolve === 'function')
        ) {
          throw new TypeError(
            'Flow addActions expects an array of objects with a resolve property set to a function');
        }
        this.addAction(flowAction.name, flowAction.resolve);
      });
    return this;
  }

  public [FlowSelectActionResolver](i: number): FlowActionResolver {
    const flowEntry = this[FlowActions][i];
    if (!flowEntry) return null;
    return flowEntry.resolve;
  }

  public [FlowSelectName](i: number): string {
    const flowEntry = this[FlowActions][i];
    if (!flowEntry) return null;
    return flowEntry.name;
  }
}
