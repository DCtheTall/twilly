import { uniqueString } from '../util';
import {
  Action,
  ActionContext,
  Question,
  QuestionContext,
  Trigger,
} from '../Actions';
import { Flow } from '../Flows';
import { TwilioWebhookRequest } from '../TwilioController';


type ContextMap<T> = { [index: string]: T };

export type FlowContext<T> = ContextMap<ContextMap<T>>;
export type InteractionContext = FlowContext<ActionContext>;


export interface SmsCookie {
  context: InteractionContext;
  createdAt: Date;
  from: string;
  flow: string;
  flowKey: string | number;
  interactionComplete: boolean;
  interactionId: string;
  isComplete: boolean;
  question: {
    attempts: string[];
    isAnswering: boolean;
  };
}


export function completeInteraction(state: SmsCookie) {
  return { ...state, isComplete: true };
}


export function createSmsCookie(req: TwilioWebhookRequest): SmsCookie {
  return {
    context: {},
    createdAt: null,
    flow: null,
    flowKey: 0,
    from: req.body.From,
    interactionComplete: false,
    interactionId: uniqueString(),
    isComplete: false,
    question: {
      attempts: [],
      isAnswering: false,
    },
  };
}


export function startQuestion(
  state: SmsCookie,
): SmsCookie {
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


export function incrementFlowAction(
  state: SmsCookie,
  flow: Flow,
): SmsCookie {
  const newState = { ...state };
  newState.flowKey = Number(state.flowKey) + 1;
  if (newState.flowKey === flow.length) {
    return completeInteraction(state);
  }
  return newState;
}


function recordQuestionMessageSid(state: SmsCookie, flow: Flow, action: Question): string[] {
  const prevSid =
    (<string[]>((state.context[flow.name] || {})[action.name] || {}).messageSid || []);
  return [
    ...prevSid,
    ...(<string[]>action.sid || []),
  ];
}


export function updateContext(
  state: SmsCookie,
  flow: Flow,
  action: Action,
): SmsCookie {
  return state &&
    {
      ...state,
      context: {
        ...state.context,
        [flow.name]: {
          ...state.context[flow.name],
          [action.name]: action instanceof Question ?
            <QuestionContext>{
              ...action.getContext(),
              messageSid: recordQuestionMessageSid(state, flow, action),
            } : action.getContext(),
        }
      },
    };
}
