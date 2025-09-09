/**
 * Treasury Controller
 * Handles admin treasury management endpoints
 */

import { Request, Response } from 'express';
import { TreasuryService } from '../../application/interfaces/treasury-service';
import logger from '../../shared/logging';

export class TreasuryController {
  constructor(private treasuryService: TreasuryService) {}

  /**
   * GET /admin/treasury/balances
   * Get all treasury balances
   */
  async getAllBalances(_req: Request, res: Response): Promise<void> {
    try {
      const balances = await this.treasuryService.getAllBalances();

      res.status(200).json({
        success: true,
        data: balances,
      });
    } catch (error) {
      logger.error('Failed to get treasury balances', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * GET /admin/treasury/balance/:accountType/:assetSymbol
   * Get specific treasury balance
   */
  async getBalance(req: Request, res: Response): Promise<void> {
    try {
      const { accountType, assetSymbol } = req.params;

      if (!accountType || !assetSymbol) {
        res.status(400).json({
          success: false,
          message: 'Account type and asset symbol are required',
        });
        return;
      }

      if (!['CRYPTO', 'FIAT'].includes(accountType.toUpperCase())) {
        res.status(400).json({
          success: false,
          message: 'Account type must be CRYPTO or FIAT',
        });
        return;
      }

      const balance = await this.treasuryService.getBalance(
        accountType.toUpperCase() as 'CRYPTO' | 'FIAT',
        assetSymbol.toUpperCase()
      );

      res.status(200).json({
        success: true,
        data: {
          accountType: accountType.toUpperCase(),
          assetSymbol: assetSymbol.toUpperCase(),
          balance,
        },
      });
    } catch (error) {
      logger.error('Failed to get treasury balance', {
        accountType: req.params['accountType'],
        assetSymbol: req.params['assetSymbol'],
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * GET /admin/treasury/transactions
   * Get treasury transaction history
   */
  async getTransactionHistory(req: Request, res: Response): Promise<void> {
    try {
      const { accountType, assetSymbol, limit } = req.query;

      // Validate accountType if provided
      if (accountType && !['CRYPTO', 'FIAT'].includes((accountType as string).toUpperCase())) {
        res.status(400).json({
          success: false,
          message: 'Account type must be CRYPTO or FIAT',
        });
        return;
      }

      // Validate limit if provided
      let parsedLimit = 100; // default
      if (limit) {
        parsedLimit = parseInt(limit as string, 10);
        if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
          res.status(400).json({
            success: false,
            message: 'Limit must be a number between 1 and 1000',
          });
          return;
        }
      }

      const transactions = await this.treasuryService.getTransactionHistory(
        accountType ? (accountType as string).toUpperCase() : undefined,
        assetSymbol ? (assetSymbol as string).toUpperCase() : undefined,
        parsedLimit
      );

      res.status(200).json({
        success: true,
        data: {
          transactions,
          count: transactions.length,
          filters: {
            accountType: accountType || null,
            assetSymbol: assetSymbol || null,
            limit: parsedLimit,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to get treasury transaction history', {
        query: req.query,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * GET /admin/treasury/health
   * Treasury service health check
   */
  async healthCheck(_req: Request, res: Response): Promise<void> {
    try {
      // Try to get balances as a health check
      const balances = await this.treasuryService.getAllBalances();

      res.status(200).json({
        success: true,
        message: 'Treasury service is healthy',
        data: {
          totalAccounts: balances.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Treasury health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        message: 'Treasury service is unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
