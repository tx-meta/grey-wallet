/**
 * Get Token Balance Use Case
 * Retrieves detailed balance information for a specific token
 */

import { WalletRepository } from '../repositories/wallet-repository';
import { TokenRepository } from '../repositories/token-repository';
import { UserRepository } from '../repositories/user-repository';
import logger from '../../shared/logging';

export interface GetTokenBalanceRequest {
  userId: string;
  tokenSymbol: string;
}

export interface TokenBalanceInfo {
  tokenSymbol: string;
  tokenName: string;
  tokenIcon: string;
  address: string;
  userBalance: number;
  walletBalance: number;
  isActive: boolean;
  lastUpdated: string;
}

export interface GetTokenBalanceResult {
  success: boolean;
  data?: TokenBalanceInfo;
  error?: string;
}

export class GetTokenBalanceUseCase {
  constructor(
    private walletRepository: WalletRepository,
    private tokenRepository: TokenRepository,
    private userRepository: UserRepository
  ) {}

  async execute(request: GetTokenBalanceRequest): Promise<GetTokenBalanceResult> {
    try {
      // 1. Validate request
      this.validateRequest(request);

      // 2. Verify user exists
      const user = await this.userRepository.findById(request.userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // 3. Verify token exists and is active
      const token = await this.tokenRepository.findBySymbol(request.tokenSymbol.toUpperCase());
      if (!token) {
        return {
          success: false,
          error: 'Token not supported',
        };
      }

      if (!token.isActive) {
        return {
          success: false,
          error: 'Token is currently inactive',
        };
      }

      // 4. Get user addresses for this token
      const userAddresses = await this.walletRepository.findUserAddresses(request.userId);
      const userAddress = userAddresses.find(addr => addr.tokenSymbol === request.tokenSymbol.toUpperCase());

      if (!userAddress) {
        return {
          success: false,
          error: 'No address found for this token',
        };
      }

      // 5. Get wallet balance for this token
      const wallet = await this.walletRepository.findByTokenSymbol(request.tokenSymbol.toUpperCase());
      const walletBalance = wallet ? wallet.walletBalance : 0;

      // 6. Prepare response
      const response: TokenBalanceInfo = {
        tokenSymbol: token.symbol,
        tokenName: token.name,
        tokenIcon: token.icon,
        address: userAddress.address,
        userBalance: userAddress.tokenBalance || 0,
        walletBalance,
        isActive: token.isActive,
        lastUpdated: new Date().toISOString(),
      };

      logger.info('Token balance retrieved successfully', { 
        userId: request.userId,
        tokenSymbol: request.tokenSymbol,
        userBalance: userAddress.tokenBalance,
        walletBalance 
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      logger.error('Get token balance use case error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId,
        tokenSymbol: request.tokenSymbol 
      });
      
      return {
        success: false,
        error: 'Failed to retrieve token balance',
      };
    }
  }

  private validateRequest(request: GetTokenBalanceRequest): void {
    if (!request.userId || request.userId.trim().length === 0) {
      throw new Error('User ID is required');
    }
    if (!request.tokenSymbol || request.tokenSymbol.trim().length === 0) {
      throw new Error('Token symbol is required');
    }
  }
} 