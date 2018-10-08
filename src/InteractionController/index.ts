import Interaction from './Interaction';
import TwilioController from '../TwilioController';


type InteractionMap = { [index: string]: Interaction };


export default class InteractionController {
  private interactions: InteractionMap;

  constructor(interactions: Interaction[]) {
    this.interactions = interactions.reduce(
      (acc: InteractionMap, interaction: Interaction) => {
        acc[interaction.name] = interaction;
        return acc;
      }, {});

    if (!this.interactions['*']) {
      throw new Error(
        'No catch-all interaction (name: \'*\') found, catch-all is required.');
    }
  }
}
