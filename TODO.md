# TODO

## 1. User Story Mapping

What should people who consume this module be able to do?
- Automate simple actions using code for customer service
- Ability to text on behalf of the Twilio number to customer phone
- Be notified when any user sends a text message
- Control who is able to access types of notifications
- Be able to log each incoming and out going message
- Be able to log information about each interaction in order to query separately

Why would I choose to develop using this instead of a site w a GUI?
- Easy to use (small learning curve)
- Code which is more developer friendly
- Node.js makes it accessible
- TypeScript allows for VSCode to do type inference or for `.ts` files to use the minified distributed bundle

## 2. General architecture of library, what will be responsible for what?

Interaction schema:
- figure out how to automate simple actions like sending
a reply, answering a question, make an async action, make list of actions from FlowXO
- figure out how to resolve the progress through the interaction, previous interaction
- figure out how to resolve session state from cookie during interaction
- figure out way to define interactions for lib users in a simple way
