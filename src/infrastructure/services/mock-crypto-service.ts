/**
 * Mock Crypto Service Implementation
 * For testing purposes only
 */

import { CryptoService } from '../../application/interfaces/crypto-service';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export class MockCryptoService implements CryptoService {
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  async generateToken(): Promise<string> {
    return crypto.randomBytes(32).toString('hex');
  }

  async generateNumericToken(length: number): Promise<string> {
    const digits = '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return result;
  }

  async generateJWT(payload: any, _expiresIn: string = '24h'): Promise<string> {
    // Mock JWT generation - in real implementation, use jsonwebtoken library
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto.randomBytes(32).toString('base64');
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  async verifyJWT(token: string): Promise<any> {
    // Mock JWT verification - in real implementation, use jsonwebtoken library
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    try {
      const payload = JSON.parse(Buffer.from(parts[1] || '', 'base64').toString());
      return payload;
    } catch (error) {
      throw new Error('Invalid JWT payload');
    }
  }

  async deriveKey(masterKey: string, path: string): Promise<string> {
    // Mock key derivation - in real implementation, use proper HD wallet libraries
    const data = `${masterKey}_${path}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    // Mock key pair generation - in real implementation, use proper crypto libraries
    const privateKey = crypto.randomBytes(32).toString('hex');
    const publicKey = crypto.createHash('sha256').update(privateKey).digest('hex');
    
    return { publicKey, privateKey };
  }

  async encrypt(data: string, key: string): Promise<string> {
    // Mock encryption - in real implementation, use proper encryption
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  async decrypt(encryptedData: string, key: string): Promise<string> {
    // Mock decryption - in real implementation, use proper decryption
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async generateBitcoinAddress(publicKey: string): Promise<string> {
    // Mock Bitcoin address generation
    const hash = crypto.createHash('sha256').update(publicKey).digest('hex');
    return `bc1${hash.substring(0, 40)}`;
  }

  async generateEthereumAddress(publicKey: string): Promise<string> {
    // Mock Ethereum address generation
    const hash = crypto.createHash('keccak256').update(publicKey).digest('hex');
    return `0x${hash.substring(hash.length - 40)}`;
  }

  async generateCardanoAddress(publicKey: string): Promise<string> {
    // Mock Cardano address generation
    const hash = crypto.createHash('sha256').update(publicKey).digest('hex');
    return `addr1${hash.substring(0, 40)}`;
  }

  async generateSolanaAddress(publicKey: string): Promise<string> {
    // Mock Solana address generation
    const hash = crypto.createHash('sha256').update(publicKey).digest('hex');
    return hash.substring(0, 44);
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
} 