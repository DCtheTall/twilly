export interface InteractionParams {
  name: string;
}

export default class Interaction {
  public readonly name: string;

  constructor({
    name,
  }: InteractionParams) {
    this.name = name;
  }
}
