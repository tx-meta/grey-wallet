/**
 * Get Supported Tokens Use Case
 * Retrieves information about all supported tokens
 */

import { TokenRepository } from '../repositories/token-repository';
import logger from '../../shared/logging';

export interface TokenInfo {
  tokenId: string;
  name: string;
  symbol: string;
  icon: string;
  isActive: boolean;
  createdAt: string;
}

export interface GetSupportedTokensResponse {
  tokens: TokenInfo[];
  totalTokens: number;
  activeTokens: number;
  lastUpdated: string;
}

export interface GetSupportedTokensResult {
  success: boolean;
  data?: GetSupportedTokensResponse;
  error?: string;
}

export class GetSupportedTokensUseCase {
  constructor(private tokenRepository: TokenRepository) {}

  async execute(): Promise<GetSupportedTokensResult> {
    try {
      // 1. Get all tokens
      const allTokens = await this.tokenRepository.findAllTokens();
      
      // 2. Transform to response format
      const tokens: TokenInfo[] = allTokens.map(token => ({
        tokenId: token.tokenId,
        name: token.name,
        symbol: token.symbol,
        icon: token.icon,
        isActive: token.isActive,
        createdAt: token.createdAt.toISOString(),
      }));

      // 3. Calculate statistics
      const activeTokens = tokens.filter(token => token.isActive).length;

      // 4. Prepare response
      const response: GetSupportedTokensResponse = {
        tokens,
        totalTokens: tokens.length,
        activeTokens,
        lastUpdated: new Date().toISOString(),
      };

      logger.info('Supported tokens retrieved successfully', { 
        totalTokens: tokens.length,
        activeTokens 
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      logger.error('Get supported tokens use case error', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: 'Failed to retrieve supported tokens',
      };
    }
  }
} 