import { SmsCookie } from '.';
import { uniqueString } from '../util';
import { TwilioWebhookRequest } from '../TwilioController';

export default function createSmsCookie(req: TwilioWebhookRequest): SmsCookie {
  return {
    from: req.body.From,
    interactionId: uniqueString(),
    flow: null,
    flowAction: 0,
    context: {},
    question: {
      isAnswering: false,
      attempts: [],
    },
  };
}
