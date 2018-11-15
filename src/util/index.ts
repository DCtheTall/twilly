import { createHmac } from 'crypto';


export function getSha256Hash(secret: string, key: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(key);
  return hmac.digest('hex');
}


export function uniqueString(): string {
  return Math.random().toString(36).substring(2, 15)
       + Math.random().toString(36).substring(2, 15);
}
