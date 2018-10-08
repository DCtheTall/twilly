import { createHmac } from 'crypto';


export function getCookieSecret(accountSid: string, authToken: string): string {
  const hmac = createHmac('sha256', accountSid);
  hmac.update(authToken);
  return hmac.digest('hex');
}
