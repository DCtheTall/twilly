import { SmsCookie } from '../SmsCookie';
import {
  Flow,
  FlowSchema,
  ROOT,
} from '../Flows';


export default class InteractionController {
  public readonly [ROOT]: Flow;

  static validateInteractionMap(interactions: FlowSchema) {
    Object.keys(interactions).forEach((name: string) => {
      const interaction = interactions[name];
      if (!(interaction instanceof Flow)) {
        // TODO typed error?
        throw new Error(
          `Unexpected value in provided interactions at key: ${name}`);
      }
    });
  }

  constructor(
    private readonly root: Flow,
    private readonly interactions: FlowSchema,
  ) {
    this[ROOT] = root;
    InteractionController.validateInteractionMap(interactions);
  }

  public deriveActionFromState(state: SmsCookie) {
    if (state === undefined) {
      // TODO design
    }
  }
}
