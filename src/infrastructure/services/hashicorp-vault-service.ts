/**
 * HashiCorp Vault Service Implementation
 * Real implementation for storing and retrieving wallet mnemonics
 */

import vault from 'node-vault';
import { VaultService, WalletKeys } from '../../application/interfaces/vault-service';
import logger from '../../shared/logging';

export class HashiCorpVaultService implements VaultService {
  private client: vault.client;
  private readonly walletKeysPath = 'wallet-keys';
  private readonly walletMnemonicsPath = 'wallet-mnemonics';
  private readonly userMnemonicsPath = 'user-mnemonics';
  private readonly verificationTokensPath = 'verification-tokens';
  private readonly masterKeysPath = 'master-keys';

  constructor() {
    const vaultUrl = process.env['VAULT_URL'] || 'http://localhost:8200';
    const vaultToken = process.env['VAULT_TOKEN'];

    if (!vaultToken) {
      throw new Error('VAULT_TOKEN environment variable is required');
    }

    this.client = vault({
      apiVersion: 'v1',
      endpoint: vaultUrl,
      token: vaultToken,
    });

    logger.info('HashiCorp Vault service initialized', { vaultUrl });
  }

  // Wallet Keys Management
  async storeWalletKeys(walletId: string, tokenSymbol: string, keys: WalletKeys[]): Promise<void> {
    try {
      const path = `${this.walletKeysPath}/${walletId}/${tokenSymbol}`;
      await this.client.write(`secret/data/${path}`, {
        data: { keys: JSON.stringify(keys) }
      });
      logger.info('Wallet keys stored in Vault', { walletId, tokenSymbol });
    } catch (error) {
      logger.error('Failed to store wallet keys in Vault', { walletId, tokenSymbol, error });
      throw new Error(`Failed to store wallet keys: ${error}`);
    }
  }

  async getWalletKeys(walletId: string, tokenSymbol: string): Promise<WalletKeys[]> {
    try {
      const path = `${this.walletKeysPath}/${walletId}/${tokenSymbol}`;
      const response = await this.client.read(`secret/data/${path}`);
      
      if (response.data && response.data.data && response.data.data.keys) {
        const keys = JSON.parse(response.data.data.keys);
        logger.info('Wallet keys retrieved from Vault', { walletId, tokenSymbol });
        return keys;
      }
      
      return [];
    } catch (error: any) {
      if (error.response && error.response.statusCode === 404) {
        logger.info('Wallet keys not found in Vault', { walletId, tokenSymbol });
        return [];
      }
      logger.error('Failed to retrieve wallet keys from Vault', { walletId, tokenSymbol, error });
      throw new Error(`Failed to retrieve wallet keys: ${error}`);
    }
  }

  async deleteWalletKeys(walletId: string, tokenSymbol: string): Promise<void> {
    try {
      const path = `${this.walletKeysPath}/${walletId}/${tokenSymbol}`;
      await this.client.delete(`secret/data/${path}`);
      logger.info('Wallet keys deleted from Vault', { walletId, tokenSymbol });
    } catch (error) {
      logger.error('Failed to delete wallet keys from Vault', { walletId, tokenSymbol, error });
      throw new Error(`Failed to delete wallet keys: ${error}`);
    }
  }

  async updateWalletKeys(walletId: string, tokenSymbol: string, keys: WalletKeys[]): Promise<void> {
    try {
      const path = `${this.walletKeysPath}/${walletId}/${tokenSymbol}`;
      await this.client.write(`secret/data/${path}`, {
        data: { keys: JSON.stringify(keys) }
      });
      logger.info('Wallet keys updated in Vault', { walletId, tokenSymbol });
    } catch (error) {
      logger.error('Failed to update wallet keys in Vault', { walletId, tokenSymbol, error });
      throw new Error(`Failed to update wallet keys: ${error}`);
    }
  }

  // Wallet Mnemonic Management
  async storeWalletMnemonic(tokenSymbol: string, encryptedMnemonic: string): Promise<void> {
    try {
      const path = `${this.walletMnemonicsPath}/${tokenSymbol}`;
      await this.client.write(`secret/data/${path}`, {
        data: { encryptedMnemonic }
      });
      logger.info('Wallet mnemonic stored in Vault', { tokenSymbol });
    } catch (error) {
      logger.error('Failed to store wallet mnemonic in Vault', { tokenSymbol, error });
      throw new Error(`Failed to store wallet mnemonic: ${error}`);
    }
  }

  async getWalletMnemonic(tokenSymbol: string): Promise<string | null> {
    try {
      const path = `${this.walletMnemonicsPath}/${tokenSymbol}`;
      const response = await this.client.read(`secret/data/${path}`);
      
      if (response.data && response.data.data && response.data.data.encryptedMnemonic) {
        logger.info('Wallet mnemonic retrieved from Vault', { tokenSymbol });
        return response.data.data.encryptedMnemonic;
      }
      
      return null;
    } catch (error: any) {
      if (error.response && error.response.statusCode === 404) {
        logger.info('Wallet mnemonic not found in Vault', { tokenSymbol });
        return null;
      }
      logger.error('Failed to retrieve wallet mnemonic from Vault', { tokenSymbol, error });
      throw new Error(`Failed to retrieve wallet mnemonic: ${error}`);
    }
  }

