const bp = require('body-parser');
const express = require('express');

const { twilly, Flow, Reply } = require('../dist');

const app = express();
const root = new Flow();

root.addAction('reply', () => new Reply('Hello world!'));

// twilly requires that the Express application be using body-parser
// which Express requires to handle HTTP POST requests
app.use(bp.urlencoded({ extended: false, limit: '2mb' }));
app.use(bp.json({ limit: '5mb' }));

app.get('/', (req, res) => { // Twilio requires your site have a GET to your index return an HTML response
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<html><body>Hello world!</body></html>');
});

app.use('/twilly', twilly({
  accountSid: TWILIO_ACCOUNT_SID,
  authToken: TWILIO_AUTH_TOKEN,
  messagingServiceSid: TWILIO_MESSAGE_SERVICE_ID,
  root,
  onCatchError(ctx, userCtx, err) {
    /* It is generally good practice to always include this hook. */
    console.log(err);
  },
}));

require('http')
  .createServer(app)
  .listen(3000, () => console.log('Listening on port 3000...'));
