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
  type?: QuestionTypes;
  validateAnswer?: AnswerValidator;
  choices?: AnswerValidator[];
}

const defaultOptions = <QuestionOptions>{
  type: QuestionTypes[TextQuestion],
};


const QuestionBody = Symbol('body');
const QuestionType = Symbol('type');
const QuestionAnswerValidator = Symbol('answerValidator');
const QuestionChoices = Symbol('choices');

export default class Question extends Action {
  static MultipleChoice: number =
    QuestionTypes[MutlipleChoiceQuestion];

  static Text: number =
    QuestionTypes[TextQuestion];

  private [QuestionBody]: string;
  private [QuestionType]: number;
  private [QuestionAnswerValidator]: AnswerValidator;
  private [QuestionChoices]: AnswerValidator[];

  constructor(
    body: string,
    {
      type = QuestionTypes[TextQuestion],
      validateAnswer = () => true,
      choices = [],
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
    super();
    this[GetActionContext] = this.getQuestionContext.bind(this);
    this[QuestionBody] = body;
    this[QuestionChoices] = choices;
    this[QuestionType] = type;
    this[QuestionAnswerValidator] = validateAnswer;
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

  get type(): number {
    return this[QuestionType];
  }

  get validateAnswer(): AnswerValidator {
    return this[QuestionAnswerValidator];
  }
}
