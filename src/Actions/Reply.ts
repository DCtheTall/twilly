import { HALTING_ACTION } from '../symbols';

import Message from './Message';


export default class Reply extends Message {
  constructor(name: string, body: string) {
    super(name, null, body);
    this[HALTING_ACTION] = false;
  }
}
