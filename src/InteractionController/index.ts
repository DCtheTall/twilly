import { SmsCookie } from '../SmsCookie';
import {
  ROOT,
  Flow,
  FlowSchema,
  EvaluatedSchema,
  evaluateSchema,
} from '../Flows';


const SCHEMA = Symbol('schema');


export default class InteractionController {
  private readonly [ROOT]: Flow;
  private [SCHEMA]: EvaluatedSchema;

  constructor(
    root: Flow,
    schema?: FlowSchema,
  ) {
    this[ROOT] = root;
    if (schema) {
      this[SCHEMA] = evaluateSchema(schema);
    }
  }

  public deriveActionFromState(state: SmsCookie) {
    if (state === undefined) {
      // TODO design
    }
  }
}
