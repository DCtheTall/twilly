import Action, { ActionContext, GetActionContext } from "./Action";


export interface QuestionContext extends ActionContext {
  body: string;
  type: string;
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
  maxAttempts?: number;
  type?: QuestionTypes;
  validateAnswer?: AnswerValidator;
}

const defaultOptions = <QuestionOptions>{
  maxAttempts: 1,
  type: QuestionTypes[TextQuestion],
};


const QuestionAnswerValidator = Symbol('answerValidator');
const QuestionBody = Symbol('body');
const QuestionChoices = Symbol('choices');
const QuestionMaxAttempts = Symbol('maxAttempts');
const QuestionType = Symbol('type');

export default class Question extends Action {
  static MultipleChoice: number =
    QuestionTypes[MutlipleChoiceQuestion];

  static Text: number =
    QuestionTypes[TextQuestion];

  private [QuestionAnswerValidator]: AnswerValidator;
  private [QuestionBody]: string;
  private [QuestionChoices]: AnswerValidator[];
  private [QuestionMaxAttempts]: number;
  private [QuestionType]: number;

  constructor(
    body: string,
    {
      choices = [],
      maxAttempts = 1,
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
    if (isNaN(maxAttempts)) {
      throw new TypeError(
        `Question maxAttempts option must be a number.`);
    }
    super();

    this[QuestionAnswerValidator] = validateAnswer;
    this[QuestionBody] = body;
    this[QuestionChoices] = choices;
    this[QuestionMaxAttempts] = Number(maxAttempts);
    this[QuestionType] = type;

    this[GetActionContext] = this.getQuestionContext.bind(this);
  }

  private getQuestionContext(): QuestionContext {
    return {
      body: this.body,
      type: QuestionTypeMap[this.type],
    };
  }

  get body(): string {
    return this[QuestionBody];
  }

  get choices(): AnswerValidator[] {
    return this[QuestionChoices];
  }

  get maxAttempts(): number {
    return this[QuestionMaxAttempts];
  }

  get type(): number {
    return this[QuestionType];
  }

  get validateAnswer(): AnswerValidator {
    return this[QuestionAnswerValidator];
  }
}
