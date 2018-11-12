import {
  EvaluatedSchema,
  Flow,
  FlowSchema,
  FlowSelectActionResolver,
  FlowSelectName,
  evaluateSchema,
} from '.';
import {
  Action,
  ActionSetName,
  Exit,
  Question,
  QuestionShouldContinueOnFail,
  Trigger,
  QuestionEvaluate,
} from '../Actions';
import {
  InteractionContext,
  SmsCookie,
  completeInteraction,
  handleTrigger,
  incrementFlowAction,
  startQuestion,
  updateContext,
} from '../SmsCookie';
import { TwilioWebhookRequest } from '../twllio';
import { ErrorHandler } from '../util';


export type ExitKeywordTest =
  (body: string) => (boolean | Promise<boolean>);

export type InteractionEndHook =
  (context: InteractionContext, userCtx: any) => any;


export interface FlowControllerOptions {
  onInteractionEnd?: InteractionEndHook;
  testForExit?: ExitKeywordTest;
}

const defaultOptions = <FlowControllerOptions>{
  onInteractionEnd: () => null,
  testForExit: null,
};


export default class FlowController {
  private readonly root: Flow;
  private readonly schema: EvaluatedSchema;
  private testForExit: ExitKeywordTest;

  public onInteractionEnd: InteractionEndHook;

  constructor(
    root: Flow,
    schema?: FlowSchema,
    {
      onInteractionEnd = defaultOptions.onInteractionEnd,
      testForExit = defaultOptions.testForExit,
    }: FlowControllerOptions = defaultOptions,
  ) {
    if (!(root instanceof Flow)) {
      throw new TypeError(
        'root parameter must be an instance of Flow');
    }
    if (root.length === 0) {
      throw new TypeError(
        'All Flows must perform at least one action. Check the root Flow');
    }
    if (schema !== undefined && !(schema instanceof FlowSchema)) {
      throw new TypeError(
        'schema parameter must be an instance of FlowSchema');
    }
    // other type checking here
    this.root = root;
    if (schema) {
      // DFS of schema to get each user-defined flow
      // uniqueness of each flow name is guaranteed or it will throw err
      this.schema = evaluateSchema(root, schema);
      if (this.schema.size === 1) {
        throw new TypeError(
          'If you provide the schema parameter, it must include a flow distinct from the root Flow');
      }
    }
    this.onInteractionEnd = onInteractionEnd;
    this.testForExit = testForExit;
  }

  private getCurrentFlow(state: SmsCookie): Flow {
    if (
      (!state.flow) ||
      (state.flow === this.root.name)
    ) {
      return this.root;
    }
    return this.schema.get(state.flow);
  }

  public async resolveActionFromState(
    req: TwilioWebhookRequest,
    state: SmsCookie,
    userCtx: any,
    handleError: ErrorHandler,
  ): Promise<Action> {
    if (state.isComplete) {
      return null;
    }
    if (this.testForExit && await this.testForExit(req.body.Body)) {
      return new Exit(req.body.From);
    }

    const key = Number(state.flowKey);
    const currFlow = this.getCurrentFlow(state);
    const resolveAction = currFlow[FlowSelectActionResolver](key);

    if (!resolveAction) {
      return null;
    }
    try {
      const action = await resolveAction(state.flowContext, userCtx);
      if (action instanceof Question) {
        await action[QuestionEvaluate](req, state, handleError);
      }
      if (!(action instanceof Action)) {
        return null;
      }
      action[ActionSetName](currFlow[FlowSelectName](key));
      return action;
    } catch (err) {
      handleError(err);
    }
  }

  public resolveNextStateFromAction(
    req: TwilioWebhookRequest,
    state: SmsCookie,
    action: Action,
  ): SmsCookie {
    const currFlow = this.getCurrentFlow(state);

    if (!(action instanceof Action)) {
      return completeInteraction(state);
    }
    if (action instanceof Exit) {
      return completeInteraction(
        updateContext(state, currFlow, action));
    }
    if (!state.createdAt) {
      state.createdAt = new Date();
    }

    switch (action.constructor) {
      case Trigger:
        return ((): SmsCookie => {
          const newFlow =
            (<Trigger>action).flowName === this.root.name ?
              this.root : this.schema.get((<Trigger>action).flowName);
          if (!newFlow) {
            // TODO typed error
            throw new Error(
              'Trigger constructors expect a name of an existing Flow');
          }
          if ((currFlow === this.root) && (!this.schema)) {
            throw new TypeError(
              'Cannot use Trigger action without a defined Flow schema');
          }
          return handleTrigger(
            updateContext(state, currFlow, action), <Trigger>action);
        })();

      case Question:
        return ((): SmsCookie => {
          const question = <Question>action;

          state.question.attempts.push(req.body.Body);
          if (question.isAnswered) {
            return incrementFlowAction(
              updateContext(
                state,
                currFlow,
                action,
              ),
              currFlow,
            );
          }
          if (question.isFailed) {
            if (question[QuestionShouldContinueOnFail]) {
              return incrementFlowAction(
                updateContext(
                  state,
                  currFlow,
                  action,
                ),
                currFlow,
              );
            }
            return completeInteraction(
              updateContext(state, currFlow, action));
          }
          if (state.question.isAnswering) {
            return updateContext(state, currFlow, action);
          }

          return updateContext(
            startQuestion(state), currFlow, action);
        })();

      default:
        return incrementFlowAction(
          updateContext(
            state,
            currFlow,
            action,
          ),
          currFlow,
        );
    }
  }
}
