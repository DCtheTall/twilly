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

  public async deriveActionFromState(
    state: SmsCookie,
    userCtx: any,
  ): Promise<Action> {
    if (!state) {
      return null;
    }

    const i = Number(state.currFlowAction);

    let currFlow: Flow;
    let currFlowAction: FlowAction;
    let action: Action;

    if (!state.currFlow || state.currFlow === this.root[NAME]) {
      currFlow = this.root;
    } else {
      currFlow = this.schema[state.currFlow];
    }
    currFlowAction = currFlow.selectAction(i);
    if (!currFlowAction) return null;
    try {
      action = await currFlowAction(state.flowCtx, userCtx);
      if (!(action instanceof Action)) {
        return null;
      }
      action.setName(currFlow.selectName(i));
    } catch (err) {
      // TODO err handling
      throw err;
    }
    return action;
  }

  public async deriveNextStateFromAction(
    state: SmsCookie,
    action: Action,
  ): Promise<SmsCookie> {
    if (!action) return null;

    let currFlow: Flow;

    if (!state.currFlow || state.currFlow === this.root[NAME]) {
      currFlow = this.root;
    } else {
      currFlow = this.schema[state.currFlow];
    }
    state.flowCtx[action[NAME]] = action.getContext();
    state.currFlowAction = Number(state.currFlowAction) + 1;
    if (state.currFlowAction === currFlow[FLOW_LENGTH]) {
      return null;
    }
    return state;
  }
}
