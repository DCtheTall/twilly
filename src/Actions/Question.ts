import Action, {
  ActionContext,
  GetContext,
} from "./Action";
import { SmsCookie } from "../SmsCookie";
import { TwilioWebhookRequest } from '../twllio';
import { ErrorHandler } from "../util";


export type AnswerValidator =
  (answer: string) => (boolean | Promise<boolean>);


export interface QuestionContext extends ActionContext {
  answer: string | number;
  attempts?: string[];
  body: string;
  type: string;
  wasAnswered: boolean;
  wasFailed: boolean;
}


const MutlipleChoiceQuestion = Symbol('mutlipleChoice');
const TextQuestion = Symbol('text');

const QuestionTypeMap = {
  [MutlipleChoiceQuestion]: 'multipleChoice',
  [TextQuestion]: 'text',
};

export interface QuestionTypes {
  MultipleChoice: symbol;
  Text: symbol;
};


export interface QuestionOptions {
  choices?: AnswerValidator[];
  continueOnFailure?: boolean;
  failedToAnswerResponse?: string;
  invalidAnswerResponse?: string;
  maxRetries?: number;
  type?: symbol;
  validateAnswer?: AnswerValidator;
}

const defaultOptions = <QuestionOptions>{
  choices: [],
  continueOnFailure: false,
  failedToAnswerResponse: 'Sorry, I do not understand your answer. Please try again.',
  invalidAnswerResponse: 'Hmm. I didn\'t quite understand your answer.',
  maxRetries: 1,
  type: TextQuestion,
  validateAnswer: () => true,
};


const QuestionAnswer = Symbol('answer');
const QuestionAnswerValidator = Symbol('answerValidator');
const QuestionBody = Symbol('body');
const QuestionChoices = Symbol('choices');
const QuestionFailedToAnswerRes = Symbol('failedToAnswerResponse');
const QuestionInvalidAnswerRes = Symbol('invalidAnswerResponse');
const QuestionIsAnswered = Symbol('isAnswered');
const QuestionIsFailed = Symbol('isFailed');
const QuestionMaxRetries = Symbol('maxRetries');
const QuestionShouldSendInvalidRes = Symbol('shouldSendInvalidResponse');
const QuestionType = Symbol('type');

export const QuestionEvaluate = Symbol('evaluate');
export const QuestionHandleInvalidAnswer = Symbol('handleInvalidAnswer');
export const QuestionSetAnswer = Symbol('setAnswer');
export const QuestionShouldContinueOnFail = Symbol('shouldContinueOnFailure');

export default class Question extends Action {
  static Types: QuestionTypes = {
    MultipleChoice: MutlipleChoiceQuestion,
    Text: TextQuestion,
  };

  private [QuestionAnswer]: string | number;
  private [QuestionAnswerValidator]: AnswerValidator;
  private [QuestionBody]: string;
  private [QuestionChoices]: AnswerValidator[];
  private [QuestionFailedToAnswerRes]: string;
  private [QuestionInvalidAnswerRes]: string;
  private [QuestionIsAnswered]: boolean;
  private [QuestionIsFailed]: boolean;
  private [QuestionMaxRetries]: number;
  private [QuestionShouldSendInvalidRes]: boolean;
  private [QuestionType]: symbol;

  public [QuestionShouldContinueOnFail]: boolean;

  constructor(
    body: string,
    {
      choices = defaultOptions.choices,
      continueOnFailure = defaultOptions.continueOnFailure,
      failedToAnswerResponse = defaultOptions.failedToAnswerResponse,
      invalidAnswerResponse = defaultOptions.invalidAnswerResponse,
      maxRetries = defaultOptions.maxRetries,
      type = defaultOptions.type,
      validateAnswer = defaultOptions.validateAnswer,
    }: QuestionOptions = defaultOptions,
  ) {
    if (
      (type === MutlipleChoiceQuestion) && (
        (!choices)
        || (!Array.isArray(choices))
        || (choices.length < 2)
        || (!choices.every(
          (v: (answer: string) => boolean) => typeof v === 'function')))
    ) {
      throw new TypeError(
        'Multiple choice Questions must include a \'choices\' option, an array of at least 2 functions of a string which return a boolen');
    }
    if (isNaN(maxRetries)) {
      throw new TypeError(
        `Question maxRetries option must be a number.`);
    }
    super();
    this[QuestionAnswer] = null;
    this[QuestionAnswerValidator] = validateAnswer;
    this[QuestionBody] = body;
    this[QuestionChoices] = choices;
    this[QuestionFailedToAnswerRes] = failedToAnswerResponse;
    this[QuestionInvalidAnswerRes] = invalidAnswerResponse;
    this[QuestionIsAnswered] = false;
    this[QuestionMaxRetries] = Number(maxRetries);
    this[QuestionIsFailed] = false;
    this[QuestionShouldContinueOnFail] = continueOnFailure;
    this[QuestionShouldSendInvalidRes] = false;
    this[QuestionType] = type;
    this[GetContext] = this.getQuestionContext.bind(this);
  }

  private getQuestionContext(): QuestionContext {
    return {
      answer: this.answer,
      body: this.body,
      type: QuestionTypeMap[this.type],
      wasAnswered: this.isAnswered,
      wasFailed: this.isFailed,
    };
  }

  get answer(): string | number {
    return this[QuestionAnswer];
  }

  get body(): string {
    return this[QuestionBody];
  }

  get choices(): AnswerValidator[] {
    return this[QuestionChoices];
  }

  get failedAnswerResponse(): string {
    return this[QuestionFailedToAnswerRes];
  }

  get invalidAnswerResponse(): string {
    return this[QuestionInvalidAnswerRes];
  }

  get isAnswered(): boolean {
    return this[QuestionIsAnswered];
  }

  get isComplete(): boolean {
    return this.isAnswered || this.isFailed;
  }

  get isFailed(): boolean {
    return this[QuestionIsFailed];
  }

  get maxRetries(): number {
    return this[QuestionMaxRetries];
  }

  get type(): symbol {
    return this[QuestionType];
  }

  get shouldSendInvalidRes(): boolean {
    return this[QuestionShouldSendInvalidRes];
  }

  get validateAnswer(): AnswerValidator {
    return this[QuestionAnswerValidator];
  }

  public async [QuestionEvaluate](
    req: TwilioWebhookRequest,
    state: SmsCookie,
    handleError: ErrorHandler,
  ) {
    if (!state.question.isAnswering) return;

    try {
      if (
        this.type === Question.Types.Text &&
        await this.validateAnswer(req.body.Body)
      ) {
        this[QuestionSetAnswer](req.body.Body);
        return;
      }

      if (this.type === Question.Types.MultipleChoice) {
        const choices =
          await Promise.all(
            this.choices.map(
              (validate: AnswerValidator) => validate(req.body.Body)));
        const validChoices =
          choices.map((_, i) => i)
                .filter(i => choices[i]);

        if (validChoices.length === 1) {
          this[QuestionSetAnswer](<number>validChoices[0]);
          return;
        }
      }

      this[QuestionHandleInvalidAnswer](state);
    } catch (err) {
      throw err;
    }
  }

  public [QuestionHandleInvalidAnswer](state: SmsCookie) {
    if (state.question.attempts.length >= this.maxRetries) {
      this[QuestionIsFailed] = true;
    } else {
      this[QuestionShouldSendInvalidRes] = true;
    }
  }

  public [QuestionSetAnswer](answer: string | number) {
    this[QuestionIsAnswered] = true;
    this[QuestionAnswer] = answer;
  }
}