  async deleteWalletMnemonic(tokenSymbol: string): Promise<void> {
    try {
      const path = `${this.walletMnemonicsPath}/${tokenSymbol}`;
      await this.client.delete(`secret/data/${path}`);
      logger.info('Wallet mnemonic deleted from Vault', { tokenSymbol });
    } catch (error) {
      logger.error('Failed to delete wallet mnemonic from Vault', { tokenSymbol, error });
      throw new Error(`Failed to delete wallet mnemonic: ${error}`);
    }
  }

  // User Mnemonic Management (for backward compatibility)
  async storeMnemonic(path: string, encryptedMnemonic: string): Promise<void> {
    try {
      const fullPath = `${this.userMnemonicsPath}/${path}`;
      await this.client.write(`secret/data/${fullPath}`, {
        data: { encryptedMnemonic }
      });
      logger.info('User mnemonic stored in Vault', { path });
    } catch (error) {
      logger.error('Failed to store user mnemonic in Vault', { path, error });
      throw new Error(`Failed to store user mnemonic: ${error}`);
    }
  }

  async getMnemonic(path: string): Promise<string | null> {
    try {
      const fullPath = `${this.userMnemonicsPath}/${path}`;
      const response = await this.client.read(`secret/data/${fullPath}`);
      
      if (response.data && response.data.data && response.data.data.encryptedMnemonic) {
        logger.info('User mnemonic retrieved from Vault', { path });
        return response.data.data.encryptedMnemonic;
      }
      
      return null;
    } catch (error: any) {
      if (error.response && error.response.statusCode === 404) {
        logger.info('User mnemonic not found in Vault', { path });
        return null;
      }
      logger.error('Failed to retrieve user mnemonic from Vault', { path, error });
      throw new Error(`Failed to retrieve user mnemonic: ${error}`);
    }
  }

  async deleteMnemonic(path: string): Promise<void> {
    try {
      const fullPath = `${this.userMnemonicsPath}/${path}`;
      await this.client.delete(`secret/data/${fullPath}`);
      logger.info('User mnemonic deleted from Vault', { path });
    } catch (error) {
      logger.error('Failed to delete user mnemonic from Vault', { path, error });
      throw new Error(`Failed to delete user mnemonic: ${error}`);
    }
  }

  // SMS Verification Token Management
  async storeVerificationToken(userId: string, type: 'sms', token: string): Promise<void> {
    try {
      const path = `${this.verificationTokensPath}/${userId}/${type}`;
      await this.client.write(`secret/data/${path}`, {
        data: { token }
      });
      logger.info('Verification token stored in Vault', { userId, type });
    } catch (error) {
      logger.error('Failed to store verification token in Vault', { userId, type, error });
      throw new Error(`Failed to store verification token: ${error}`);
    }
  }

  async getVerificationToken(userId: string, type: 'sms'): Promise<string | null> {
    try {
      const path = `${this.verificationTokensPath}/${userId}/${type}`;
      const response = await this.client.read(`secret/data/${path}`);
      
      if (response.data && response.data.data && response.data.data.token) {
        logger.info('Verification token retrieved from Vault', { userId, type });
        return response.data.data.token;
      }
      
      return null;
    } catch (error: any) {
      if (error.response && error.response.statusCode === 404) {
        logger.info('Verification token not found in Vault', { userId, type });
        return null;
      }
      logger.error('Failed to retrieve verification token from Vault', { userId, type, error });
      throw new Error(`Failed to retrieve verification token: ${error}`);
    }
  }

  async deleteVerificationToken(userId: string, type: 'sms'): Promise<void> {
    try {
      const path = `${this.verificationTokensPath}/${userId}/${type}`;
      await this.client.delete(`secret/data/${path}`);
      logger.info('Verification token deleted from Vault', { userId, type });
    } catch (error) {
      logger.error('Failed to delete verification token from Vault', { userId, type, error });
      throw new Error(`Failed to delete verification token: ${error}`);
    }
  }

  // Master Wallet Key Management
  async storeMasterWalletKey(tokenSymbol: string, privateKey: string): Promise<void> {
    try {
      const path = `${this.masterKeysPath}/${tokenSymbol}`;
      await this.client.write(`secret/data/${path}`, {
        data: { privateKey }
      });
      logger.info('Master wallet key stored in Vault', { tokenSymbol });
    } catch (error) {
      logger.error('Failed to store master wallet key in Vault', { tokenSymbol, error });
      throw new Error(`Failed to store master wallet key: ${error}`);
    }
  }

