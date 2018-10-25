import Action, { ActionContext } from "./Action";


export interface QuestionContext extends ActionContext {
  body: string;
}


const MutlipleChoiceQuestion = Symbol('mutlipleChoice');
const TextQuestion = Symbol('');

enum QuestionTypes {
  MutlipleChoice,
  TextQuestion,
}


export interface QuestionOptions {
  type: QuestionTypes;
}

const defaultOptions = <QuestionOptions>{
  type: QuestionTypes[TextQuestion],
};


const QuestionBody = Symbol('body');
const QuestionType = Symbol('type');

export default class Question extends Action {
  static MultipleChoice: number =
    QuestionTypes[MutlipleChoiceQuestion];

  static Text: number =
    QuestionTypes[TextQuestion];

  private [QuestionBody]: string;
  private [QuestionType]: number;

  constructor(
    body: string,
    {
      type = QuestionTypes[TextQuestion],
    }: QuestionOptions = defaultOptions,
  ) {
    super();
    this[QuestionBody] = body;
    this[QuestionType] = type;
  }

  get body(): string {
    return this[QuestionBody];
  }

  get type(): number {
    return this[QuestionType];
  }
}
