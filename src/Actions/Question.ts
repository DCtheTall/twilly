import Action, {
  ActionContext,
  GetActionContext,
} from "./Action";


export interface QuestionContext extends ActionContext {
  answer: string | number;
  body: string;
  type: string;
  wasAnswered: boolean;
  wasFailed: boolean;
}


const MutlipleChoiceQuestion = Symbol('mutlipleChoice');
const TextQuestion = Symbol('text');

enum QuestionTypes {
  MutlipleChoice,
  TextQuestion,
}

const QuestionTypeMap = {
  [QuestionTypes[MutlipleChoiceQuestion]]: 'multipleChoice',
  [QuestionTypes[TextQuestion]]: 'text',
};


export interface QuestionOptions {
  choices?: ((answer: string) => boolean)[];
  continueOnFailure?: boolean;
  failedToAnswerResponse?: string;
  invalidAnswerResponse?: string;
  maxRetries?: number;
  type?: QuestionTypes;
  validateAnswer?: (answer: string) => boolean;
}

const defaultOptions = <QuestionOptions>{
  choices: [],
  continueOnFailure: false,
  failedToAnswerResponse: 'Sorry, I do not understand your answer. Please try again.',
  invalidAnswerResponse: 'Hmm. I didn\'t quite understand your answer.',
  maxRetries: 1,
  type: QuestionTypes[TextQuestion],
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

export const QuestionSetAnswer = Symbol('setAnswer');
export const QuestionSetIsFailed = Symbol('setIsFailed');
export const QuestionSetShouldSendInvalidRes = Symbol('setShouldSendInvalidRes');
export const QuestionShouldContinueOnFail = Symbol('shouldContinueOnFailure');

export default class Question extends Action {
  static MultipleChoice: number =
    QuestionTypes[MutlipleChoiceQuestion];

  static Text: number =
    QuestionTypes[TextQuestion];

  private [QuestionAnswer]: string | number;
  private [QuestionAnswerValidator]: (answer: string) => boolean;
  private [QuestionBody]: string;
  private [QuestionChoices]: ((answer: string) => boolean)[];
  private [QuestionFailedToAnswerRes]: string;
  private [QuestionInvalidAnswerRes]: string;
  private [QuestionIsAnswered]: boolean;
  private [QuestionIsFailed]: boolean;
  private [QuestionMaxRetries]: number;
  private [QuestionShouldSendInvalidRes]: boolean;
  private [QuestionType]: number;

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
      (type === QuestionTypes[MutlipleChoiceQuestion]) && (
        (!choices)
        || (!Array.isArray(choices))
        || (!choices.every(
          (v: (answer: string) => boolean) => typeof v === 'function')))
    ) {
      throw new TypeError(
        'Multiple choice Questions must include a \'choices\' option, an array of functions of a string which return a boolen');
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
    this[GetActionContext] = this.getQuestionContext.bind(this);
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

  get choices(): ((answer: string) => boolean)[] {
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

  get type(): number {
    return this[QuestionType];
  }

  get shouldSendInvalidRes(): boolean {
    return this[QuestionShouldSendInvalidRes];
  }

  get validateAnswer(): (answer: string) => boolean {
    return this[QuestionAnswerValidator];
  }

  public [QuestionSetAnswer](answer: string | number) {
    this[QuestionIsAnswered] = true;
    this[QuestionAnswer] = answer;
  }

  public [QuestionSetIsFailed]() {
    this[QuestionIsFailed] = true;
  }

  public [QuestionSetShouldSendInvalidRes]() {
    this[QuestionShouldSendInvalidRes] = true;
  }
}
