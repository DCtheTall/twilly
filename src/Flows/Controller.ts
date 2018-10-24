import {
  NAME,
  FLOW_LENGTH,
} from '../symbols';

import {
  Flow,
  FlowSchema,
  EvaluatedSchema,
  evaluateSchema,
  FlowActionResolver,
} from '.';
import {
  Action,
  Trigger,
} from '../Actions';
import { SmsCookie } from '../SmsCookie';


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
    let resolveNextAction: FlowActionResolver;
    let action: Action;

    if (!state.currFlow || state.currFlow === this.root[NAME]) {
      currFlow = this.root;
    } else {
      currFlow = this.schema.get(state.currFlow);
    }

    resolveNextAction = currFlow.selectActionResolver(i);
    if (!resolveNextAction) return null;

    try {
      action = await resolveNextAction(state.context, userCtx);
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
    if (!(action instanceof Action)) return null;

    let currFlow: Flow;

    if (
      (!state.currFlow) ||
      (state.currFlow === this.root[NAME])
    ) {
      currFlow = this.root;
    } else {
      currFlow = this.schema.get(state.currFlow);
    }

    if (!state.context[currFlow[NAME]]) {
      state.context[currFlow[NAME]] = {};
    }
    state.context[currFlow[NAME]][action[NAME]] = action.getContext();

    if (action instanceof Trigger) {
      if (currFlow === this.root && (!this.schema)) {
        throw new TypeError(
          'Cannot use Trigger action without a defined Flow schema');
      }
      state.currFlow = this.schema.get(action.flowName)[NAME];
      state.currFlowAction = 0;
      return state;
    }

    state.currFlowAction = Number(state.currFlowAction) + 1;
    if (state.currFlowAction === currFlow[FLOW_LENGTH]) {
      return null;
    }
    return state;
  }
}
