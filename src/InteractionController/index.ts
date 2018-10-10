import { Request } from 'express';

import TwillyInteraction from './TwillyInteraction';
import SmsCookie from './SmsCookie';


export type InteractionMap = { [index: string]: TwillyInteraction };


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
    if (!interactions['*']) {
      // TODO typed errors?
      throw new Error(
        'No catch-all interaction (name: \'*\') found, catch-all is required.');
    }
  }

  constructor(
    private readonly cookieKey: string,
    private readonly interactions: InteractionMap,
  ) {
    InteractionController.validateInteractionMap(interactions);
  }

  deriveStateFromSmsCookie(req: Request): void {
    const smsCookie =
      <SmsCookie>JSON.parse(String(req.cookies[this.cookieKey]));

  }
}
