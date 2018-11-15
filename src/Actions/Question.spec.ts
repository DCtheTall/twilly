import Question, {
  QuestionTypeMap,
  QuestionEvaluate,
  MAXIMUM_RETRIES_ALLOWED,
} from './Question';
import { GetContext, ActionGetContext } from './Action';
import { uniqueString } from '../util';
import { getMockTwilioWebhookRequest } from '../twllio';
import { createSmsCookie } from '../SmsCookie';

test('Question should set body from constructor', () => {
  const body = uniqueString();
  const q = new Question(body);

  expect(q.body).toBe(body);
});


test('Question should be a text type by default', () => {
  const q = new Question(uniqueString());

  expect(q.type).toBe(Question.Types.Text);
});


test('Question should throw a TypeError if its constructor receives an invalid argument', () => {
  const executeTest = (body: any) => {
    let caught: Error;
    try {
      new Question(body);
    } catch (err) {
      caught = err;
    }
    expect(caught instanceof TypeError).toBeTruthy();
    expect(caught.message).toBe(
      'The first argument of the Question constructor must be a non-empty string');
  }

  executeTest(1);
  executeTest(null);
  executeTest({});
  executeTest(() => { });
  executeTest('');
});


test('Multiple choice Question should include an array of choices (functions)', () => {
  const choices = [
    () => true,
    () => true,
  ];
  const q = new Question(uniqueString(), {
    type: Question.Types.MultipleChoice,
    choices,
  });

  expect(q.type).toBe(Question.Types.MultipleChoice);
  expect(q.choices).toBe(choices);
});

test('Multiple choice Question should throw a TypeError if choices input is invalid', () => {
  const executeTest = (choices: any) => {
    let caught: Error;

    try {
      new Question(uniqueString(), {
        type: Question.Types.MultipleChoice,
        choices,
      });
    } catch (err) {
      caught = err;
    }
    expect(caught instanceof TypeError).toBeTruthy();
    expect(caught.message).toBe(
      'Multiple choice Questions must include a \'choices\' option, '
        + 'an array of at least 2 functions of a string which return a boolen');
  }

  executeTest(1);
  executeTest([]);
  executeTest([() => true]);
  executeTest([() => true, true]);
  executeTest([{}]);
});


test('Question failedToAnswerResponse option should set instance property', () => {
  const failedToAnswerResponse = uniqueString();
  const q = new Question(uniqueString(), { failedToAnswerResponse });

  expect(q.failedAnswerResponse).toBe(failedToAnswerResponse);
});


test('Invalid failedToAnswerResponse Question option should throw a TypError', () => {
  const executeTest = (failedToAnswerResponse: any) => {
    let caught: Error;
    try {
      new Question(uniqueString(), { failedToAnswerResponse });
    } catch (err) {
      caught = err;
    }
    expect(caught instanceof TypeError).toBeTruthy();
    expect(caught.message).toBe(
      'Question failedToAnswerResponse option must be a non-empty string');
  };

  executeTest(1);
  executeTest(null);
  executeTest({});
  executeTest(() => { });
  executeTest('');
});


test('Question invalidAnswerResponse option should set instance property', () => {
  const invalidAnswerResponse = uniqueString();
  const q = new Question(uniqueString(), { invalidAnswerResponse });

  expect(q.invalidAnswerResponse).toBe(invalidAnswerResponse);
});


test('Invalid invalidAnswerResponse Question option should throw a TypError', () => {
  const executeTest = (invalidAnswerResponse: any) => {
    let caught: Error;
    try {
      new Question(uniqueString(), { invalidAnswerResponse });
    } catch (err) {
      caught = err;
    }
    expect(caught instanceof TypeError).toBeTruthy();
    expect(caught.message).toBe(
      'Question invalidAnswerResponse option must be a non-empty string');
  };

  executeTest(1);
  executeTest(null);
  executeTest({});
  executeTest(() => {});
  executeTest('');
});


test('Question maxRetries option should set instance property', () => {
  let maxRetries = Math.round((Math.random() * 8) + 1);
  let q = new Question(uniqueString(), { maxRetries });
  expect(q.maxRetries).toBe(maxRetries);

  q = new Question(uniqueString(), { maxRetries: 0 });
  expect(q.maxRetries).toBe(0);
});


test('Invalid maxRetries Question option should throw a TypError', () => {
  const executeTest = (maxRetries: any) => {
    let caught: Error;
    try {
      new Question(uniqueString(), { maxRetries });
    } catch (err) {
      caught = err;
    }
    expect(caught instanceof TypeError).toBeTruthy();
    expect(caught.message).toBe(
      `Question maxRetries option must be a number from 0 to ${MAXIMUM_RETRIES_ALLOWED}.`);
  };

  executeTest({});
  executeTest('aaaa');
  executeTest(-1 - (1000 * Math.random()));
  executeTest(MAXIMUM_RETRIES_ALLOWED + 1 + (5 * Math.random()));
});


