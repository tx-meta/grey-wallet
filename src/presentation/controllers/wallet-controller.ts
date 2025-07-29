/**
 * Wallet Controller
 * Handles wallet-related HTTP requests
 */

import { Request, Response } from 'express';
import { GetWalletInfoUseCase } from '../../domain/use_cases/get-wallet-info';
import { GetTokenBalanceUseCase } from '../../domain/use_cases/get-token-balance';
import { GetSupportedTokensUseCase } from '../../domain/use_cases/get-supported-tokens';
import logger from '../../shared/logging';

export class WalletController {
  constructor(
    private getWalletInfoUseCase: GetWalletInfoUseCase,
    private getTokenBalanceUseCase: GetTokenBalanceUseCase,
    private getSupportedTokensUseCase: GetSupportedTokensUseCase
  ) {}

  /**
   * GET /api/wallet
   * Get comprehensive wallet information for the authenticated user
   */
  async getWalletInfo(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      logger.info('Wallet info request received', { userId });

      const result = await this.getWalletInfoUseCase.execute({ userId });

      if (!result.success) {
        res.status(404).json({
          success: false,
          message: result.error,
        });
        return;
      }

      logger.info('Wallet info retrieved successfully', { userId });

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error('Get wallet info error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id 
      });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/wallet/addresses
   * Get all wallet addresses for the authenticated user
   */
  async getWalletAddresses(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      logger.info('Wallet addresses request received', { userId });

      const result = await this.getWalletInfoUseCase.execute({ userId });

      if (!result.success) {
        res.status(404).json({
          success: false,
          message: result.error,
        });
        return;
      }

      // Extract only address information
      const addresses = result.data!.addresses.map(addr => ({
        tokenSymbol: addr.tokenSymbol,
        tokenName: addr.tokenName,
        tokenIcon: addr.tokenIcon,
        address: addr.address,
        tokenBalance: addr.tokenBalance,
        createdAt: addr.createdAt,
      }));

      logger.info('Wallet addresses retrieved successfully', { 
        userId,
        addressCount: addresses.length 
      });

      res.status(200).json({
        success: true,
        data: {
          userId,
          addresses,
          totalAddresses: addresses.length,
        },
      });
    } catch (error) {
      logger.error('Get wallet addresses error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id 
      });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/wallet/balance/:tokenSymbol
   * Get balance for a specific token
   */
  async getTokenBalance(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { tokenSymbol } = req.params;
      if (!tokenSymbol) {
        res.status(400).json({
          success: false,
          message: 'Token symbol is required',
        });
        return;
      }

      logger.info('Token balance request received', { userId, tokenSymbol: req.params['tokenSymbol'] });

      const result = await this.getTokenBalanceUseCase.execute({
        userId,
        tokenSymbol: tokenSymbol.toUpperCase(),
      });

      if (!result.success) {
        res.status(404).json({
          success: false,
          message: result.error,
        });
        return;
      }

      logger.info('Token balance retrieved successfully', { 
        userId, 
        tokenSymbol,
        balance: result.data!.userBalance 
      });

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error('Get token balance error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        tokenSymbol: req.params['tokenSymbol'] 
      });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/wallet/tokens
   * Get all supported tokens
   */
  async getSupportedTokens(_req: Request, res: Response): Promise<void> {
    try {
      logger.info('Supported tokens request received');

      const result = await this.getSupportedTokensUseCase.execute();

      if (!result.success) {
        res.status(500).json({
          success: false,
          message: result.error,
        });
        return;
      }

      logger.info('Supported tokens retrieved successfully', { 
        totalTokens: result.data!.totalTokens,
        activeTokens: result.data!.activeTokens 
      });

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error('Get supported tokens error', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * GET /api/wallet/overview
   * Get wallet overview with summary information
   */
  async getWalletOverview(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      logger.info('Wallet overview request received', { userId });

      const [walletResult, tokensResult] = await Promise.all([
        this.getWalletInfoUseCase.execute({ userId }),
        this.getSupportedTokensUseCase.execute(),
      ]);

      if (!walletResult.success) {
        res.status(404).json({
          success: false,
          message: walletResult.error,
        });
        return;
      }

      if (!tokensResult.success) {
        res.status(500).json({
          success: false,
          message: tokensResult.error,
        });
        return;
      }

      // Create overview response
      const overview = {
        userId,
        userEmail: walletResult.data!.userEmail,
        totalBalance: walletResult.data!.totalBalance,
        totalTokens: walletResult.data!.totalTokens,
        supportedTokens: tokensResult.data!.totalTokens,
        activeTokens: tokensResult.data!.activeTokens,
        lastUpdated: new Date().toISOString(),
      };

      logger.info('Wallet overview retrieved successfully', { 
        userId,
        totalBalance: overview.totalBalance,
        totalTokens: overview.totalTokens 
      });

      res.status(200).json({
        success: true,
        data: overview,
      });
    } catch (error) {
      logger.error('Get wallet overview error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id 
      });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
} 