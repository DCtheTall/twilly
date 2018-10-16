export interface InteractionParams {
  name: string;
}

export default class TwillyInteraction {
  public readonly name: string;

  constructor({
    name,
  }: InteractionParams) {
    this.name = name;
  }
}
