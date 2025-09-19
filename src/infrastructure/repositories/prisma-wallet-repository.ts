/**
 * Prisma Wallet Repository Implementation
 * Real database implementation using Prisma ORM
 */

import { Wallet } from '../../domain/entities/wallet';
import { WalletRepository } from '../../domain/repositories/wallet-repository';
import prisma from '../database/prisma-client';

export class PrismaWalletRepository implements WalletRepository {

  async save(wallet: Wallet): Promise<Wallet> {
    const savedWallet = await prisma.wallet.create({
      data: {
        walletId: wallet.walletId,
        tokenSymbol: wallet.tokenSymbol,
        walletBalance: wallet.walletBalance,
      },
    });

    return this.mapToDomain(savedWallet);
  }

  async findById(walletId: string): Promise<Wallet | null> {
    const wallet = await prisma.wallet.findUnique({
      where: { walletId },
    });

    return wallet ? this.mapToDomain(wallet) : null;
  }

  async findByTokenSymbol(tokenSymbol: string): Promise<Wallet | null> {
    const wallet = await prisma.wallet.findUnique({
      where: { tokenSymbol },
    });

    return wallet ? this.mapToDomain(wallet) : null;
  }

  async update(wallet: Wallet): Promise<Wallet> {
    const updatedWallet = await prisma.wallet.update({
      where: { walletId: wallet.walletId },
      data: {
        tokenSymbol: wallet.tokenSymbol,
        walletBalance: wallet.walletBalance,
      },
    });

    return this.mapToDomain(updatedWallet);
  }

