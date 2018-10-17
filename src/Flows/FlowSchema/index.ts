import Flow from '../Flow';


export interface FlowSchemaParams {
  [index: string]: Flow | FlowSchema;
}


export default class FlowSchema {
  static validateInput(schema: FlowSchemaParams) {
    Object.keys(schema).forEach(
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
    FlowSchema.validateInput(schema);
  }
}
