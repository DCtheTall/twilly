require('dotenv').load(); // TODO uninstall this

const { twilly, Flow, Reply, Question, Message } = require('./dist');
const app = require('express')();

// TODO uninstall these
const bp = require('body-parser');

const root = new Flow('root');
root.addActions([
  {
    name: 'greeting',
    resolve: (_, user) => new Promise(r => r(new Reply('Hi ' + user.name))),
  },
  {
    name: 'question',
    resolve: () => new Question('What is your favorite color?', {
      continueOnFailure: true,
      type: Question.Types.MultipleChoice,
      choices: ['red', 'blue', 'green'].map(
          color => ans => ans.toLowerCase() === color)
    }),
  },
  {
    name: 'reply',
    resolve: ctx =>
      new Reply(
        ctx.root.question.wasAnswered ?
          `Your favorite color is ${ctx.root.question.answer}`
          : 'Goodbye.'),
  },
]);

app.use(require('morgan')('dev'));
app.use(bp.urlencoded({ extended: false, limit: '2mb' }));
app.use(bp.json({ limit: '5mb' }));

app.use('/twilly', twilly({
  accountSid: process.env.ACCOUNT_SID,
  authToken: process.env.AUTH_TOKEN,
  messageServiceId: process.env.MESSAGE_SERVICE_ID,
  root,
  getUserContext(fromNumber) { // can return a Promise resolving the user data
    return { name: 'Dylan' };
  },
  testForExit(body) {
    return body.toLowerCase().includes('exit');
  },
  onInteractionEnd(ctx, user) {
    console.log(`Interaction with ${user.name} complete.`);
    console.log(ctx, ctx.root.question.messageSid);
  },
  onMessage(ctx, user, body) {
    return new Message(
      '+12034820254', `Message from ${user.name}: ${body}`);
  },
}));

app.get('/', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<html><body>Hello world!</body></html>');
});

require('http')
  .createServer(app)
  .listen(3000, () => console.log('Listening on port 3000...'));