test(
  'type Question option will default to TextQuestion '
    + 'if the provided value is not in Question.Types',
  () => {
    const type = <any>{};
    const q = new Question(uniqueString(), { type });

    expect(q.type).toBe(Question.Types.Text);
  },
);


test('validateAnswer Question option should set instance property', () => {
  const validateAnswer = () => true;
  const q = new Question(uniqueString(), { validateAnswer });

  expect(q.validateAnswer).toBe(validateAnswer);
});


test('Invalid validateAnswer Question option should throw a TypError', () => {
  const executeTest = (validateAnswer: any) => {
    let caught: Error;
    try {
      new Question(uniqueString(), { validateAnswer });
    } catch (err) {
      caught = err;
    }
    expect(caught instanceof TypeError).toBeTruthy();
    expect(caught.message).toBe(
      'Question validateAnswer option must be a function');
  };

  executeTest(1);
  executeTest({});
  executeTest([]);
  executeTest('abc123');
});


test(
  'An unanswered Question context should provide body, '
    + 'questionType, type, wasAnswered, wasFailed',
  () => {
    const body = uniqueString();
    let q = new Question(body);

    expect(q[GetContext]()).toEqual({
      answer: null,
      body,
      questionType: QuestionTypeMap[Question.Types.Text],
      wasAnswered: false,
      wasFailed: false,
    });
    expect(q[ActionGetContext]()).toHaveProperty('type', 'Question');

    q = new Question(body, {
      type: Question.Types.MultipleChoice,
      choices: [
        () => true,
        () => true,
      ],
    });
    expect(q[GetContext]()).toHaveProperty(
      'questionType', QuestionTypeMap[Question.Types.MultipleChoice]);
  },
);


test('Question evaluating valid text answer', async () => {
  const answer = uniqueString();
  const q = new Question(uniqueString(), { validateAnswer: ans => ans === answer });
  const reqMock = getMockTwilioWebhookRequest({ body: answer });
  const stateMock = createSmsCookie(reqMock);

  stateMock.question.isAnswering = true;
  await q[QuestionEvaluate](reqMock, stateMock);

  expect(q.isAnswered).toBe(true);
  expect(q.isFailed).toBe(false);
  expect(q.isComplete).toBe(true);
  expect(q[GetContext]()).toHaveProperty('wasAnswered', true);
  expect(q[GetContext]()).toHaveProperty('wasFailed', false);
  expect(q[GetContext]()).toHaveProperty('answer', answer);
});


test('Question evaluating invalid text answer with retry left', async () => {
  const answer = uniqueString();
  const q = new Question(uniqueString(), {
    validateAnswer: ans => Promise.resolve(ans !== answer),
  });
  const reqMock = getMockTwilioWebhookRequest({ body: answer });
  const errorHandlerStub = jest.fn();
  const stateMock = createSmsCookie(reqMock);

  stateMock.question.isAnswering = true;
  await q[QuestionEvaluate](reqMock, stateMock);

  expect(q.isFailed).toBe(false);
  expect(q.isAnswered).toBe(false);
  expect(q.isComplete).toBe(false);
  expect(q[GetContext]()).toHaveProperty('wasAnswered', false);
  expect(q[GetContext]()).toHaveProperty('wasFailed', false);
  expect(q[GetContext]()).toHaveProperty('answer', null);
});


test('Question evaluating invalid text answer without retry left', async () => {
  const answer = uniqueString();
  const q = new Question(uniqueString(), {
    validateAnswer: ans => Promise.resolve(ans !== answer),
  });
  const reqMock = getMockTwilioWebhookRequest({ body: answer });
  const stateMock = createSmsCookie(reqMock);

  stateMock.question.isAnswering = true;
  stateMock.question.attempts = [uniqueString()];
  await q[QuestionEvaluate](reqMock, stateMock);

  expect(q.isAnswered).toBe(false);
  expect(q.isFailed).toBe(true);
  expect(q.isComplete).toBe(true);
  expect(q[GetContext]()).toHaveProperty('wasAnswered', false);
  expect(q[GetContext]()).toHaveProperty('wasFailed', true);
  expect(q[GetContext]()).toHaveProperty('answer', null);
});


test('Question evaluating valid multiple choice answer', async () => {
  const answer = uniqueString();
  const q = new Question(uniqueString(), {
    type: Question.Types.MultipleChoice,
    choices: [
      ans => ans !== answer,
      ans => ans === answer,
    ],
  });
  const reqMock = getMockTwilioWebhookRequest({ body: answer });
  const stateMock = createSmsCookie(reqMock);

  stateMock.question.isAnswering = true;
  await q[QuestionEvaluate](reqMock, stateMock);

  expect(q.isAnswered).toBe(true);
  expect(q.isFailed).toBe(false);
  expect(q.isComplete).toBe(true);
  expect(q[GetContext]()).toHaveProperty('wasAnswered', true);
  expect(q[GetContext]()).toHaveProperty('wasFailed', false);
  expect(q[GetContext]()).toHaveProperty('answer', 1);
});


