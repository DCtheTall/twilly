import {
  Flow,
  FlowSchema,
  EvaluatedSchema,
  evaluateSchema,
} from '.';
import {
  Action,
  Trigger,
} from '../Actions';
import {
  SmsCookie,
  updateContext,
} from '../SmsCookie';


export default class FlowController {
  private readonly root: Flow;
  private readonly schema: EvaluatedSchema;

  constructor(
    root: Flow,
    schema?: FlowSchema,
  ) {
    if (root.length === 0) {
      throw new TypeError(
        'All Flows must perform at least one action');
    }
    this.root = root;
    if (schema) {
      this.schema = evaluateSchema(root, schema);
    }
  }

  private getCurrentFlow(state: SmsCookie): Flow {
    let result: Flow;

    if (
      (!state.flow) ||
      (state.flow === this.root.name)
    ) {
      result = this.root;
    } else {
      result = this.schema.get(state.flow);
    }
    return result;
  }

  public async deriveActionFromState(
    state: SmsCookie,
    userCtx: any,
  ): Promise<Action> {
    if (!state) {
      return null;
    }

    const i = Number(state.flowAction);
    const currFlow = this.getCurrentFlow(state);
    const resolveNextAction = currFlow.selectActionResolver(i);

    if (!resolveNextAction) return null;
    try {
      const action = await resolveNextAction(state.context, userCtx);

      if (!(action instanceof Action)) {
        return null;
      }
      action.setName(currFlow.selectName(i));
      return action;
    } catch (err) {
      // TODO err handling
      throw err;
    }
  }

  public async deriveNextStateFromAction(
    state: SmsCookie,
    action: Action,
  ): Promise<SmsCookie> {
    if (!(action instanceof Action)) return null;

    const currFlow = this.getCurrentFlow(state);
    const newState = updateContext(state, currFlow, action);

    if (action instanceof Trigger) {
      const newFlow =
        action.flowName === this.root.name ?
          this.root : this.schema.get(action.flowName);

      if (!newFlow) {
        // TODO typed error
        throw new Error(
          'Trigger constructors expect a name of an existing Flow');
      }
      if ((currFlow === this.root) && (!this.schema)) {
        throw new TypeError(
          'Cannot use Trigger action without a defined Flow schema');
      }

      state.flow = this.schema.get(action.flowName).name;
      state.flowAction = 0;
      return state;
    }

    state.flowAction = Number(state.flowAction) + 1;
    if (state.flowAction === currFlow.length) {
      return null;
    }
    return state;
  }
}
