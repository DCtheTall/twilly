require('dotenv').load(); // TODO uninstall this

const { TwilioController } = require('./dist');

const tc = new TwilioController({
  accountSid: process.env.ACCOUNT_SID,
  authToken: process.env.AUTH_TOKEN,
  messageServiceId: process.env.MESSAGE_SERVICE_ID,
});

tc.sendTextMessage('+12034820254', 'Testing again');
