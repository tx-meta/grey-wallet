/**
 * Get Wallet Information Use Case
 * Retrieves comprehensive wallet information for a user
 */

import { WalletRepository } from '../repositories/wallet-repository';
import { TokenRepository } from '../repositories/token-repository';
import { UserRepository } from '../repositories/user-repository';
import logger from '../../shared/logging';

export interface GetWalletInfoRequest {
  userId: string;
}

export interface WalletAddressInfo {
  tokenSymbol: string;
  tokenName: string;
  tokenIcon: string;
  address: string;
  tokenBalance: number;
  walletBalance: number;
  createdAt: string;
}

export interface WalletInfoResponse {
  userId: string;
  userEmail: string;
  totalBalance: number;
  totalTokens: number;
  addresses: WalletAddressInfo[];
  lastUpdated: string;
}

export interface GetWalletInfoResult {
  success: boolean;
  data?: WalletInfoResponse;
  error?: string;
}

export class GetWalletInfoUseCase {
  constructor(
    private walletRepository: WalletRepository,
    private tokenRepository: TokenRepository,
    private userRepository: UserRepository
  ) {}

  async execute(request: GetWalletInfoRequest): Promise<GetWalletInfoResult> {
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

      // 3. Get user addresses with wallet information
      const userAddresses = await this.walletRepository.findUserAddresses(request.userId);
      
      // 4. Get all active tokens for reference
      const activeTokens = await this.tokenRepository.findActiveTokens();
      const tokenMap = new Map(activeTokens.map(token => [token.symbol, token]));

      // 5. Get all wallets at once to avoid N+1 query problem
      const allWallets = await this.walletRepository.findActiveWallets();
      const walletMap = new Map(allWallets.map(wallet => [wallet.tokenSymbol, wallet]));

      // 6. Build address information
      const addresses: WalletAddressInfo[] = [];
      let totalBalance = 0;

      for (const userAddress of userAddresses) {
        const token = tokenMap.get(userAddress.tokenSymbol);
        if (!token) {
          logger.warn('Token not found for user address', { 
            userId: request.userId, 
            tokenSymbol: userAddress.tokenSymbol 
          });
          continue;
        }

        // Get wallet balance from the pre-fetched map
        const wallet = walletMap.get(userAddress.tokenSymbol);
        const walletBalance = wallet ? wallet.walletBalance : 0;

        addresses.push({
          tokenSymbol: userAddress.tokenSymbol,
          tokenName: token.name,
          tokenIcon: token.icon,
          address: userAddress.address,
          tokenBalance: userAddress.tokenBalance || 0,
          walletBalance,
          createdAt: new Date().toISOString(), // userAddress doesn't have createdAt in current interface
        });

        totalBalance += userAddress.tokenBalance || 0;
      }

      // 7. Prepare response
      const response: WalletInfoResponse = {
        userId: request.userId,
        userEmail: user.email,
        totalBalance,
        totalTokens: addresses.length,
        addresses,
        lastUpdated: new Date().toISOString(),
      };

      logger.info('Wallet information retrieved successfully', { 
        userId: request.userId,
        totalTokens: addresses.length,
        totalBalance 
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      logger.error('Get wallet info use case error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId 
      });
      
      return {
        success: false,
        error: 'Failed to retrieve wallet information',
      };
    }
  }

  private validateRequest(request: GetWalletInfoRequest): void {
    if (!request.userId || request.userId.trim().length === 0) {
      throw new Error('User ID is required');
    }
  }
} 