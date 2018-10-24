import { ActionContext } from '../Actions';

export { default as createSmsCookie } from './create';


type ContextMap<T> = { [index: string]: T };


export type FlowContext = ContextMap<ActionContext>;
export type InteractionContext = ContextMap<FlowContext>;


export interface SmsCookie {
  from: string;
  interactionId: string;
  currFlow: string;
  currFlowAction: string | number;
  context: InteractionContext; // TODO make type for this
}
