/**
 * Prisma Client Configuration
 * Centralized database client for the application
 */

import { PrismaClient } from '@prisma/client';

// Create a single PrismaClient instance that can be shared throughout the app
const prisma = new PrismaClient({
  log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma; 