/**
 * Vault Service Interface
 * Defines the contract for secure key storage operations
 */

export interface WalletKeys {
  address: string;
  privateKey: string;
  derivationIndex: number;
}

export interface VaultService {
  // Wallet key management
  storeWalletKeys(walletId: string, tokenSymbol: string, keys: WalletKeys[]): Promise<void>;
  getWalletKeys(walletId: string, tokenSymbol: string): Promise<WalletKeys[]>;
  updateWalletKeys(walletId: string, tokenSymbol: string, keys: WalletKeys[]): Promise<void>;
  deleteWalletKeys(walletId: string, tokenSymbol: string): Promise<void>;

  // Verification token management
  storeVerificationToken(userId: string, type: 'email' | 'sms', token: string): Promise<void>;
  getVerificationToken(userId: string, type: 'email' | 'sms'): Promise<string | null>;
  deleteVerificationToken(userId: string, type: 'email' | 'sms'): Promise<void>;

  // Master wallet key management
  storeMasterWalletKey(tokenSymbol: string, privateKey: string): Promise<void>;
  getMasterWalletKey(tokenSymbol: string): Promise<string | null>;
  rotateMasterWalletKey(tokenSymbol: string): Promise<void>;

  // Health check
  isHealthy(): Promise<boolean>;
} 