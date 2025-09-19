import { PrismaClient } from '@prisma/client';
import { DepositRepository, DepositTransaction, CreateDepositRequest } from '../../domain/repositories/deposit-repository';
import logger from '../../shared/logging';

export class PrismaDepositRepository implements DepositRepository {
  constructor(private prisma: PrismaClient) {}

  async create(deposit: CreateDepositRequest): Promise<DepositTransaction> {
    try {
      const createdDeposit = await this.prisma.depositTransaction.create({
        data: {
          userId: deposit.userId,
          userAddress: deposit.userAddress,
          tokenSymbol: deposit.tokenSymbol,
          amount: deposit.amount,
          txHash: deposit.txHash,
          blockNumber: deposit.blockNumber ? BigInt(deposit.blockNumber) : null,
          fromAddress: deposit.fromAddress,
          confirmations: deposit.confirmations,
          status: deposit.status,
        },
      });

      return this.mapToDepositTransaction(createdDeposit);
    } catch (error) {
      logger.error('Failed to create deposit transaction', { error, deposit });
      throw error;
    }
  }

  async findByTxHash(txHash: string): Promise<DepositTransaction | null> {
    try {
      const deposit = await this.prisma.depositTransaction.findUnique({
        where: { txHash },
      });

      return deposit ? this.mapToDepositTransaction(deposit) : null;
    } catch (error) {
      logger.error('Failed to find deposit by tx hash', { error, txHash });
      throw error;
    }
  }

  async findById(id: string): Promise<DepositTransaction | null> {
    try {
      const deposit = await this.prisma.depositTransaction.findUnique({
        where: { id },
      });

      return deposit ? this.mapToDepositTransaction(deposit) : null;
    } catch (error) {
      logger.error('Failed to find deposit by id', { error, id });
      throw error;
    }
  }

  async findByUserId(userId: string, limit: number = 50): Promise<DepositTransaction[]> {
    try {
      const deposits = await this.prisma.depositTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return deposits.map(deposit => this.mapToDepositTransaction(deposit));
    } catch (error) {
      logger.error('Failed to find deposits by user id', { error, userId });
      throw error;
    }
  }

  async updateStatus(id: string, status: string): Promise<void> {
    try {
      const updateData: any = { status };
      
      if (status === 'confirmed') {
        updateData.confirmedAt = new Date();
      }

      await this.prisma.depositTransaction.update({
        where: { id },
        data: updateData,
      });

      logger.info('Deposit status updated', { id, status });
    } catch (error) {
      logger.error('Failed to update deposit status', { error, id, status });
      throw error;
    }
  }

  async updateConfirmations(txHash: string, confirmations: number): Promise<void> {
    try {
      await this.prisma.depositTransaction.update({
        where: { txHash },
        data: { confirmations },
      });

      logger.info('Deposit confirmations updated', { txHash, confirmations });
    } catch (error) {
      logger.error('Failed to update deposit confirmations', { error, txHash, confirmations });
      throw error;
    }
  }

  async findPendingDeposits(): Promise<DepositTransaction[]> {
    try {
      const deposits = await this.prisma.depositTransaction.findMany({
        where: { status: 'pending' },
        orderBy: { createdAt: 'asc' },
      });

      return deposits.map(deposit => this.mapToDepositTransaction(deposit));
    } catch (error) {
      logger.error('Failed to find pending deposits', { error });
      throw error;
    }
  }

  async findByUserAndToken(userId: string, tokenSymbol: string, limit: number = 50): Promise<DepositTransaction[]> {
    try {
      const deposits = await this.prisma.depositTransaction.findMany({
        where: { 
          userId,
          tokenSymbol: tokenSymbol.toUpperCase()
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return deposits.map(deposit => this.mapToDepositTransaction(deposit));
    } catch (error) {
      logger.error('Failed to find deposits by user and token', { error, userId, tokenSymbol });
      throw error;
    }
  }

  private mapToDepositTransaction(deposit: any): DepositTransaction {
    return {
      id: deposit.id,
      userId: deposit.userId,
      userAddress: deposit.userAddress,
      tokenSymbol: deposit.tokenSymbol,
      amount: Number(deposit.amount),
      txHash: deposit.txHash,
      blockNumber: deposit.blockNumber ? Number(deposit.blockNumber) : undefined,
      fromAddress: deposit.fromAddress,
      confirmations: deposit.confirmations,
      status: deposit.status,
      detectedAt: deposit.detectedAt,
      confirmedAt: deposit.confirmedAt,
      createdAt: deposit.createdAt,
      updatedAt: deposit.updatedAt,
    };
  }
}
