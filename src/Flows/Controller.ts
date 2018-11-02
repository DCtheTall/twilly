import {
  EvaluatedSchema,
  Flow,
  FlowSchema,
  evaluateSchema,
} from '.';
import {
  Action,
  AnswerValidator,
  Exit,
  Question,
  QuestionSetAnswer,
  QuestionHandleInvalidAnswer,
  QuestionShouldContinueOnFail,
  Trigger,
} from '../Actions';
import {
  InteractionContext,
  SmsCookie,
  handleTrigger,
  incrementFlowAction,
  startQuestion,
  updateContext,
} from '../SmsCookie';
import { TwilioWebhookRequest } from '../TwilioController';


export type ExitKeywordTest =
  (body: string) => (boolean | Promise<boolean>);

export type InteractionEndHook =
  (context: InteractionContext, user: any) => any;


export default class FlowController {
  static async performQuestionEvaluation(
    req: TwilioWebhookRequest,
    state: SmsCookie,
    action: Action,
  ) {
    if (
      !(action instanceof Question &&
      state.question.isAnswering)
    ) return action;

    if (
      action.type === Question.Types.Text &&
      await action.validateAnswer(req.body.Body)
    ) {
      action[QuestionSetAnswer](req.body.Body);
    } else if (action.type === Question.Types.MultipleChoice) {
      const choices =
        await Promise.all(
          action.choices.map(
            (validate: AnswerValidator) => validate(req.body.Body)));
      const validChoices =
        choices.map((_, i) => i).filter(i => choices[i]);

      if (validChoices.length === 1) {
        action[QuestionSetAnswer](<number>validChoices[0]);
      } else {
        action[QuestionHandleInvalidAnswer](state);
      }
    } else {
      action[QuestionHandleInvalidAnswer](state);
    }
    return action;
  }

  private readonly root: Flow;
  private readonly schema: EvaluatedSchema;

  private onInteractionEnd: InteractionEndHook;
  private testForExit: ExitKeywordTest;

  constructor(
    root: Flow,
    schema?: FlowSchema,
  ) {
    if (root.length === 0) {
      throw new TypeError(
        'All Flows must perform at least one action');
    }
    this.root = root;
    if (schema && !(schema instanceof FlowSchema)) {
      throw new TypeError(
        'The twilly schema parameter must be an instance of FlowSchema');
    }
    if (schema) {
      // DFS of schema to get each user-defined flow
      // uniqueness of each flow name is guaranteed or it will throw err
      this.schema = evaluateSchema(root, schema);
    }
  }

  private completeInteraction() {}

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
    if (this.testForExit && await this.testForExit(req.body.Body)) {
      return new Exit(req.body.From);
    }

    const key = Number(state.flowKey);
    const currFlow = this.getCurrentFlow(state);
    const resolveAction = currFlow.selectActionResolver(key);

    if (!resolveAction) {
      return null;
    }
    try {
      const action =
        FlowController.performQuestionEvaluation( // does nothing if action is not question
          req, state, await resolveAction(state.context, userCtx));
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
    if (action instanceof Exit || !(action instanceof Action)) {
      return null;
    }

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

  public setInteractionEndHook(hook: InteractionEndHook) {
    this.onInteractionEnd = hook;
  }

  public setTestForExit(testForExit: ExitKeywordTest) {
    this.testForExit = testForExit;
  }
}
