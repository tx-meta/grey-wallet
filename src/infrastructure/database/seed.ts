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

    // Check if tokens already exist
    const existingTokens = await prisma.supportedToken.count();
    
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
    logger.error('Database seeding failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
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