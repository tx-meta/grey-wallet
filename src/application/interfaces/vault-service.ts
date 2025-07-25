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

  // Wallet mnemonic management
  storeWalletMnemonic(tokenSymbol: string, encryptedMnemonic: string): Promise<void>;
  getWalletMnemonic(tokenSymbol: string): Promise<string | null>;
  deleteWalletMnemonic(tokenSymbol: string): Promise<void>;

  // User mnemonic management (for backward compatibility)
  storeMnemonic(path: string, encryptedMnemonic: string): Promise<void>;
  getMnemonic(path: string): Promise<string | null>;
  deleteMnemonic(path: string): Promise<void>;

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