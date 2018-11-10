import { uniqueString } from '../util';
import {
  Action,
  ActionContext,
  Question,
  QuestionContext,
  Trigger,
  ActionGetContext,
} from '../Actions';
import { Flow } from '../Flows';
import { TwilioWebhookRequest } from '../twllio';


export type FlowContext = { [index: string]: ActionContext };
export type InteractionContext = ActionContext[];

export interface SmsCookie {
  createdAt: Date;
  from: string;
  flow: string;
  flowContext: FlowContext;
  flowKey: string | number;
  interactionContext: InteractionContext;
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
    createdAt: null,
    flow: null,
    flowContext: {},
    flowKey: 0,
    from: req.body.From,
    interactionComplete: false,
    interactionContext: [],
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
    (<string[]>((state.flowContext[flow.name] || {})[action.name] || {}).messageSid || []);
  return [
    ...prevSid,
    ...(<string[]>action.sid || []),
  ];
}


function getActionContext(state, flow, action): ActionContext {
  return (action instanceof Question ?
    <QuestionContext>{
      ...action[ActionGetContext](),
      messageSid: recordQuestionMessageSid(state, flow, action),
    } : action[ActionGetContext]());
}


export function updateContext(
  state: SmsCookie,
  flow: Flow,
  action: Action,
): SmsCookie {
  return state &&
    {
      ...state,
      flowContext: {
        ...(flow.name === state.flow ? state.flowContext : {}),
        [action.name]: getActionContext(state, flow, action),
      },
      interactionContext: [
        ...state.interactionContext,
        getActionContext(state, flow, action),
      ],
    };
}
