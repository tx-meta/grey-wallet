/**
 * Crypto Service Interface
 * Defines the contract for cryptographic operations
 */

export interface CryptoService {
  // Password operations
  hashPassword(password: string): Promise<string>;
  comparePassword(password: string, hash: string): Promise<boolean>;

  // Token generation
  generateToken(): Promise<string>;
  generateNumericToken(length: number): Promise<string>;
  generateJWT(payload: any, expiresIn?: string): Promise<string>;
  verifyJWT(token: string): Promise<any>;

  // Key derivation
  deriveKey(masterKey: string, path: string): Promise<string>;
  generateKeyPair(): Promise<{ publicKey: string; privateKey: string }>;

  // Encryption/Decryption
  encrypt(data: string, key: string): Promise<string>;
  decrypt(encryptedData: string, key: string): Promise<string>;

  // Address generation
  generateBitcoinAddress(publicKey: string): Promise<string>;
  generateEthereumAddress(publicKey: string): Promise<string>;
  generateCardanoAddress(publicKey: string): Promise<string>;
  generateSolanaAddress(publicKey: string): Promise<string>;

  // Health check
  isHealthy(): Promise<boolean>;
} 