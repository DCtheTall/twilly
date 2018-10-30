import { uniqueString } from '../util';
import {
  Action,
  ActionContext,
  Question,
  Trigger,
} from '../Actions';
import { Flow } from '../Flows';
import { TwilioWebhookRequest } from '../TwilioController';


type ContextMap<T> = { [index: string]: T };


export type FlowContext<T> = ContextMap<ContextMap<T>>;
export type InteractionContext = FlowContext<ActionContext>;


export interface SmsCookie {
  context: InteractionContext;
  from: string;
  flow: string;
  flowKey: string | number;
  interactionId: string;
  question: {
    attempts: string[];
    isAnswering: boolean;
  };
}


export function createSmsCookie(req: TwilioWebhookRequest): SmsCookie {
  return {
    from: req.body.From,
    interactionId: uniqueString(),
    flow: null,
    flowKey: 0,
    context: {},
    question: {
      attempts: [],
      isAnswering: false,
    },
  };
}


export function handleQuestion(state: SmsCookie, question: Question): SmsCookie {
  if (state.question.isAnswering) {
    if (state.question.attempts.length > question.maxAttempts) {
      // TODO
    }
  }

  return {
    ...state,
    question: {
      attempts: [],
      isAnswering: true,
    },
  };
}


export function handleTrigger(state: SmsCookie, trigger: Trigger): SmsCookie {
  return {
    ...state,
    flow: trigger.flowName,
    flowKey: 0,
  };
}


export function incrementFlowAction(state: SmsCookie, flow: Flow): SmsCookie {
  const newState = { ...state };
  newState.flowKey = Number(state.flowKey) + 1;
  if (newState.flowKey === flow.length) {
    return null;
  }
  return state;
}


export function updateContext(
  state: SmsCookie,
  flow: Flow,
  action: Action,
): SmsCookie {
  return {
    ...state,
    context: {
      ...state.context,
      [flow.name]: {
        ...state.context[flow.name],
        [action.name]: action.getContext(),
      }
    },
  };
}
