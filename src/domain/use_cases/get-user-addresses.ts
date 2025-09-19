import { WalletRepository } from '../repositories/wallet-repository';
import { UserRepository } from '../repositories/user-repository';
import logger from '../../shared/logging';

export interface GetUserAddressesRequest {
  userId: string;
}

export interface GetUserAddressesResult {
  success: boolean;
  addresses?: { tokenSymbol: string; address: string; tokenBalance: number }[];
  error?: string;
}

export class GetUserAddressesUseCase {
  constructor(
    private walletRepository: WalletRepository,
    private userRepository: UserRepository
  ) {}

  async execute(request: GetUserAddressesRequest): Promise<GetUserAddressesResult> {
    try {
      logger.info('Getting user addresses', { userId: request.userId });

      // Verify user exists
      const user = await this.userRepository.findById(request.userId);
      if (!user) {
        logger.warn('User not found', { userId: request.userId });
        return { 
          success: false, 
          error: 'User not found' 
        };
      }

      // Get user addresses
      const addresses = await this.walletRepository.findUserAddresses(request.userId);

      logger.info('User addresses retrieved successfully', {
        userId: request.userId,
        count: addresses.length
      });

      return {
        success: true,
        addresses
      };
    } catch (error) {
      logger.error('Failed to retrieve user addresses', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId
      });

      return {
        success: false,
        error: 'Failed to retrieve user addresses'
      };
    }
  }
}
