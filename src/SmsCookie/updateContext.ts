import { SmsCookie } from '.';
import { Flow } from '../Flows';
import { Action } from '../Actions';


export default function updateContext(
  state: SmsCookie,
  flow: Flow,
  action: Action,
): SmsCookie {
  return {
    ...state,
    context: {
      ...state.context,
      [flow.name]: {
        ...state.context[flow.name],
        [action.name]: action.getContext(),
      }
    },
  };
}
