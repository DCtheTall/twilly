import { NAME, FLOW_LENGTH } from '../symbols';

import { Action } from '../Actions';
import { SmsCookie } from '../SmsCookie';
import {
  Flow,
  FlowSchema,
  EvaluatedSchema,
  evaluateSchema,
  FlowAction,
} from '../Flows';


export default class FlowController {
  private readonly root: Flow;
  private readonly schema: EvaluatedSchema;

  constructor(
    root: Flow,
    schema?: FlowSchema,
  ) {
    if (root[FLOW_LENGTH] === 0) {
      throw new TypeError(
        'All Flows must perform at least one action');
    }
    this.root = root;
    if (schema) {
      this.schema = evaluateSchema(root, schema);
    }
  }

  public async deriveActionFromState(state: SmsCookie, userCtx: any): Promise<Action> {
    let currFlow: Flow;
    let currFlowAction: FlowAction;

    if (state === undefined) {
      currFlow = this.root;
      currFlowAction = this.root.selectAction(0);
    } else {
      currFlow =
        state.currFlow === this.root[NAME] ?
          this.root : this.schema[state.currFlow];
      currFlowAction = currFlow.selectAction(Number(state.currFlowAction));
    }
    let action: Action;
    try {
      action = await currFlowAction({}, userCtx);
    } catch (err) {
      // TODO err handling
      throw err;
    }
    return action;
  }
}
