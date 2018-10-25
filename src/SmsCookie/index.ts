import { ActionContext } from '../Actions';

export { default as createSmsCookie } from './create';
export { default as updateContext } from './updateContext';


type ContextMap<T> = { [index: string]: T };


export type FlowContext = ContextMap<ActionContext>;
export type InteractionContext = ContextMap<FlowContext>;


export interface SmsCookie {
  context: InteractionContext;
  from: string;
  flow: string;
  flowAction: string | number;
  interactionId: string;
  question: {
    isAnswering: boolean;
    attempts: string[];
  };
}
