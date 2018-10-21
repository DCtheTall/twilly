import { HALTING_ACTION } from '../symbols';

import Action from './Action';


const MessageTo = Symbol('to');
const MessageBody = Symbol('body');


export default class Messsage extends Action {
  private [MessageTo]: string;
  private [MessageBody]: string;

  constructor(
    name: string,
    to: string,
    body: string,
  ) {
    super(name);
    this[MessageTo] = to;
    this[MessageBody] = body;
    this[HALTING_ACTION] = false;
  }

  get to() {
    return this[MessageTo];
  }

  get body() {
    return this[MessageBody];
  }
}
