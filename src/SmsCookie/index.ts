export interface SmsCookie {
  from: string;
  interactionId: string;
  currFlow: string;
  currFlowAction: string | number;
  flowCtx: any; // TODO make type for this
}
