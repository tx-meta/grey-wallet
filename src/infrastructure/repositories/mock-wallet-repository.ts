/**
 * Mock Wallet Repository Implementation
 * For testing purposes only
 */

import { Wallet } from '../../domain/entities/wallet';
import { WalletRepository } from '../../domain/repositories/wallet-repository';

export class MockWalletRepository implements WalletRepository {
  private wallets: Map<string, Wallet> = new Map();

  async save(wallet: Wallet): Promise<Wallet> {
    this.wallets.set(wallet.walletId, wallet);
    return wallet;
  }

  async findById(walletId: string): Promise<Wallet | null> {
    return this.wallets.get(walletId) || null;
  }

  async findByUserId(userId: string): Promise<Wallet | null> {
    for (const wallet of this.wallets.values()) {
      if (wallet.userId === userId) {
        return wallet;
      }
    }
    return null;
  }

  async update(wallet: Wallet): Promise<Wallet> {
    this.wallets.set(wallet.walletId, wallet);
    return wallet;
  }

  async delete(walletId: string): Promise<boolean> {
    return this.wallets.delete(walletId);
  }

  async findActiveWallets(): Promise<Wallet[]> {
    return Array.from(this.wallets.values());
  }
} 