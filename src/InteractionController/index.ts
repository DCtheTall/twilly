import SmsCookie from '../SmsCookie';
import TwillyInteraction from '../Interactions/TwillyInteraction';


export type InteractionMap = {
  [index: string]: TwillyInteraction;
};


export default class InteractionController {
  static validateInteractionMap(interactions: InteractionMap) {
    Object.keys(interactions).forEach((name: string) => {
      const interaction = interactions[name];
      if (!(interaction instanceof TwillyInteraction)) {
        // TODO typed error?
        throw new Error(
          `Unexpected value in provided interactions at key: ${name}`);
      }
    });
  }

  constructor(
    private readonly rootInteraction: TwillyInteraction,
    private readonly interactions: InteractionMap,
  ) {
    InteractionController.validateInteractionMap(interactions);
  }

  public deriveActionFromState(state: SmsCookie) {
    if (state === undefined) {
      // TODO design
    }
  }
}
