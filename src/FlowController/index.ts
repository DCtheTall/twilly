import { FLOW_NAME } from '../symbols';

import { SmsCookie } from '../SmsCookie';
import {
  Flow,
  FlowSchema,
  EvaluatedSchema,
  evaluateSchema,
} from '../Flows';


export default class FlowController {
  private readonly root: Flow;
  private readonly schema: EvaluatedSchema;

  constructor(
    root: Flow,
    schema?: FlowSchema,
  ) {
    this.root = root;
    if (schema) {
      this.schema = evaluateSchema(root, schema);
    }
  }

  public deriveActionFromState(state: SmsCookie) {
    let currFlow: Flow;

    if (state === undefined) {
      currFlow = this.root;
    } else {
      currFlow =
        state.currentFlow === this.root[FLOW_NAME] ?
          this.root : this.root[state.currentFlow];
    }

    console.log(currFlow);
  }
}
