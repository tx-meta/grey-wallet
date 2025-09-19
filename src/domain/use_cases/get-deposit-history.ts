import { DepositRepository } from '../repositories/deposit-repository';
import { UserRepository } from '../repositories/user-repository';
import { DepositTransaction } from '../repositories/deposit-repository';
import logger from '../../shared/logging';

export interface GetDepositHistoryRequest {
  userId: string;
  tokenSymbol?: string;
  limit?: number;
  status?: string;
}

export interface GetDepositHistoryResult {
  success: boolean;
  deposits?: DepositTransaction[];
  error?: string;
}

export class GetDepositHistoryUseCase {
  constructor(
    private depositRepository: DepositRepository,
    private userRepository: UserRepository
  ) {}

  async execute(request: GetDepositHistoryRequest): Promise<GetDepositHistoryResult> {
    try {
      logger.info('Getting deposit history', {
        userId: request.userId,
        tokenSymbol: request.tokenSymbol,
        limit: request.limit
      });

      // Verify user exists
      const user = await this.userRepository.findById(request.userId);
      if (!user) {
        logger.warn('User not found', { userId: request.userId });
        return { 
          success: false, 
          error: 'User not found' 
        };
      }

      // Get deposit history
      let deposits: DepositTransaction[];
      
      if (request.tokenSymbol) {
        deposits = await this.depositRepository.findByUserAndToken(
          request.userId,
          request.tokenSymbol,
          request.limit || 50
        );
      } else {
        deposits = await this.depositRepository.findByUserId(
          request.userId,
          request.limit || 50
        );
      }

      // Filter by status if specified
      if (request.status) {
        deposits = deposits.filter(deposit => deposit.status === request.status);
      }

      logger.info('Deposit history retrieved successfully', {
        userId: request.userId,
        count: deposits.length
      });

      return {
        success: true,
        deposits
      };
    } catch (error) {
      logger.error('Failed to retrieve deposit history', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId
      });

      return {
        success: false,
        error: 'Failed to retrieve deposit history'
      };
    }
  }
}
