/**
 * Database Seeder
 * Populates the database with initial data
 */

import { PrismaClient } from '@prisma/client';
import { SupportedToken } from '../../domain/entities/supported-token';
import logger from '../../../shared/logging';

export async function seedDatabase(): Promise<void> {
  // Create a fresh Prisma client to avoid prepared statement conflicts
  const prisma = new PrismaClient();
  
  try {
    logger.info('Starting database seeding...');

    // Add a small delay to ensure database connection is stable
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Try to seed tokens, handling duplicates gracefully
    logger.info('Seeding default tokens...');
    
    const defaultTokens = SupportedToken.getDefaultTokens();
    let seededCount = 0;
    
    for (const token of defaultTokens) {
      try {
        // Use upsert to avoid conflicts and prepared statement issues
        await prisma.supportedToken.upsert({
          where: { symbol: token.symbol },
          update: {
            name: token.name,
            icon: token.icon,
            isActive: token.isActive,
          },
          create: {
            tokenId: token.tokenId,
            name: token.name,
            symbol: token.symbol,
            icon: token.icon,
            isActive: token.isActive,
          },
        });
        seededCount++;
        logger.info(`Processed token: ${token.symbol}`);
      } catch (error: any) {
        logger.warn(`Failed to process token ${token.symbol}:`, { error: error.message });
      }
    }
    
    logger.info(`Seeded ${seededCount} new tokens out of ${defaultTokens.length} total tokens`);

    logger.info('Database seeding completed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Database seeding failed', { error: errorMessage });
    
    // Don't throw the error to prevent server startup failure
    // The application can still run without seeding
    logger.warn('Continuing server startup despite seeding failure...');
  } finally {
    // Always disconnect the Prisma client
    await prisma.$disconnect();
  }
}

// Run seeder if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.info('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      process.exit(1);
    });
} 