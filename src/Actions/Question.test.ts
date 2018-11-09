import Question from './Question';
import {} from './Action';
import { uniqueString } from '../util';

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
  const exectuteTest = (body: any) => {
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

  exectuteTest(1);
  exectuteTest('');
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
      'Multiple choice Questions must include a \'choices\' option, an array of at least 2 functions of a string which return a boolen');
  }

  executeTest(1);
  executeTest([]);
  executeTest([() => true]);
  executeTest([() => true, true]);
});


test('Question failedToAnswerResponse should set property', () => {
  const failedToAnswerResponse = uniqueString();
  const q = new Question(uniqueString(), { failedToAnswerResponse });

  expect(q.failedAnswerResponse).toBe(failedToAnswerResponse);
});


test('Invalid failedToAnswerResponse Question option should throw a TypError', () => {
  const body = uniqueString();
  const executeTest = (failedToAnswerResponse: any) => {
    let caught: Error;
    try {
      new Question(body, { failedToAnswerResponse });
    } catch (err) {
      caught = err;
    }
    expect(caught instanceof TypeError).toBeTruthy();
    expect(caught.message).toBe(
      'Question failedToAnswerResponse option must be a non-empty string');
  }

  executeTest(1);
  executeTest('');
});