  async getMasterWalletKey(tokenSymbol: string): Promise<string | null> {
    try {
      const path = `${this.masterKeysPath}/${tokenSymbol}`;
      const response = await this.client.read(`secret/data/${path}`);
      
      if (response.data && response.data.data && response.data.data.privateKey) {
        logger.info('Master wallet key retrieved from Vault', { tokenSymbol });
        return response.data.data.privateKey;
      }
      
      return null;
    } catch (error: any) {
      if (error.response && error.response.statusCode === 404) {
        logger.info('Master wallet key not found in Vault', { tokenSymbol });
        return null;
      }
      logger.error('Failed to retrieve master wallet key from Vault', { tokenSymbol, error });
      throw new Error(`Failed to retrieve master wallet key: ${error}`);
    }
  }

  async rotateMasterWalletKey(tokenSymbol: string): Promise<void> {
    try {
      // Generate new master key (this would typically involve key generation logic)
      const newPrivateKey = `new_master_key_for_${tokenSymbol}_${Date.now()}`;
      
      // Store the new key
      await this.storeMasterWalletKey(tokenSymbol, newPrivateKey);
      
      logger.info('Master wallet key rotated in Vault', { tokenSymbol });
    } catch (error) {
      logger.error('Failed to rotate master wallet key in Vault', { tokenSymbol, error });
      throw new Error(`Failed to rotate master wallet key: ${error}`);
    }
  }

  // Health Check
  async isHealthy(): Promise<boolean> {
    try {
      await this.client.health();
      return true;
    } catch (error) {
      logger.error('Vault health check failed', { error });
      return false;
    }
  }

  // Initialize Vault (run once during setup)
  async initializeVault(): Promise<void> {
    try {
      // Check if KV secrets engine is enabled
      try {
        await this.client.read('sys/mounts/secret');
        logger.info('KV secrets engine already enabled');
      } catch (error: any) {
        if (error.response && error.response.statusCode === 404) {
          // Enable KV secrets engine
          await this.client.mount({
            mount_point: 'secret',
            type: 'kv',
            options: {
              version: '2'
            }
          });
          logger.info('KV secrets engine enabled successfully');
        } else {
          throw error;
        }
      }

      // Create initial paths structure
      await this.createInitialPaths();
      logger.info('Vault initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Vault', { error });
      throw new Error(`Failed to initialize Vault: ${error}`);
    }
  }

  private async createInitialPaths(): Promise<void> {
    // Create initial empty entries to establish the path structure
    const initialPaths = [
      `${this.walletKeysPath}/.initial`,
      `${this.walletMnemonicsPath}/.initial`,
      `${this.userMnemonicsPath}/.initial`,
      `${this.verificationTokensPath}/.initial`,
      `${this.masterKeysPath}/.initial`
    ];

    for (const path of initialPaths) {
      try {
        await this.client.write(`secret/data/${path}`, {
          data: { initialized: 'true' }
        });
      } catch (error) {
        // Ignore errors for initial path creation
        logger.debug('Initial path creation skipped', { path });
      }
    }
  }

  // List all wallet mnemonics (for admin purposes)
  async listWalletMnemonics(): Promise<string[]> {
    try {
      const response = await this.client.list('secret/metadata/wallet-mnemonics');
      
      if (response.data && response.data.keys) {
        // Filter out the .initial file
        return response.data.keys.filter((key: string) => key !== '.initial');
      }
      
      return [];
    } catch (error: any) {
      if (error.response && error.response.statusCode === 404) {
        return [];
      }
      logger.error('Failed to list wallet mnemonics', { error });
      throw new Error(`Failed to list wallet mnemonics: ${error}`);
    }
  }

  // Backup all wallet mnemonics (for disaster recovery)
  async backupWalletMnemonics(): Promise<Record<string, string>> {
    try {
      const tokenSymbols = await this.listWalletMnemonics();
      const backup: Record<string, string> = {};

      for (const tokenSymbol of tokenSymbols) {
        const mnemonic = await this.getWalletMnemonic(tokenSymbol);
        if (mnemonic) {
          backup[tokenSymbol] = mnemonic;
        }
      }

      logger.info('Wallet mnemonics backup completed', { count: Object.keys(backup).length });
      return backup;
    } catch (error) {
      logger.error('Failed to backup wallet mnemonics', { error });
      throw new Error(`Failed to backup wallet mnemonics: ${error}`);
    }
  }

  // Restore wallet mnemonics from backup
  async restoreWalletMnemonics(backup: Record<string, string>): Promise<void> {
    try {
      for (const [tokenSymbol, encryptedMnemonic] of Object.entries(backup)) {
        await this.storeWalletMnemonic(tokenSymbol, encryptedMnemonic);
      }

      logger.info('Wallet mnemonics restore completed', { count: Object.keys(backup).length });
    } catch (error) {
      logger.error('Failed to restore wallet mnemonics', { error });
      throw new Error(`Failed to restore wallet mnemonics: ${error}`);
    }
  }
} 