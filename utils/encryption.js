import crypto from 'crypto';
import config from '../config.js';

const algorithm = 'aes-256-cbc';

const getKey = () => {
  if (!config.encryption.key) {
    throw new Error('ENCRYPTION_KEY is not set');
  }
  return Buffer.from(config.encryption.key, 'hex');
};

export function encrypt(text) {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decrypt(text) {
  const key = getKey();
  const value = String(text || '');
  if (!value.includes(':')) {
    return value;
  }

  const [ivHex, encryptedText] = value.split(':');
  if (!ivHex || !encryptedText) {
    return value;
  }

  try {
    const iv = Buffer.from(ivHex, 'hex');
    if (iv.length !== 16) {
      return value;
    }
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return value;
  }
}
