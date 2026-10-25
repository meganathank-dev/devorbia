import { randomBytes, createHash, scrypt as rawScrypt, timingSafeEqual, createCipheriv, createDecipheriv } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(rawScrypt);
export const randomToken = () => randomBytes(32).toString('base64url');
export const digest = value => createHash('sha256').update(String(value)).digest('hex');
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1
  });
  return `scrypt:${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  if (!stored) return false;
  const [scheme, salt, expected] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !/^[a-f0-9]{128}$/.test(expected || '')) return false;
  const actual = await scrypt(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1
  });
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}
export function encrypt(text, secret) {
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', Buffer.from(digest(secret), 'hex'), iv);
  const result = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return [iv.toString('hex'), cipher.getAuthTag().toString('hex'), result.toString('base64')].join('.');
}
export function decrypt(text, secret) {
  const [iv, tag, body] = text.split('.');
  const cipher = createDecipheriv('aes-256-gcm', Buffer.from(digest(secret), 'hex'), Buffer.from(iv, 'hex'));
  cipher.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([cipher.update(Buffer.from(body, 'base64')), cipher.final()]).toString('utf8');
}
