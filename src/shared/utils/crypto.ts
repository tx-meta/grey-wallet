/**
 * Crypto Utilities
 * Cryptographic functions for wallet operations
 */

import * as crypto from 'crypto';
import * as bip39 from 'bip39';

// Generate a BIP39 mnemonic
export function generateMnemonic(): string {
  return bip39.generateMnemonic();
}

// Encrypt mnemonic using AES-256-GCM
export function encryptMnemonic(mnemonic: string, secret: string): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(secret, 'mnemonic_salt', 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(mnemonic, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

// Decrypt mnemonic
export function decryptMnemonic(encrypted: string, iv: string, tag: string, secret: string): string {
  const key = crypto.scryptSync(secret, 'mnemonic_salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Validate mnemonic
export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic);
} 