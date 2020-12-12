import Action, {
  ActionContext,
  GetContext,
} from "./Action";
import { SmsCookie } from "../SmsCookie";
import { TwilioWebhookRequest } from '../twllio';


export const MAXIMUM_RETRIES_ALLOWED = 10;


export type AnswerValidator =
  (answer: string) => (boolean | Promise<boolean>);


export interface QuestionContext extends ActionContext {
  answer: string | number;
  attempts?: string[];
  body: string;
  questionType: string;
  wasAnswered: boolean;
  wasFailed: boolean;
}


const MutlipleChoiceQuestion = Symbol('mutlipleChoice');
const TextQuestion = Symbol('text');

export const QuestionTypeMap = {
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
  failedToAnswerResponse: 'Sorry, I do not understand your answer.',
  invalidAnswerResponse: 'Hmm. I didn\'t quite understand your answer. Please try again.',
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
export const QuestionSetIsAnswered = Symbol('setIsAnswered');
export const QuestionSetIsFailed = Symbol('setIsFailed');
export const QuestionShouldContinueOnFail = Symbol('shouldContinueOnFailure');
export const QuestionSetShouldSendInvalidRes = Symbol('setShouldSendInvalidRes');

export default class Question extends Action {
  static Types: QuestionTypes = {
    MultipleChoice: MutlipleChoiceQuestion,
    Text: TextQuestion,
  }

  static validString(s: any): boolean {
    return (typeof s === 'string')
      && Boolean(s.length);
  }

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
    if (!Question.validString(body)) {
      throw new TypeError(
        'The first argument of the Question constructor must be a non-empty string');
    }
    if (
      (type === TextQuestion)
        && (choices !== defaultOptions.choices)
    ) {
      throw new TypeError(
        'A text Question cannot have a \'choices\' option');
    }
    if (
      (type === MutlipleChoiceQuestion) && (
        (!choices)
        || (!Array.isArray(choices))
        || (choices.length < 2)
        || (choices.some(
          (v: (answer: string) => boolean) => typeof v !== 'function')))
    ) {
      throw new TypeError(
        'Multiple choice Questions must include a \'choices\' option, an array of at least 2 functions of a string which return a boolen');
    }
    if (
      (type === MutlipleChoiceQuestion)
        && (validateAnswer !== defaultOptions.validateAnswer)
    ) {
      throw new TypeError(
        'Multiple choice Questions cannot have a validateAnswer option');
    }
    if (!Question.validString(failedToAnswerResponse)) {
      throw new TypeError(
        'Question failedToAnswerResponse option must be a non-empty string');
    }
    if (!Question.validString(invalidAnswerResponse)) {
      throw new TypeError(
        'Question invalidAnswerResponse option must be a non-empty string');
    }
    if (
      isNaN(maxRetries) ||
      (f =>
        (f(maxRetries) < 0
          || f(maxRetries) > MAXIMUM_RETRIES_ALLOWED))(Math.round)
    ) {
      throw new TypeError(
        `Question maxRetries option must be a number from 0 to ${MAXIMUM_RETRIES_ALLOWED}.`);
    }
    if (type !== TextQuestion && type !== MutlipleChoiceQuestion) {
      type = TextQuestion;
    }
    if (typeof validateAnswer !== 'function') {
      throw new TypeError(
        'Question validateAnswer option must be a function');
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
    this[QuestionShouldContinueOnFail] = Boolean(continueOnFailure);
    this[QuestionShouldSendInvalidRes] = false;
    this[QuestionType] = type;
    this[GetContext] = this.getQuestionContext.bind(this);
  }

  private getQuestionContext(): QuestionContext {
    return {
      answer: this.answer,
      body: this.body,
      questionType: QuestionTypeMap[this.type],
      wasAnswered: this.isAnswered,
      wasFailed: this.isFailed,
    };
  }

  private handleInvalidAnswer(state: SmsCookie) {
    if (state.question.attempts.length >= this.maxRetries) {
      this[QuestionIsFailed] = true;
    } else {
      this[QuestionShouldSendInvalidRes] = true;
    }
  }

  private setAnswer(answer: string | number) {
    this[QuestionIsAnswered] = true;
    this[QuestionAnswer] = answer;
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
    messageBody: string,
    state: SmsCookie,
  ) {
    if (!state.question.isAnswering) return;
    if (
      (this.type === Question.Types.Text)
        && (await this.validateAnswer(messageBody))
    ) {
      this.setAnswer(messageBody);
      return;
    }

    if (this.type === Question.Types.MultipleChoice) {
      const choices =
        await Promise.all(
          this.choices.map(
            (validate: AnswerValidator) => validate(messageBody)));
      const validChoices =
        choices.map((_, i) => i)
                .filter(i => choices[i]);

      if (validChoices.length === 1) {
        this.setAnswer(<number>validChoices[0]);
        return;
      }
    }

    this.handleInvalidAnswer(state);
  }

  public [QuestionSetIsAnswered]() {
    this[QuestionIsAnswered] = true;
  }

  public [QuestionSetIsFailed]() {
    this[QuestionIsFailed] = true;
  }

  public [QuestionSetShouldSendInvalidRes]() {
    this[QuestionShouldSendInvalidRes] = true;
  }
}
