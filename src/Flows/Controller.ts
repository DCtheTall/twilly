import {
  Flow,
  FlowSchema,
  EvaluatedSchema,
  evaluateSchema,
} from '.';
import {
  Action,
  Question,
  Trigger,
  QuestionSetAnswer,
  QuestionSetIsFailed,
  QuestionSetShouldSendInvalidRes,
  QuestionShouldContinueOnFail,
} from '../Actions';
import {
  SmsCookie,
  handleTrigger,
  incrementFlowAction,
  updateContext,
  startQuestion,
} from '../SmsCookie';
import { TwilioWebhookRequest } from '../TwilioController';


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
      // DFS of schema to get each user-defined flow
      // uniqueness of each flow name is guaranteed or it will throw err
      this.schema = evaluateSchema(root, schema);
    }
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

  public async deriveActionFromState(
    req: TwilioWebhookRequest,
    state: SmsCookie,
    userCtx: any,
  ): Promise<Action> {
    if (!state) {
      return null;
    }

    const key = Number(state.flowKey);
    const currFlow = this.getCurrentFlow(state);
    const resolveNextAction = currFlow.selectActionResolver(key);

    if (!resolveNextAction) return null;
    try {
      const action = await resolveNextAction(state.context, userCtx);

      if (action instanceof Question && state.question.isAnswering) {
        if (await action.validateAnswer(req.body.Body)) {
          action[QuestionSetAnswer](req.body.Body);
        } else {
          action[
            state.question.attempts.length === action.maxRetries ?
              QuestionSetIsFailed : QuestionSetShouldSendInvalidRes]();
        }
      }

      if (!(action instanceof Action)) {
        return null;
      }
      action.setName(currFlow.selectName(key));
      return action;
    } catch (err) {
      // TODO err handling
      throw err;
    }
  }

  public async deriveNextStateFromAction(
    req: TwilioWebhookRequest,
    state: SmsCookie,
    action: Action,
  ): Promise<SmsCookie> {
    if (!(action instanceof Action)) return null;

    const currFlow = this.getCurrentFlow(state);

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
        return (async (): Promise<SmsCookie> => {
          const question = <Question>action;

          if (question.isAnswered) {
            state.question.isAnswering = false;
            state.question.attempts = [];
            return updateContext(
              incrementFlowAction(state, currFlow), currFlow, action);
          }
          if (question.isFailed) {
            if (question[QuestionShouldContinueOnFail]) {
              return updateContext(
                incrementFlowAction(state, currFlow), currFlow, action);
            }
            return null;
          }

          if (state.question.isAnswering) {
            return {
              ...state,
              question: {
                ...state.question,
                attempts: [...state.question.attempts, req.body.Body],
              },
            };
          }

          return updateContext(
            startQuestion(state), currFlow, action);
        })();
    }
    return updateContext(
      incrementFlowAction(state, currFlow), currFlow, action);
  }
}
