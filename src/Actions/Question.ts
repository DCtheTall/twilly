import Action, {
  ActionContext,
  GetActionContext,
} from "./Action";
import { SmsCookie } from '../SmsCookie';


export interface QuestionContext extends ActionContext {
  answer: string | number;
  body: string;
  type: string;
  wasAnswered: boolean;
}


const MutlipleChoiceQuestion = Symbol('mutlipleChoice');
const TextQuestion = Symbol('');

enum QuestionTypes {
  MutlipleChoice,
  TextQuestion,
}

const QuestionTypeMap = {
  [QuestionTypes[MutlipleChoiceQuestion]]: 'multipleChoice',
  [QuestionTypes[TextQuestion]]: 'text',
};


type AnswerValidator = (answer?: string) => (boolean | Promise<boolean>);


export interface QuestionOptions {
  choices?: AnswerValidator[];
  maxRetries?: number;
  type?: QuestionTypes;
  validateAnswer?: AnswerValidator;
}

const defaultOptions = <QuestionOptions>{
  maxRetries: 1,
  type: QuestionTypes[TextQuestion],
};


const QuestionAnswer = Symbol('answer');
const QuestionAnswerValidator = Symbol('answerValidator');
const QuestionBody = Symbol('body');
const QuestionChoices = Symbol('choices');
const QuestionIsAnswered = Symbol('isAnswered');
const QuestionMaxRetries = Symbol('maxRetries');
const QuestionType = Symbol('type');

export const QuestionGetBody = Symbol('getBody');
export const QuestionSetAnswer = Symbol('setAnswer');

export default class Question extends Action {
  static MultipleChoice: number =
    QuestionTypes[MutlipleChoiceQuestion];

  static Text: number =
    QuestionTypes[TextQuestion];

  private [QuestionAnswer]: string | number;
  private [QuestionAnswerValidator]: AnswerValidator;
  private [QuestionBody]: string;
  private [QuestionChoices]: AnswerValidator[];
  private [QuestionIsAnswered]: boolean;
  private [QuestionMaxRetries]: number;
  private [QuestionType]: number;

  constructor(
    body: string,
    {
      choices = [],
      maxRetries = 2,
      type = QuestionTypes[TextQuestion],
      validateAnswer = () => true,
    }: QuestionOptions = defaultOptions,
  ) {
    if (
      type === QuestionTypes[MutlipleChoiceQuestion]
      && (
        (!choices)
        || (!Array.isArray(choices))
        || (!choices.every((v: AnswerValidator) => typeof v === 'function'))
      )
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
    this[QuestionIsAnswered] = false;
    this[QuestionMaxRetries] = Number(maxRetries);
    this[QuestionType] = type;
    this[GetActionContext] = this.getQuestionContext.bind(this);
  }

  private getQuestionContext(): QuestionContext {
    return {
      answer: this.answer,
      body: this.body,
      type: QuestionTypeMap[this.type],
      wasAnswered: this.isAnswered,
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

  get isAnswered(): boolean {
    return this[QuestionIsAnswered];
  }

  get maxRetries(): number {
    return this[QuestionMaxRetries];
  }

  get type(): number {
    return this[QuestionType];
  }

  get validateAnswer(): AnswerValidator {
    return this[QuestionAnswerValidator];
  }

  public [QuestionGetBody](state: SmsCookie): string {
    if (state.question.isAnswering) {
      return 'Hi'
    }
    return this.body;
  }

  public [QuestionSetAnswer](answer: string | number) {
    this[QuestionIsAnswered] = true;
    this[QuestionAnswer] = answer;
  }
}
