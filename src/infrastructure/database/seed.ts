/**
 * Database Seeder
 * Populates the database with initial data
 */

import prisma from './prisma-client';
import { SupportedToken } from '../../domain/entities/supported-token';
import logger from '../../../shared/logging';

export async function seedDatabase(): Promise<void> {
  try {
    logger.info('Starting database seeding...');

    // Add a small delay to ensure database connection is stable
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if tokens already exist with retry logic
    let existingTokens = 0;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        existingTokens = await prisma.supportedToken.count();
        break;
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw error;
        }
        logger.warn(`Database count query failed, retrying... (${retryCount}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
      }
    }
    
    if (existingTokens === 0) {
      logger.info('No tokens found, seeding default tokens...');
      
      const defaultTokens = SupportedToken.getDefaultTokens();
      
      for (const token of defaultTokens) {
        await prisma.supportedToken.create({
          data: {
            tokenId: token.tokenId,
            name: token.name,
            symbol: token.symbol,
            icon: token.icon,
            isActive: token.isActive,
          },
        });
      }
      
      logger.info(`Seeded ${defaultTokens.length} default tokens`);
    } else {
      logger.info(`Database already contains ${existingTokens} tokens, skipping seeding`);
    }

    logger.info('Database seeding completed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Database seeding failed', { error: errorMessage });
    
    // Don't throw the error to prevent server startup failure
    // The application can still run without seeding
    logger.warn('Continuing server startup despite seeding failure...');
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