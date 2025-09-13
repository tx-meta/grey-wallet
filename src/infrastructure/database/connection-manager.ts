/**
 * Database Connection Manager
 * Handles Prisma client lifecycle and prevents prepared statement conflicts
 */

import { PrismaClient } from '@prisma/client';
import logger from '../../shared/logging';

class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;
  private prismaClient: PrismaClient | null = null;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }

  public async getClient(): Promise<PrismaClient> {
    if (!this.prismaClient) {
      await this.connect();
    }
    return this.prismaClient!;
  }

  public async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    if (this.isConnected && this.prismaClient) {
      return;
    }

    this.connectionPromise = this.establishConnection();
    return this.connectionPromise;
  }

  private async establishConnection(): Promise<void> {
    try {
      if (this.prismaClient) {
        await this.disconnect();
      }

      this.prismaClient = new PrismaClient({
        log: process.env['NODE_ENV'] === 'development' ? ['error', 'warn'] : ['error'],
        ...(process.env['DATABASE_URL'] && {
          datasources: {
            db: {
              url: process.env['DATABASE_URL'],
            },
          },
        }),
      });

      // Test the connection
      await this.prismaClient.$connect();
      await this.prismaClient.$queryRaw`SELECT 1`;

      this.isConnected = true;
      this.connectionPromise = null;
      
      logger.info('Database connection established successfully');
    } catch (error) {
      this.connectionPromise = null;
      logger.error('Failed to establish database connection:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.prismaClient && this.isConnected) {
      try {
        await this.prismaClient.$disconnect();
        this.prismaClient = null;
        this.isConnected = false;
        logger.info('Database connection closed successfully');
      } catch (error) {
        logger.error('Error closing database connection:', error);
      }
    }
  }

  public async reset(): Promise<void> {
    await this.disconnect();
    await this.connect();
  }

  public isClientConnected(): boolean {
    return this.isConnected && this.prismaClient !== null;
  }
}

// Export singleton instance
export const dbConnectionManager = DatabaseConnectionManager.getInstance();

// Setup graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, closing database connections...`);
  await dbConnectionManager.disconnect();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

export default dbConnectionManager;
