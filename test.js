require('dotenv').load(); // TODO uninstall this

const { twilly, Flow, Reply } = require('./dist');
const app = require('express')();

// TODO uninstall these
const bp = require('body-parser');

const root = new Flow('root');
root.addActions({
  test: (_, usr) => new Reply(`Hello, ${usr.name}`),
  test2: (_, usr) => new Reply(`Hello again, ${usr.name}`),
});

app.use(require('morgan')('dev'));
app.use(bp.urlencoded({ extended: false, limit: '2mb' }));
app.use(bp.json({ limit: '5mb' }));
app.use('/twilly', twilly({
  accountSid: process.env.ACCOUNT_SID,
  authToken: process.env.AUTH_TOKEN,
  messageServiceId: process.env.MESSAGE_SERVICE_ID,
  root,
  getUserContext(from) {
    return Promise.resolve({ name: 'Dylan' });
  },
}));
app.get('/', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<html><body>Hello world!</body></html>');
});

require('http')
  .createServer(app)
  .listen(3000, () => console.log('Listening on port 3000...'));
