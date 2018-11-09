import Action, {
  ActionContext,
  GetContext,
} from './Action';


export interface TriggerContext extends ActionContext {
  flowName: string;
}


const TriggerFlowName = Symbol('flowName');

export default class Trigger extends Action {
  private readonly [TriggerFlowName]: string;

  constructor(flowName: string) {
    if (typeof flowName !== 'string') {
      throw new TypeError(
        'Trigger constructor expects a string as the second argument');
    }
    super();
    this[TriggerFlowName] = flowName;
    this[GetContext] =
      (): TriggerContext => ({ flowName });
  }

  get flowName(): string {
    return this[TriggerFlowName];
  }
}
