import Flow from './Flow';


export const FLOW_SCHEMA = Symbol('graph');


export interface FlowSchemaParams {
  [index: string]: Flow;
}


export default class FlowSchema {
  public readonly [FLOW_SCHEMA]: boolean = true;

  constructor ({}: FlowSchemaParams) {}
}
