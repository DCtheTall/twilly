require('dotenv').load(); // TODO uninstall this

const { twilly, Flow, FlowSchema, Reply, Question, Message, Trigger } = require('./dist');
const app = require('express')();

// TODO uninstall these
const bp = require('body-parser');
const morgan = require('morgan');

const root = new Flow();
root.addActions(
  {
    name: 'greeting',
    resolve: (_, user) => Promise.resolve(new Reply('Hi ' + user.name)),
  },
  {
    name: 'trigger',
    resolve: () => new Trigger('parent.child'),
  },
);

const flow = new Flow();
flow.addActions(
  {
    name: 'question',
    resolve: () => new Question('What is your favorite color?', {
      continueOnFailure: true,
      type: Question.Types.Text,
      validateAnswer: ans => ['red', 'blue', 'green'].includes(ans.toLowerCase())
    }),
  },
  {
    name: 'reply',
    resolve: (ctx, user) =>
      new Reply(
        ctx.question.wasAnswered ?
          `${user.name}'s favorite color is ${ctx.question.answer.toLowerCase()}`
          : 'Goodbye.'),
  },
);

app.use(morgan('dev'));
app.use(bp.urlencoded({ extended: false, limit: '2mb' }));
app.use(bp.json({ limit: '5mb' }));

app.use('/twilly', twilly({
  accountSid: process.env.ACCOUNT_SID,
  authToken: process.env.AUTH_TOKEN,
  messagingServiceSid: process.env.MESSAGE_SERVICE_ID,
  root,
  schema: new FlowSchema({
    parent: new FlowSchema({
      child: flow,
    }),
  }),
  getUserContext(fromNumber) { // can return a Promise resolving the user data
    return { name: 'Dylan' };
  },
  testForExit: str => /(exit)/i.test(str),
  onInteractionEnd(ctx, user) {
    console.log(`Interaction with ${user.name} complete.`);
    console.log(`Interaction Context:\n${JSON.stringify(ctx, 2, 2)}\n`);
  },
  onMessage(ctx, user, body) {
    console.log(`New message from ${user.name}!`);
    console.log(`Body: ${body}\n`);
    console.log(`Interaction Context:\n${JSON.stringify(ctx, 2, 2)}\n`);
    return new Message(
      '+12034820254', `Message from ${user.name}: ${body}`);
  },
  onCatchError(ctx, user, err) {
    console.log(`Error during interaction with ${user.name}`);
    console.log(`Interaction Context:\n${JSON.stringify(ctx, 2, 2)}`);
    console.log(err);
    return new Reply('Oops, something went wrong');
  },
}));

app.get('/', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<html><body>Hello world!</body></html>');
});

require('http')
  .createServer(app)
  .listen(3000, () => console.log('Listening on port 3000...'));