test('Question validates multiple choices selected with retry left', async () => {
  const answer = uniqueString();
  const q = new Question(uniqueString(), {
    type: Question.Types.MultipleChoice,
    choices: [
      ans => ans === answer,
      ans => ans === answer,
    ],
  });
  const reqMock = getMockTwilioWebhookRequest({ body: answer });
  const errorHandlerStub = jest.fn();
  const stateMock = createSmsCookie(reqMock);

  stateMock.question.isAnswering = true;
  await q[QuestionEvaluate](reqMock, stateMock);

  expect(q.isFailed).toBe(false);
  expect(q.isAnswered).toBe(false);
  expect(q.isComplete).toBe(false);
  expect(q[GetContext]()).toHaveProperty('wasAnswered', false);
  expect(q[GetContext]()).toHaveProperty('wasFailed', false);
  expect(q[GetContext]()).toHaveProperty('answer', null);
});


test('Question validates multiple choices selected without retry left', async () => {
  const answer = uniqueString();
  const q = new Question(uniqueString(), {
    type: Question.Types.MultipleChoice,
    choices: [
      ans => ans === answer,
      ans => ans === answer,
    ],
  });
  const reqMock = getMockTwilioWebhookRequest({ body: answer });
  const stateMock = createSmsCookie(reqMock);

  stateMock.question.isAnswering = true;
  stateMock.question.attempts = [uniqueString()];
  await q[QuestionEvaluate](reqMock, stateMock);

  expect(q.isAnswered).toBe(false);
  expect(q.isFailed).toBe(true);
  expect(q.isComplete).toBe(true);
  expect(q[GetContext]()).toHaveProperty('wasAnswered', false);
  expect(q[GetContext]()).toHaveProperty('wasFailed', true);
  expect(q[GetContext]()).toHaveProperty('answer', null);
});


test('Question evaluating invalid multiple choice answer with retry left', async () => {
  const answer = uniqueString();
  const q = new Question(uniqueString(), {
    type: Question.Types.MultipleChoice,
    choices: [
      ans => Promise.resolve(ans !== answer),
      ans => Promise.resolve(ans !== answer),
    ],
  });
  const reqMock = getMockTwilioWebhookRequest({ body: answer });
  const stateMock = createSmsCookie(reqMock);

  stateMock.question.isAnswering = true;
  await q[QuestionEvaluate](reqMock, stateMock);

  expect(q.isFailed).toBe(false);
  expect(q.isAnswered).toBe(false);
  expect(q.isComplete).toBe(false);
  expect(q[GetContext]()).toHaveProperty('wasAnswered', false);
  expect(q[GetContext]()).toHaveProperty('wasFailed', false);
  expect(q[GetContext]()).toHaveProperty('answer', null);
});


test('Question evaluating invalid multiple choice answer without retry left', async () => {
  const answer = uniqueString();
  const q = new Question(uniqueString(), {
    type: Question.Types.MultipleChoice,
    choices: [
      ans => Promise.resolve(ans !== answer),
      ans => Promise.resolve(ans !== answer),
    ],
  });
  const reqMock = getMockTwilioWebhookRequest({ body: answer });
  const stateMock = createSmsCookie(reqMock);

  stateMock.question.isAnswering = true;
  stateMock.question.attempts = [uniqueString()];
  await q[QuestionEvaluate](reqMock, stateMock);

  expect(q.isFailed).toBe(true);
  expect(q.isAnswered).toBe(false);
  expect(q.isComplete).toBe(true);
  expect(q[GetContext]()).toHaveProperty('wasAnswered', false);
  expect(q[GetContext]()).toHaveProperty('wasFailed', true);
  expect(q[GetContext]()).toHaveProperty('answer', null);
});


test('Question evaluating with more maxRetries than 1', async () => {
  const answer = uniqueString();
  const q = new Question(uniqueString(), {
    validateAnswer: () => false,
    maxRetries: 3,
  });
  const reqMock = getMockTwilioWebhookRequest({ body: answer });
  const stateMock = createSmsCookie(reqMock);

  stateMock.question.isAnswering = true;
  stateMock.question.attempts = [uniqueString(), uniqueString()];
  await q[QuestionEvaluate](reqMock, stateMock);

  expect(q.isFailed).toBe(false);
  expect(q.isAnswered).toBe(false);
  expect(q.isComplete).toBe(false);
  expect(q[GetContext]()).toHaveProperty('wasAnswered', false);
  expect(q[GetContext]()).toHaveProperty('wasFailed', false);
  expect(q[GetContext]()).toHaveProperty('answer', null);
});


test('Question should not evaluate when not answering the question yet', async () => {
  const answer = uniqueString();
  const validateAnswer = jest.fn();
  const q = new Question(uniqueString(), {
    validateAnswer,
    maxRetries: 3,
  });
  const reqMock = getMockTwilioWebhookRequest({ body: answer });
  const stateMock = createSmsCookie(reqMock);

  await q[QuestionEvaluate](reqMock, stateMock);

  expect(validateAnswer).toBeCalledTimes(0);
});
