/**
 * Wallet Repository Interface
 * Defines the contract for wallet data access operations
 */

import { Wallet } from '../entities/wallet';

export interface WalletRepository {
  // Wallet management
  save(wallet: Wallet): Promise<Wallet>;
  findById(walletId: string): Promise<Wallet | null>;
  findByTokenSymbol(tokenSymbol: string): Promise<Wallet | null>;
  update(wallet: Wallet): Promise<Wallet>;
  delete(walletId: string): Promise<boolean>;
  findActiveWallets(): Promise<Wallet[]>;
  
  // Address management
  getAndIncrementAddressIndex(walletId: string): Promise<number>;
  addUserAddress(userId: string, walletId: string, address: string): Promise<void>;
  findUserAddresses(userId: string): Promise<{ walletId: string; address: string; tokenSymbol: string }[]>;
} 