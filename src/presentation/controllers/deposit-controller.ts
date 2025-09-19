import { Request, Response } from 'express';
import { GetDepositHistoryUseCase } from '../../domain/use_cases/get-deposit-history';
import { GetUserAddressesUseCase } from '../../domain/use_cases/get-user-addresses';
import logger from '../../shared/logging';

export class DepositController {
  constructor(
    private getDepositHistoryUseCase: GetDepositHistoryUseCase,
    private getUserAddressesUseCase: GetUserAddressesUseCase
  ) {}

  /**
   * GET /api/deposits/history
   * Get user's deposit history
   */
  async getDepositHistory(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ 
          success: false,
          error: 'Unauthorized' 
        });
      }

      const { tokenSymbol, limit, status } = req.query;

      const result = await this.getDepositHistoryUseCase.execute({
        userId,
        tokenSymbol: tokenSymbol as string,
        limit: limit ? parseInt(limit as string) : 50,
        status: status as string
      });

      if (!result.success) {
        return res.status(400).json({ 
          success: false,
          error: result.error 
        });
      }

      return res.json({
        success: true,
        deposits: result.deposits,
        count: result.deposits?.length || 0
      });
    } catch (error) {
      logger.error('Deposit history error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Internal server error' 
      });
    }
  }

  /**
   * GET /api/deposits/addresses
   * Get user's deposit addresses
   */
  async getDepositAddresses(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ 
          success: false,
          error: 'Unauthorized' 
        });
      }

      const result = await this.getUserAddressesUseCase.execute({ userId });

      if (!result.success) {
        return res.status(400).json({ 
          success: false,
          error: result.error 
        });
      }

      // Format addresses with QR codes
      const addresses = result.addresses?.map((addr: any) => ({
        tokenSymbol: addr.tokenSymbol,
        address: addr.address,
        qrCode: `data:image/svg+xml;base64,${Buffer.from(this.generateQRCode(addr.address)).toString('base64')}`
      })) || [];

      return res.json({
        success: true,
        addresses
      });
    } catch (error) {
      logger.error('Deposit addresses error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Internal server error' 
      });
    }
  }

  /**
   * GET /api/deposits/:id
   * Get specific deposit details
   */
  async getDepositDetails(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ 
          success: false,
          error: 'Unauthorized' 
        });
      }

      const { id: _id } = req.params;

      // This would need a new use case to get deposit by ID and verify ownership
      return res.status(501).json({ 
        success: false,
        error: 'Not implemented yet' 
      });
    } catch (error) {
      logger.error('Deposit details error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Internal server error' 
      });
    }
  }

  private generateQRCode(address: string): string {
    // Simple QR code generation - in production, use a proper QR code library
    return `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="white"/>
      <text x="100" y="100" text-anchor="middle" font-family="monospace" font-size="12">
        ${address}
      </text>
    </svg>`;
  }
}
