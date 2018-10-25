require('dotenv').load(); // TODO uninstall this

const { twilly, Flow, FlowSchema, Reply, Trigger } = require('./dist');
const app = require('express')();

// TODO uninstall these
const bp = require('body-parser');

const root = new Flow('root').addAction('trigger', () => new Trigger('test'));

const schema = new FlowSchema({
  test: new Flow('test').addAction('trigger', () => null),
  test2: new Flow('test2').addAction('reply', () => new Reply('Worked!')),
});

app.use(require('morgan')('dev'));
app.use(bp.urlencoded({ extended: false, limit: '2mb' }));
app.use(bp.json({ limit: '5mb' }));
app.use('/twilly', twilly({
  accountSid: process.env.ACCOUNT_SID,
  authToken: process.env.AUTH_TOKEN,
  messageServiceId: process.env.MESSAGE_SERVICE_ID,
  root,
  schema,
  getUserContext(fromNumber) {
    return Promise.resolve({ name: fromNumber });
  },
}));
app.get('/', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<html><body>Hello world!</body></html>');
});

require('http')
  .createServer(app)
  .listen(3000, () => console.log('Listening on port 3000...'));
