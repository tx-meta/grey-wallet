/**
 * Mock Wallet Repository Implementation
 * For testing purposes only
 */

import { Wallet } from '../../domain/entities/wallet';
import { WalletRepository } from '../../domain/repositories/wallet-repository';

export class MockWalletRepository implements WalletRepository {
  private wallets: Map<string, Wallet> = new Map();
  private addressCounters: Map<string, number> = new Map();
  private transactions: any[] = [];
  private userTokenBalances: Map<string, Map<string, number>> = new Map();

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

  async createTransaction(transactionData: {
    userId: string;
    transactionType: string;
    tokenSymbol: string;
    fiatAmount: number;
    cryptoAmount: number;
    exchangeRate: number;
    platformFee: number;
    totalAmount: number;
    phoneNumber: string;
    status: string;
  }): Promise<string> {
    // In a real implementation, this would save to database
    // For mock purposes, return a mock transaction ID
    const transactionId = `mock-transaction-${Date.now()}`;
    console.log('Mock: Created transaction', { transactionId, ...transactionData });
    return transactionId;
  }

  async findTransactionByCheckoutId(checkoutRequestId: string): Promise<{
    id: string;
    userId: string;
    tokenSymbol: string;
    fiatAmount: number;
    cryptoAmount: number;
    phoneNumber: string;
    status: string;
    transactionType: string;
  } | null> {
    // In a real implementation, this would query the database
    // For mock purposes, return null
    console.log('Mock: Finding transaction by checkout ID', { checkoutRequestId });
    return null;
  }

  async updateTransactionStatus(transactionId: string, status: string): Promise<void> {
    // In a real implementation, this would update the database
    // For mock purposes, just log
    console.log('Mock: Updated transaction status', { transactionId, status });
  }

  async updateTransactionPaymentDetails(transactionId: string, paymentDetails: {
    checkoutRequestId?: string;
    merchantRequestId?: string;
    mpesaReceiptNumber?: string;
    transactionDate?: string;
    status?: string;
  }): Promise<void> {
    // In a real implementation, this would update the database
    // For mock purposes, just log
    console.log('Mock: Updated transaction payment details', { transactionId, paymentDetails });
  }

  async updateUserTokenBalance(userId: string, tokenSymbol: string, amount: number): Promise<void> {
    // In a real implementation, this would update the database
    // For mock purposes, just log
    console.log('Mock: Updated user token balance', { userId, tokenSymbol, amount });
  }

  async getTransactionById(transactionId: string): Promise<{
    id: string;
    userId: string;
    transactionType: string;
    tokenSymbol: string;
    fiatAmount: number;
    cryptoAmount: number;
    phoneNumber: string;
    status: string;
    checkoutRequestId: string | null;
    merchantRequestId: string | null;
    mpesaReceiptNumber: string | null;
    transactionDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    // In a real implementation, this would query the database
    // For mock purposes, return a mock transaction if the ID matches a pattern
    console.log('Mock: Getting transaction by ID', { transactionId });
    
    // Return a mock transaction for testing purposes
    if (transactionId.startsWith('mock-transaction-')) {
      return {
        id: transactionId,
        userId: 'mock-user-id',
        transactionType: 'ON_RAMP',
        tokenSymbol: 'BTC',
        fiatAmount: 1000,
        cryptoAmount: 0.00022222,
        phoneNumber: '254700000000',
        status: 'processing',
        checkoutRequestId: 'ws_CO_123456789',
        merchantRequestId: '12345-67890-12345',
        mpesaReceiptNumber: null,
        transactionDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    
    return null;
  }

  async findTransactionByCheckoutRequestId(checkoutRequestId: string): Promise<{
    id: string;
    userId: string;
    transactionType: string;
    tokenSymbol: string;
    fiatAmount: number;
    cryptoAmount: number;
    phoneNumber: string;
    status: string;
  } | null> {
    // Mock implementation - find transaction by checkout request ID
    const transaction = this.transactions.find(t => t.checkoutRequestId === checkoutRequestId);
    if (transaction) {
      return {
        id: transaction.id,
        userId: transaction.userId,
        transactionType: transaction.transactionType,
        tokenSymbol: transaction.tokenSymbol,
        fiatAmount: transaction.fiatAmount,
        cryptoAmount: transaction.cryptoAmount,
        phoneNumber: transaction.phoneNumber,
        status: transaction.status,
      };
    }
    return null;
  }

  async findTransactionByOriginatorConversationId(originatorConversationId: string): Promise<{
    id: string;
    userId: string;
    transactionType: string;
    tokenSymbol: string;
    fiatAmount: number;
    cryptoAmount: number;
    phoneNumber: string;
    status: string;
  } | null> {
    // Mock implementation - find transaction by originator conversation ID
    const transaction = this.transactions.find(t => t.id === originatorConversationId);
    if (transaction) {
      return {
        id: transaction.id,
        userId: transaction.userId,
        transactionType: transaction.transactionType,
        tokenSymbol: transaction.tokenSymbol,
        fiatAmount: transaction.fiatAmount,
        cryptoAmount: transaction.cryptoAmount,
        phoneNumber: transaction.phoneNumber,
        status: transaction.status,
      };
    }
    return null;
  }

  async getUserTokenBalance(userId: string, tokenSymbol: string): Promise<number> {
    // Mock implementation - get user token balance
    const userBalances = this.userTokenBalances.get(userId) || new Map();
    return userBalances.get(tokenSymbol.toUpperCase()) || 0;
  }
} 