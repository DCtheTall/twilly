# Twilly 📱💬

Writing the back end of an SMS web application with Twilio should be easy, and
Twilly was created to greatly simplify the process of writing such applications.

Twilly is a Node.js library that can be used with TypeScript or JavaScript
and integrates with Express.js. It works in conjunction with the Twilio
API to allow you to defined complex SMS interactions for your users with ease.

The design of the library's exposed interface was built with one goal in mind, make
interactions as easy to design as they are with tools like [FlowXO](https://flowxo.com/)
or [Twilio Studio](https://www.twilio.com/studio) but allow the interactions
to be defined with code (in this case, JavaScript) instead of a GUI.

---

## Contents

1. [Installation and Setup](#installation-and-setup)
2. [Quick Start](#quick-start)
3. [Documentation](#documentation)
4. [License](#license)
5. [Contributing](#contributing)
6. [Bugs or Feature Suggestions](#bugs-or-feature-suggestions)
7. [Feature Pipeline](#feature-pipeline)

---

## Installation and Setup

[Twilly is published on npm](https://www.npmjs.com/package/twilly).
To add Twilly to your Node.js Express application, run

```
npm i -s twilly
```

You will download a precompiled version of Twilly so there is no need to add
TypeScript or Twilly's settings to your build config.

You will need to have an account with Twilio in order to use Twilly, if
there is demand to allow other APIs to be compatible then I am open to adding more.
For now, you will need to create a messaging service with Twilio using their dashboard.
You will also need to set your inbound message url to the path of your application
you use the `twilly` function.

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

// Twilio requires a text/html MIME-type in the response to a GET request to your server's "/" endpoint.
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
and `Reply` objects from Twilly.

```javascript
const { Flow, Reply } = require('twilly');
```

The Flow any user who hasn't already started any application enters is called
the "root" Flow. Every other Flow is a "child" of this Flow, and later on,
we will see how to initiate Flows within each other using the `Trigger` object.

Now let's set up the root Flow for this interaction,

```javascript
const root = new Flow();

root.addAction('reply', () => new Reply('Hello world!'));
```

The add action method on the Flow object appends a new action
to the end of the Flow. The first argument is the name of the action,
and can be used later to retrieve metadata about the action in later
actions.

The last thing we need to do is add the `twilly` function to the
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

---

## Documentation

You can view the documentation of Twilly's exposed objects and API
[here](https://github.com/DCtheTall/twilly/wiki/Documentation).

---

## License

Twilly is available free of charge under the MIT license. See `LICENSE.md` for details.

---

## Contributing

See `CONTRIBUTING.md` for information on contribution guidlines and community standards.

---

## Bugs or Feature Suggestions

To report any bugs or suggest any features or improvements,
please open an issue [here](https://github.com/DCtheTall/twilly/issues).

---

## Feature Pipeline

Below is a list of the features I plan on adding to twilly in the future.
I am always open to suggested features and contributions from other developers
who want to make twilly better!

### Trigger Flows outside of the `twilly()` function

As pointed out in [Issue #3](https://github.com/DCtheTall/twilly/issues/3) it would be nice to be able to trigger flows from other places in your Node application outside of the `twilly` function. This seems like a common use case and seems feasible though I have not actually tried implementing. PRs are welcome if anyone is interested as well. 

### Filtering Actions

Right now there is no way to "filter" (or skip) Actions in a Flow. Either
an Action is performed or the entire interaction ends. The next release I
plan on doing is adding an ability to filter actions so that interactions
can continue even if a particular action is not performed.

I am open to suggestions about implementation, but right now I am planning on adding a
3rd optional argument to `Flow.addAction` which is a function of the Flow
and user contexts and returns a Boolean which indicates if the Action should
execute. For `Flow.addActions` this would be an optional `filter` key in each of the
plain objects. Each Action's contexts would have a `filtered` key which would be `false`
if an Action is performed or `true` if no Action was performed and the Flow skipped
to the next Action.
