/**
 * Delete User Account Use Case
 * Handles secure deletion of user account and associated data
 */

import { UserRepository } from '../repositories/user-repository';
import logger from '../../shared/logging';

export interface DeleteUserAccountRequest {
  userId: string;
  confirmEmail?: string; // Optional email confirmation for extra security
}

export type DeleteUserAccountResult = {
  success: true;
  message: string;
} | {
  success: false;
  error: string;
};

export class DeleteUserAccountUseCase {
  constructor(
    private userRepository: UserRepository
  ) {}

  async execute(request: DeleteUserAccountRequest): Promise<DeleteUserAccountResult> {
    try {
      // 1. Validate user exists
      const user = await this.userRepository.findById(request.userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // 2. Optional email confirmation check
      if (request.confirmEmail && request.confirmEmail !== user.email) {
        return {
          success: false,
          error: 'Email confirmation does not match account email'
        };
      }

      // 3. Check if user has any wallet balances (optional safety check)
      // Note: In a real implementation, you might want to prevent deletion 
      // if there are active balances or pending transactions
      
      logger.info('Starting user account deletion process', {
        userId: request.userId,
        email: user.email
      });

      // 4. Delete associated wallet data first (cascade delete)
      // This is important to maintain referential integrity
      try {
        // Get all wallets for this user (through user addresses)
        // Note: The exact implementation depends on your wallet-user relationship
        logger.info('Cleaning up wallet data for user', { userId: request.userId });
        
        // In this implementation, we'll let the database handle cascade deletes
        // through foreign key constraints, but you might want explicit cleanup
        // Future: Add wallet repository to clean up wallet data explicitly
        
        // Example of future wallet cleanup:
        // const userWallets = await walletRepository.findByUserId(request.userId);
        // for (const wallet of userWallets) {
        //   await walletRepository.delete(wallet.walletId);
        // }
      } catch (walletError) {
        logger.error('Error cleaning up wallet data', {
          userId: request.userId,
          error: walletError instanceof Error ? walletError.message : 'Unknown error'
        });
        // Continue with user deletion even if wallet cleanup fails
      }

      // 5. Delete the user account
      const deleteSuccess = await this.userRepository.delete(request.userId);
      
      if (!deleteSuccess) {
        return {
          success: false,
          error: 'Failed to delete user account'
        };
      }

      logger.info('User account deleted successfully', {
        userId: request.userId,
        email: user.email
      });

      return {
        success: true,
        message: 'Account deleted successfully'
      };

    } catch (error) {
      logger.error('Failed to delete user account', {
        userId: request.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: 'An unexpected error occurred while deleting the account'
      };
    }
  }
}
