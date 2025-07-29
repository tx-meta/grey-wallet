/**
 * Mock Wallet Repository Implementation
 * For testing purposes only
 */

import { Wallet } from '../../domain/entities/wallet';
import { WalletRepository } from '../../domain/repositories/wallet-repository';

export class MockWalletRepository implements WalletRepository {
  private wallets: Map<string, Wallet> = new Map();
  private addressCounters: Map<string, number> = new Map();

  async save(wallet: Wallet): Promise<Wallet> {
    this.wallets.set(wallet.walletId, wallet);
    return wallet;
  }

  async findById(walletId: string): Promise<Wallet | null> {
    return this.wallets.get(walletId) || null;
  }

  async findByTokenSymbol(tokenSymbol: string): Promise<Wallet | null> {
    for (const wallet of this.wallets.values()) {
      if (wallet.tokenSymbol === tokenSymbol) {
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

  async getAndIncrementAddressIndex(walletId: string): Promise<number> {
    const currentIndex = this.addressCounters.get(walletId) || 0;
    this.addressCounters.set(walletId, currentIndex + 1);
    return currentIndex;
  }

  async addUserAddress(userId: string, walletId: string, address: string): Promise<void> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // In a real implementation, this would save the user address to the database
    // For mock purposes, we just log the address
    console.log(`Adding user address: userId=${userId}, walletId=${walletId}, address=${address}`);
  }

  async findUserAddresses(_userId: string): Promise<{ walletId: string; address: string; tokenSymbol: string; tokenBalance: number }[]> {
    // In a real implementation, this would query the database
    // For mock purposes, return empty array
    return [];
  }
} 