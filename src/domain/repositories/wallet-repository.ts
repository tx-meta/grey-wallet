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
  findUserAddresses(userId: string): Promise<{ walletId: string; address: string; tokenSymbol: string; tokenBalance: number }[]>;
  getAllUserAddresses(tokenSymbol: string): Promise<{ userId: string; address: string; tokenSymbol: string; tokenBalance: number }[]>;
  
  // Transaction management
  createTransaction(transactionData: {
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
  }): Promise<string>;
  
  findTransactionByCheckoutId(checkoutRequestId: string): Promise<{
    id: string;
    userId: string;
    tokenSymbol: string;
    fiatAmount: number;
    cryptoAmount: number;
    phoneNumber: string;
    status: string;
    transactionType: string;
  } | null>;
  
  updateTransactionStatus(transactionId: string, status: string): Promise<void>;
  
  updateTransactionPaymentDetails(transactionId: string, paymentDetails: {
    checkoutRequestId?: string | undefined;
    merchantRequestId?: string | undefined;
    mpesaReceiptNumber?: string | undefined;
    transactionDate?: string | undefined;
    status?: string | undefined;
    originatorConversationId?: string | undefined;
    amount?: number | undefined;
  }): Promise<void>;
  
  updateUserTokenBalance(userId: string, tokenSymbol: string, amount: number): Promise<void>;
  
  getTransactionById(transactionId: string): Promise<{
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
  } | null>;

  findTransactionByCheckoutRequestId(checkoutRequestId: string): Promise<{
    id: string;
    userId: string;
    transactionType: string;
    tokenSymbol: string;
    fiatAmount: number;
    cryptoAmount: number;
    phoneNumber: string;
    status: string;
  } | null>;

  findTransactionByOriginatorConversationId(originatorConversationId: string): Promise<{
    id: string;
    userId: string;
    transactionType: string;
    tokenSymbol: string;
    fiatAmount: number;
    cryptoAmount: number;
    phoneNumber: string;
    status: string;
  } | null>;

  getUserTokenBalance(userId: string, tokenSymbol: string): Promise<number>;
} 