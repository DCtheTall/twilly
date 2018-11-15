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
  addQuestionAttempt,
} from '../SmsCookie';
import { TwilioWebhookRequest } from '../twllio';


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
    if (schema && !(schema instanceof FlowSchema)) {
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
    if (!(this.schema && this.schema.has(state.flow))) {
      throw new TypeError(
        `Received invalid flow name in SMS cookie: ${state.flow}`);
    }
    return this.schema.get(state.flow);
  }

  public async resolveActionFromState(
    req: TwilioWebhookRequest,
    state: SmsCookie,
    userCtx: any,
  ): Promise<Action> {
    if (state.isComplete) {
      return null;
    }
    if (this.testForExit && await this.testForExit(req.body.Body)) {
      return new Exit(req.body.Body);
    }

    const key = Number(state.flowKey);
    const currFlow = this.getCurrentFlow(state);
    const resolveAction = currFlow[FlowSelectActionResolver](key);

    if (!resolveAction) {
      return null;
    }

    const action = await resolveAction(state.flowContext, userCtx);
    if (action instanceof Question) {
      await action[QuestionEvaluate](req, state);
    }
    if (!(action instanceof Action)) {
      return null;
    }
    action[ActionSetName](currFlow[FlowSelectName](key));

    return action;
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

    switch (action.constructor) {
      case Question:
        return ((): SmsCookie => {
          const question = <Question>action;

          if (state.question.isAnswering) {
            state = addQuestionAttempt(state, req.body.Body);
          }
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

      case Trigger:
        return ((): SmsCookie => {
          const trigger = <Trigger>action;

          if ((currFlow === this.root) && (!this.schema)) {
            throw new Error(
              'Cannot use Trigger action without a defined Flow schema');
          }
          if (
            !(trigger.flowName === this.root.name
              || this.schema.has(trigger.flowName))
          ) {
            throw new Error(
              'Trigger constructors expect a name of an existing Flow');
          }

          return handleTrigger(
            updateContext(state, currFlow, action), trigger);
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
