# twilly 📱💬

Writing the back end of an SMS application should be easy for developers,
_twilly_ was created to greatly simplify the process of writing automated
SMS applications.

Twilly is a Node.js library that can be used with TypeScript or JavaScript
as middleware for an Express.js app, it works in conjunction with the Twilio API
to allow you to defined complex SMS interactions for your users with ease.

The design of the library's exposed interface was built with one goal in mind, make
interactions as easy to design as they are with tools like [FlowXO](https://flowxo.com/)
or [Twilio Studio](https://www.twilio.com/studio) but allow the interactions
to be defined with code (in this case, JavaScript).

---

## Contents

1. [Installation and Setup](#installation-and-setup)
2. [Quick Start](#quick-start)
3. [Tutorials](#tutorials)
4. [Documentation](#documentation)
5. [License](#license)
6. [Contributing](#contributing)
7. [Bugs or Feature Suggestions](#bugs-or-feature-suggestions)

---

## Installation and Setup

To add twilly to your Node.js Express application, run

```
npm i -s twilly
```

You will download a precompiled version of twilly so there is no need to add
TypeScript or twilly's settings to your build config.

You will need to have an account with Twilio in order to use twilly, if
there is demand to allow other APIs to be compatible then I am open to adding more.
For now, you will need to create a messaging service with Twilio using their dashboard.
You will also need to set your inbound message url to the path of your application
you use the twilly middleware.

I recommend you download the package [ngrok](https://www.npmjs.com/package/ngrok)
(or another library like it) while developing with Twilly.

---

## Quick Start

The most simple interaction a user can have with an SMS application is where whenever
the user sends a message, the application replies with "Hello world!". Twilly allows
us to code this application in just a few lines.

First you need to install the required dependencies,

```javascript
const bp = require('body-parser');
const express = require('express');
```

and let's set up our Express application,

```javascript
const app = express();

app.use(bp.urlencoded({ extended: false, limit: '2mb' }));
app.use(bp.json({ limit: '5mb' }));

// Twilio requires your site have a GET to your index return an HTML response
app.get('/', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<html><body>Hello world!</body></html>');
});
```

Now let's start defining your SMS app. Twilly separates the different type of
interactions into linear sequences of actions called _Flows_. A Flow is a
linear collection of actions your app can take after receiving a message.

The application we want to build just has one Flow, the user sends a message
and the application replies with "Hello world!". So let's import the `Flow`
and `Reply` objects from twilly.

```javascript
const { Flow, Reply } = require('twilly');
```

The Flow any user who hasn't already started any application enters is called
the "root" Flow. Every other Flow is a "child" of this Flow, and ater on,
we will see how to initiate other Flows from others.

Now let's set up the root Flow for this interaction,

```javascript
const root = new Flow();

root.addAction('reply', () => new Reply('Hello world!'));
```

The add action method on the Flow object appends a new action
to the end of the Flow. The first argument is the name of the action,
and can be used later to retrieve metadata about the action in later
actions.

The last thing we need to do is add the `twilly` middleware to the
Express app. This is done below:

```javascript
const { twilly } = require('twilly');

app.use('/twilly', twilly({
  accountSid: TWILIO_ACCOUNT_SID,
  authToken: TWILIO_AUTH_TOKEN,
  messagingServiceSid: TWILIO_MESSAGE_SERVICE_ID,
  root,
}));
```

You can see the entire twilly app in working form in `examples/quickstart.js`.

## Tutorials

Create wikis for (provide links here):

Sending multiple replies

Using user data in the actions

Sending messages to other numbers

Triggering other Flows

Asking a text question

Asking a multiple choice question

Using data from other actions

Storing a record of the interaction

## Documentation

You can view the documentation of twilly's exposed objects and API
[here](https://github.com/DCtheTall/twilly/wiki/Documentation).

## License

create LICENSE.md

## Contributing

create CONTRIBUTING.md

## Bugs or Feature Suggestions

To report any bugs or suggest any features or improvements,
please open an issue [here](https://github.com/DCtheTall/twilly/issues).
