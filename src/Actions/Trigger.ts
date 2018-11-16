import Action, {
  ActionContext,
  GetContext,
} from './Action';


export interface TriggerContext extends ActionContext {
  triggerFlowName: string;
}


const TriggerFlowName = Symbol('flowName');

export default class Trigger extends Action {
  private readonly [TriggerFlowName]: string;

  constructor(triggerFlowName: string) {
    if (typeof triggerFlowName !== 'string' || !triggerFlowName.length) {
      throw new TypeError(
        'Trigger constructor expects a non-empty string as its constructor argument');
    }
    super();
    this[TriggerFlowName] = triggerFlowName;
    this[GetContext] =
      (): TriggerContext => ({ triggerFlowName });
  }

  get flowName(): string {
    return this[TriggerFlowName];
  }
}
