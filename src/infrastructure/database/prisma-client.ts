/**
 * Prisma Client Configuration
 * Centralized database client for the application with connection pooling fixes
 */

import { PrismaClient } from '@prisma/client';

// Global variable to prevent multiple instances
declare global {
  var __prisma: PrismaClient | undefined;
  var __prismaConnected: boolean | undefined;
}

// Enhanced Prisma client configuration to prevent prepared statement conflicts
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env['NODE_ENV'] === 'development' ? ['error', 'warn'] : ['error'],
    ...(process.env['DATABASE_URL'] && {
      datasources: {
        db: {
          url: process.env['DATABASE_URL'],
        },
      },
    }),
  });
};

// Create a single PrismaClient instance that can be shared throughout the app
const prisma = global.__prisma || createPrismaClient();

// In development, store the client in global to prevent multiple instances during hot reloads
if (process.env['NODE_ENV'] === 'development') {
  global.__prisma = prisma;
  global.__prismaConnected = false;
}

// Connection management
const ensureConnection = async () => {
  if (!global.__prismaConnected) {
    try {
      await prisma.$connect();
      global.__prismaConnected = true;
      console.log('✅ Prisma client connected successfully');
    } catch (error) {
      console.error('❌ Failed to connect Prisma client:', error);
      throw error;
    }
  }
};

// Enhanced graceful shutdown handlers
const gracefulShutdown = async (signal?: string) => {
  console.log(`${signal ? `${signal} received, ` : ''}Disconnecting Prisma client...`);
  try {
    await prisma.$disconnect();
    global.__prismaConnected = false;
    if (global.__prisma) {
      global.__prisma = undefined;
    }
    console.log('✅ Prisma client disconnected successfully');
  } catch (error) {
    console.error('❌ Error during Prisma client shutdown:', error);
  }
};

// Register shutdown handlers
process.on('beforeExit', () => gracefulShutdown('beforeExit'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

// Ensure connection on import
if (process.env['NODE_ENV'] !== 'test') {
  ensureConnection().catch(console.error);
}

export default prisma;
export { ensureConnection }; 