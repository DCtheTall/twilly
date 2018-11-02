require('dotenv').load(); // TODO uninstall this

const { twilly, Flow, Reply, Question } = require('./dist');
const app = require('express')();

// TODO uninstall these
const bp = require('body-parser');

const root = new Flow('root');
root
  .addAction(
    'question',
    () => new Question('What is your favorite color?', {
      continueOnFailure: true,
      validateAnswer: answer =>
        ['red', 'blue', 'yellow', 'green'].includes(answer.toLowerCase()),
    }))
  .addAction(
    'reply',
    ctx =>
      new Reply(
        ctx.root.question.wasAnswered ?
          `Your favorite color is ${ctx.root.question.answer}`
          : 'Goodbye.'));

app.use(require('morgan')('dev'));
app.use(bp.urlencoded({ extended: false, limit: '2mb' }));
app.use(bp.json({ limit: '5mb' }));

app.use('/twilly', twilly({
  accountSid: process.env.ACCOUNT_SID,
  authToken: process.env.AUTH_TOKEN,
  messageServiceId: process.env.MESSAGE_SERVICE_ID,
  root,
  getUserContext(fromNumber) { // can return a Promise resolving the user data
    return { name: fromNumber };
  },
}));

app.get('/', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<html><body>Hello world!</body></html>');
});

require('http')
  .createServer(app)
  .listen(3000, () => console.log('Listening on port 3000...'));