  async delete(walletId: string): Promise<boolean> {
    try {
      await prisma.wallet.delete({
        where: { walletId },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async findActiveWallets(): Promise<Wallet[]> {
    const wallets = await prisma.wallet.findMany();
    return wallets.map((wallet: any) => this.mapToDomain(wallet));
  }

  async getAndIncrementAddressIndex(walletId: string): Promise<number> {
    const result = await prisma.$transaction(async (tx: any) => {
      // Find or create address counter
      let counter = await tx.addressCounter.findUnique({
        where: { walletId },
      });

      if (!counter) {
        counter = await tx.addressCounter.create({
          data: {
            walletId,
            nextIndex: 0,
          },
        });
      }

      // Increment and return the current index
      const updatedCounter = await tx.addressCounter.update({
        where: { walletId },
        data: {
          nextIndex: counter.nextIndex + 1,
        },
      });

      return updatedCounter.nextIndex - 1; // Return the index before increment
    });

    return result;
  }

  async addUserAddress(userId: string, walletId: string, address: string): Promise<void> {
    await prisma.userAddress.create({
      data: {
        userId,
        walletId,
        address,
        tokenBalance: 0,
      },
    });
  }

  async findUserAddresses(userId: string): Promise<{ walletId: string; address: string; tokenSymbol: string; tokenBalance: number }[]> {
    const userAddresses = await prisma.userAddress.findMany({
      where: { userId },
      include: {
        wallet: true,
      },
    });

    return userAddresses.map((ua: any) => ({
      walletId: ua.walletId,
      address: ua.address,
      tokenSymbol: ua.wallet.tokenSymbol,
      tokenBalance: ua.tokenBalance,
    }));
  }

  async getAllUserAddresses(tokenSymbol: string): Promise<{ userId: string; address: string; tokenSymbol: string; tokenBalance: number }[]> {
    const userAddresses = await prisma.userAddress.findMany({
      where: {
        wallet: {
          tokenSymbol: tokenSymbol
        }
      },
      include: {
        wallet: true,
      },
    });

    return userAddresses.map((ua: any) => ({
      userId: ua.userId,
      address: ua.address,
      tokenSymbol: ua.wallet.tokenSymbol,
      tokenBalance: ua.tokenBalance,
    }));
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
    const transaction = await prisma.transaction.create({
      data: {
        // Required fields for existing Transaction model
        transactionDirection: 'IN',
        paymentType: 'CRYPTO_PURCHASE',
        from: 'MPESA',
        to: transactionData.userId,
        amount: transactionData.totalAmount,
        
        // New fields for crypto purchases
        userId: transactionData.userId,
        transactionType: transactionData.transactionType,
        tokenSymbol: transactionData.tokenSymbol,
        fiatAmount: transactionData.fiatAmount,
        cryptoAmount: transactionData.cryptoAmount,
        exchangeRate: transactionData.exchangeRate,
        platformFee: transactionData.platformFee,
        totalAmount: transactionData.totalAmount,
        phoneNumber: transactionData.phoneNumber,
        status: transactionData.status,
      },
    });

    return transaction.transactionId;
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
    const transaction = await prisma.transaction.findFirst({
      where: { checkoutRequestId },
    });

    if (!transaction || !transaction.userId || !transaction.tokenSymbol || 
        transaction.fiatAmount === null || transaction.cryptoAmount === null || 
        !transaction.phoneNumber) {
      return null;
    }

    return {
      id: transaction.transactionId,
      userId: transaction.userId,
      tokenSymbol: transaction.tokenSymbol,
      fiatAmount: transaction.fiatAmount,
      cryptoAmount: transaction.cryptoAmount,
      phoneNumber: transaction.phoneNumber,
      status: transaction.status,
      transactionType: transaction.transactionType || 'ON_RAMP',
    };
  }

  async updateTransactionStatus(transactionId: string, status: string): Promise<void> {
    await prisma.transaction.update({
      where: { transactionId },
      data: { status },
    });
  }

  async updateTransactionPaymentDetails(transactionId: string, paymentDetails: {
    checkoutRequestId?: string;
    merchantRequestId?: string;
    mpesaReceiptNumber?: string;
    transactionDate?: string;
    status?: string;
  }): Promise<void> {
    // Convert transactionDate string to DateTime if provided
    const updateData: any = { ...paymentDetails };
    
    if (paymentDetails.transactionDate) {
      // M-Pesa transaction date format: YYYYMMDDHHMMSS (e.g., 20250803184208)
      const dateStr = paymentDetails.transactionDate;
      if (dateStr.length === 14) {
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
        const day = parseInt(dateStr.substring(6, 8));
        const hour = parseInt(dateStr.substring(8, 10));
        const minute = parseInt(dateStr.substring(10, 12));
        const second = parseInt(dateStr.substring(12, 14));
        
        updateData.transactionDate = new Date(year, month, day, hour, minute, second);
      } else {
        // If it's not in the expected format, try to parse it as ISO string
        updateData.transactionDate = new Date(paymentDetails.transactionDate);
      }
    }
    
    await prisma.transaction.update({
      where: { transactionId },
      data: updateData,
    });
  }

  async updateUserTokenBalance(userId: string, tokenSymbol: string, amount: number): Promise<void> {
    await prisma.userAddress.updateMany({
      where: {
        userId,
        wallet: {
          tokenSymbol,
        },
      },
      data: {
        tokenBalance: {
          increment: amount,
        },
      },
    });
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
    const transaction = await prisma.transaction.findUnique({
      where: { transactionId },
    });

    if (!transaction || !transaction.userId || !transaction.tokenSymbol || 
        transaction.fiatAmount === null || transaction.cryptoAmount === null || 
        !transaction.phoneNumber || !transaction.transactionType) {
      return null;
    }

    return {
      id: transaction.transactionId,
      userId: transaction.userId,
      transactionType: transaction.transactionType,
      tokenSymbol: transaction.tokenSymbol,
      fiatAmount: transaction.fiatAmount,
      cryptoAmount: transaction.cryptoAmount,
      phoneNumber: transaction.phoneNumber,
      status: transaction.status,
      checkoutRequestId: transaction.checkoutRequestId,
      merchantRequestId: transaction.merchantRequestId,
      mpesaReceiptNumber: transaction.mpesaReceiptNumber,
      transactionDate: transaction.transactionDate,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }


  async getUserTokenBalance(userId: string, tokenSymbol: string): Promise<number> {
    // Find the wallet for this token
    const wallet = await prisma.wallet.findUnique({
      where: {
        tokenSymbol: tokenSymbol.toUpperCase(),
      },
    });

    if (!wallet) {
      return 0;
    }

    // Find the user's address for this wallet
    const userAddress = await prisma.userAddress.findUnique({
      where: {
        userId_walletId: {
          userId,
          walletId: wallet.walletId,
        },
      },
      select: {
        tokenBalance: true,
      },
    });

    return userAddress?.tokenBalance || 0;
  }

  async findTransactionByCheckoutRequestId(checkoutRequestId: string): Promise<{
    id: string; userId: string; transactionType: string; tokenSymbol: string; fiatAmount: number; cryptoAmount: number; phoneNumber: string; status: string;
  } | null> {
    const transaction = await prisma.transaction.findFirst({
      where: { checkoutRequestId },
      select: {
        transactionId: true, // This maps to 'id' in the interface
        userId: true,
        transactionType: true,
        tokenSymbol: true,
        fiatAmount: true,
        cryptoAmount: true,
        phoneNumber: true,
        status: true,
      },
    });

    if (!transaction) return null;

    return {
      id: transaction.transactionId, // Map transactionId to id
      userId: transaction.userId || '',
      transactionType: transaction.transactionType || '',
      tokenSymbol: transaction.tokenSymbol || '',
      fiatAmount: transaction.fiatAmount || 0,
      cryptoAmount: transaction.cryptoAmount || 0,
      phoneNumber: transaction.phoneNumber || '',
      status: transaction.status,
    };
  }

  async findTransactionByOriginatorConversationId(originatorConversationId: string): Promise<{
    id: string; userId: string; transactionType: string; tokenSymbol: string; fiatAmount: number; cryptoAmount: number; phoneNumber: string; status: string;
  } | null> {
    const transaction = await prisma.transaction.findFirst({
      where: { originatorConversationId },
      select: {
        transactionId: true, // This maps to 'id' in the interface
        userId: true,
        transactionType: true,
        tokenSymbol: true,
        fiatAmount: true,
        cryptoAmount: true,
        phoneNumber: true,
        status: true,
      },
    });

    if (!transaction) return null;

    return {
      id: transaction.transactionId, // Map transactionId to id
      userId: transaction.userId || '',
      transactionType: transaction.transactionType || '',
      tokenSymbol: transaction.tokenSymbol || '',
      fiatAmount: transaction.fiatAmount || 0,
      cryptoAmount: transaction.cryptoAmount || 0,
      phoneNumber: transaction.phoneNumber || '',
      status: transaction.status,
    };
  }

  private mapToDomain(prismaWallet: any): Wallet {
    return new Wallet({
      walletId: prismaWallet.walletId,
      tokenSymbol: prismaWallet.tokenSymbol,
      walletBalance: prismaWallet.walletBalance,
      createdAt: prismaWallet.createdAt,
      updatedAt: prismaWallet.updatedAt,
    });
  }
} 