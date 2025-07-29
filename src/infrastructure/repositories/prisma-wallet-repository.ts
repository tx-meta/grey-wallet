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
    return wallets.map(wallet => this.mapToDomain(wallet));
  }

  async getAndIncrementAddressIndex(walletId: string): Promise<number> {
    const result = await prisma.$transaction(async (tx) => {
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

    return userAddresses.map(ua => ({
      walletId: ua.walletId,
      address: ua.address,
      tokenSymbol: ua.wallet.tokenSymbol,
      tokenBalance: ua.tokenBalance,
    }));
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