import Flow from '../Flow';


export interface FlowSchemaParams {
  [index: string]: Flow | FlowSchema;
}


const FlowSchemaValidateInput = Symbol('validateInput');


export default class FlowSchema {
  static [FlowSchemaValidateInput](schema: FlowSchemaParams) {
    if (
      typeof schema !== 'object' ||
      schema === null ||
      Array.isArray(schema)
    ) {
      throw new TypeError(
        'The argument of the flow schema constructor must be an object');
    }
    Object.keys(schema).map(
      (key: string) => {
        const u = schema[key];
        if (!(u instanceof Flow || u instanceof FlowSchema)) {
          throw new TypeError(
            'Each key of a FlowSchema must be a Flow or another FlowSchema');
        }
      });
  }

  constructor(
    public readonly schema: FlowSchemaParams,
  ) {
    FlowSchema[FlowSchemaValidateInput](schema);
  }
}
