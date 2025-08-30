/**
 * Prisma Client Configuration
 * Centralized database client for the application
 */

import { PrismaClient } from '@prisma/client';

// Global variable to prevent multiple instances
declare global {
  var __prisma: PrismaClient | undefined;
}

// Create a single PrismaClient instance that can be shared throughout the app
const prisma = global.__prisma || new PrismaClient({
  log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// In development, store the client in global to prevent multiple instances during hot reloads
if (process.env['NODE_ENV'] === 'development') {
  global.__prisma = prisma;
}

// Graceful shutdown handlers
const gracefulShutdown = async () => {
  console.log('Disconnecting Prisma client...');
  await prisma.$disconnect();
  if (global.__prisma) {
    global.__prisma = undefined;
  }
};

process.on('beforeExit', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default prisma; 