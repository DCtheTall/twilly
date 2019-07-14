import { Router, Response, RequestHandler } from 'express';

import { getSha256Hash, warn } from './util';
import {
  TwilioController,
  TwilioControllerArgs,
  TwilioWebhookRequest,
} from './twllio';
import {
  ExitKeywordTest,
  Flow,
  FlowController,
  FlowSchema,
  OnInteractionEndHook,
  defaultTestForExit,
} from './Flows';
import {
  Message,
  Question,
  Reply,
} from './Actions';
import {
  InteractionContext,
  SmsCookie,
  updateContext,
} from './SmsCookie';

export {
  Flow,
  FlowSchema,
} from './Flows';
export {
  Message,
  Question,
  Reply,
  Trigger,
} from './Actions';

const cookieParser =
  <(secret: string) => RequestHandler>require('cookie-parser');


const DEFAULT_EXIT_TEXT = 'Goodbye.';
const DELAY = process.env.NODE_ENV === 'test' ? 10 : 1000;
const ROUTE_REGEXP = /^\/?$/i;
const DEFAULT_TWILLY_NAME = '__$$_DEFAULT_TWILLY_$$__';


type OnMessageHook =
  (context?: InteractionContext, user?: any, messageBody?: string) => any;

type OnCatchErrorHook =
  (context?: InteractionContext, user?: any, err?: Error) => any;

type UserContextGetter = (from: string) => any;

interface HooksTable {
  onCatchError?: OnCatchErrorHook;
  getUserContext?: UserContextGetter;
  onMessage?: OnMessageHook;
}

interface LocalTwillyVariables {
  flowController?: FlowController;
  twilioController?: TwilioController;
  hooks?: HooksTable;
}

const twillyLocals = new Map<string, LocalTwillyVariables>();


async function handleIncomingSmsWebhook(
  locals: LocalTwillyVariables,
  req: TwilioWebhookRequest,
  res: Response,
) {
  let state: SmsCookie = null;
  let userCtx: any = null;

  try {
    state = locals.twilioController.getSmsCookieFromRequest(req);
    userCtx = await locals.hooks.getUserContext(req.body.From); // will throw any errors not caught in promise

    let action = await locals.flowController.resolveActionFromState(req, state, userCtx);

    if (locals.hooks.onMessage) {
      try {
        const result = await locals.hooks.onMessage(
          state.interactionContext, userCtx, req.body.Body);
        if (result instanceof Message) {
          await locals.twilioController.sendMessageNotification(result);
        }
      } catch (err) {
        locals.hooks.onCatchError(state.interactionContext, userCtx, err);
      }
    }

    while (action !== null) {
      await locals.twilioController.handleAction(req, action);
      await new Promise(
        resolve => setTimeout(resolve, DELAY)); // for preserving message order

      state = await locals.flowController.resolveNextStateFromAction(req, state, action);

      if (
        (state.isComplete)
        || (
          action instanceof Question
          && !(<Question>action).isComplete
        )
      ) break;
      action = await locals.flowController.resolveActionFromState(req, state, userCtx);
      if (action === null) break;
    }

    if (state.isComplete) {
      if (locals.flowController.onInteractionEnd !== null) {
        try {
          const result =
            await locals.flowController.onInteractionEnd(state.interactionContext, userCtx);
          if (result instanceof Message) {
            await locals.twilioController.sendMessageNotification(result);
          }
        } catch (err) {
          locals.hooks.onCatchError(state.interactionContext, userCtx, err);
        }
      }

      locals.twilioController.clearSmsCookie(res);
    } else {
      locals.twilioController.setSmsCookie(res, state);
    }

    locals.twilioController.sendEmptyResponse(res);
  } catch (err) {
    const result = await locals.hooks.onCatchError(
      state.interactionContext, userCtx, err);

    try {
      if (result instanceof Reply) {
        await locals.twilioController.handleAction(req, result);
        state = updateContext(
          state,
          locals.flowController.getCurrentFlow(state),
          result,
        );
      }
      if (locals.flowController.onInteractionEnd !== null) {
        await locals.flowController.onInteractionEnd(state.interactionContext, userCtx);
      }
    } catch (innerErr) {
      await locals.hooks.onCatchError(
        state.interactionContext, userCtx, innerErr);
    }

    locals.twilioController.clearSmsCookie(res);
    locals.twilioController.sendEmptyResponse(res);
  }
}

interface TwillyParameters extends TwilioControllerArgs {
  cookieSecret?: string;
  getUserContext?: UserContextGetter;
  name: string;
  onCatchError?: OnCatchErrorHook;
  onInteractionEnd?: OnInteractionEndHook;
  onMessage?: OnMessageHook;
  root: Flow,
  schema?: FlowSchema,
  testForExit?: ExitKeywordTest;
}

const defaultTwillyParameters = <TwillyParameters>{
  cookieKey: null,
  cookieSecret: null,
  getUserContext: <UserContextGetter>(() => null),
  name: DEFAULT_TWILLY_NAME,
  onCatchError: <OnCatchErrorHook>(() => null),
  onInteractionEnd: null,
  onMessage: null,
  schema: null,
  sendOnExit: DEFAULT_EXIT_TEXT,
  testForExit: defaultTestForExit,
};

export function twilly({
  accountSid,
  authToken,
  messagingServiceSid,

  root,
  schema = defaultTwillyParameters.schema,

  cookieKey = defaultTwillyParameters.cookieKey,
  cookieSecret = defaultTwillyParameters.cookieSecret,

  getUserContext = defaultTwillyParameters.getUserContext,

  onCatchError = defaultTwillyParameters.onCatchError,
  onInteractionEnd = defaultTwillyParameters.onInteractionEnd,
  onMessage = defaultTwillyParameters.onMessage,

  sendOnExit = defaultTwillyParameters.sendOnExit,
  testForExit = defaultTwillyParameters.testForExit,

  name = defaultTwillyParameters.name,
}: TwillyParameters): Router {
  if (twillyLocals.has(name)) {
    warn(`There already exists a Twilly instance with the name: ${name}`);
  }
  const locals: LocalTwillyVariables = {
    hooks: { getUserContext, onCatchError, onMessage },
  };
  twillyLocals.set(name, locals);

  if (!cookieKey) {
    cookieKey = getSha256Hash(accountSid, accountSid).slice(0, 16);
  }
  if (!cookieSecret) {
    cookieSecret = getSha256Hash(accountSid, authToken);
  }

  locals.flowController = new FlowController(root, schema, {
    onInteractionEnd,
    testForExit,
  });
  locals.twilioController = new TwilioController({
    accountSid,
    authToken,
    cookieKey,
    messagingServiceSid,
    sendOnExit,
  });
  const router = Router();

  router.use(cookieParser(cookieSecret));
  router.post(
    ROUTE_REGEXP, handleIncomingSmsWebhook.bind(null, locals));
  return router;
}


interface TriggerFlowParameters {
  twillyName?: string;
}

const defaultTriggerFlowParameters = {
  twillyName: DEFAULT_TWILLY_NAME,
};

export function triggerFlow(flowName, {
  twillyName = defaultTriggerFlowParameters.twillyName,
} = defaultTriggerFlowParameters) {
  const locals = twillyLocals.get(twillyName);

  let state: SmsCookie = null;
  let userCtx: any = null;


}
