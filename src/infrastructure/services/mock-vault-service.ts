/**
 * Mock Vault Service Implementation
 * For testing purposes only
 */

import { VaultService, WalletKeys } from '../../application/interfaces/vault-service';
import logger from '../../../shared/logging';

export class MockVaultService implements VaultService {
  private walletKeys: Map<string, WalletKeys[]> = new Map();
  private verificationTokens: Map<string, string> = new Map();
  private masterKeys: Map<string, string> = new Map();

  async storeWalletKeys(walletId: string, tokenSymbol: string, keys: WalletKeys[]): Promise<void> {
    const key = `${walletId}_${tokenSymbol}`;
    this.walletKeys.set(key, keys);
    logger.info('Mock vault: stored wallet keys', { walletId, tokenSymbol });
  }

  async getWalletKeys(walletId: string, tokenSymbol: string): Promise<WalletKeys[]> {
    const key = `${walletId}_${tokenSymbol}`;
    return this.walletKeys.get(key) || [];
  }

  async updateWalletKeys(walletId: string, tokenSymbol: string, keys: WalletKeys[]): Promise<void> {
    const key = `${walletId}_${tokenSymbol}`;
    this.walletKeys.set(key, keys);
    logger.info('Mock vault: updated wallet keys', { walletId, tokenSymbol });
  }

  async deleteWalletKeys(walletId: string, tokenSymbol: string): Promise<void> {
    const key = `${walletId}_${tokenSymbol}`;
    this.walletKeys.delete(key);
    logger.info('Mock vault: deleted wallet keys', { walletId, tokenSymbol });
  }

  async storeVerificationToken(userId: string, type: 'email' | 'sms', token: string): Promise<void> {
    const key = `${userId}_${type}`;
    this.verificationTokens.set(key, token);
    logger.info('Mock vault: stored verification token', { userId, type });
  }

  async getVerificationToken(userId: string, type: 'email' | 'sms'): Promise<string | null> {
    const key = `${userId}_${type}`;
    return this.verificationTokens.get(key) || null;
  }

  async deleteVerificationToken(userId: string, type: 'email' | 'sms'): Promise<void> {
    const key = `${userId}_${type}`;
    this.verificationTokens.delete(key);
    logger.info('Mock vault: deleted verification token', { userId, type });
  }

  async storeMasterWalletKey(tokenSymbol: string, privateKey: string): Promise<void> {
    this.masterKeys.set(tokenSymbol, privateKey);
    logger.info('Mock vault: stored master wallet key', { tokenSymbol });
  }

  async getMasterWalletKey(tokenSymbol: string): Promise<string | null> {
    return this.masterKeys.get(tokenSymbol) || null;
  }

  async rotateMasterWalletKey(tokenSymbol: string): Promise<void> {
    // In a real implementation, this would generate a new key and update it
    logger.info('Mock vault: rotated master wallet key', { tokenSymbol });
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
} 