export const ROOT = Symbol('sarsaparilla');


export interface FlowParams {
  name: string;
}


export default class Flow {
  public readonly name: string;

  constructor({
    name,
  }: FlowParams) {
    this.name = name;
  }
}
