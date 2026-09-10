import crypto from 'node:crypto';

export function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashString(string) {
  return crypto.createHash('sha256').update(string).digest('hex');
}

export default { generateRandomToken, hashString };
