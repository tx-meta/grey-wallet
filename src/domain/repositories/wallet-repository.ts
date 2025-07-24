/**
 * Wallet Repository Interface
 * Defines the contract for wallet data access operations
 */

import { Wallet } from '../entities/wallet';

export interface WalletRepository {
  save(wallet: Wallet): Promise<Wallet>;
  findById(walletId: string): Promise<Wallet | null>;
  findByUserId(userId: string): Promise<Wallet | null>;
  update(wallet: Wallet): Promise<Wallet>;
  delete(walletId: string): Promise<boolean>;
  findActiveWallets(): Promise<Wallet[]>;
} 