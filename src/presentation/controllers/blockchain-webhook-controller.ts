import { Request, Response } from 'express';
import { ProcessCryptoDepositUseCase } from '../../domain/use_cases/process-crypto-deposit';
import logger from '../../shared/logging';

export class BlockchainWebhookController {
  constructor(
    private processCryptoDepositUseCase: ProcessCryptoDepositUseCase
  ) {}

  /**
   * POST /api/webhooks/blockchain/deposit
   * Handle blockchain deposit webhooks from services like Alchemy, Moralis, etc.
   */
  async handleDepositWebhook(req: Request, res: Response) {
    try {
      const webhookData = req.body;

      logger.info('Blockchain deposit webhook received', {
        body: webhookData,
        headers: req.headers
      });

      // Verify webhook signature if required
      if (!this.verifyWebhookSignature(req)) {
        return res.status(401).json({ 
          success: false,
          error: 'Invalid webhook signature' 
        });
      }

      // Extract deposit data from webhook
      const depositData = this.extractDepositData(webhookData);
      if (!depositData) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid webhook data' 
        });
      }

      // Process the deposit
      const result = await this.processCryptoDepositUseCase.execute(depositData);

      if (result.success) {
        return res.json({
          success: true,
          message: 'Deposit processed successfully',
          depositId: result.depositId
        });
      } else {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('Blockchain webhook processing error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body
      });

      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * GET /api/webhooks/blockchain/health
   * Health check for webhook endpoint
   */
  async healthCheck(_req: Request, res: Response) {
    try {
      res.json({
        success: true,
        message: 'Blockchain webhook endpoint is healthy',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Blockchain webhook health check error', { error });
      res.status(500).json({
        success: false,
        error: 'Health check failed'
      });
    }
  }

  private verifyWebhookSignature(req: Request): boolean {
    // Implement webhook signature verification based on your provider
    // For example, Alchemy uses HMAC-SHA256
    const signature = req.headers['x-alchemy-signature'] as string;
    const webhookSecret = process.env['BLOCKCHAIN_WEBHOOK_SECRET'];
    
    if (!signature || !webhookSecret) {
      // Skip verification if not configured
      logger.warn('Webhook signature verification skipped - not configured');
      return true;
    }

    // Implement signature verification logic
    // This is a placeholder - implement proper HMAC verification
    logger.info('Webhook signature verification would be implemented here');
    return true;
  }

  private extractDepositData(webhookData: any): any {
    try {
      // Handle different webhook formats from various providers
      if (webhookData.type === 'ADDRESS_ACTIVITY') {
        // Alchemy format
        const activity = webhookData.activity?.[0];
        if (!activity) return null;

        return {
          txHash: activity.hash,
          toAddress: activity.toAddress,
          fromAddress: activity.fromAddress,
          amount: activity.value,
          tokenSymbol: this.getTokenSymbol(activity),
          blockNumber: activity.blockNum,
          confirmations: 1
        };
      }

      // Handle Moralis format
      if (webhookData.data) {
        const data = webhookData.data;
        return {
          txHash: data.txHash,
          toAddress: data.toAddress,
          fromAddress: data.fromAddress,
          amount: data.value,
          tokenSymbol: this.getTokenSymbol(data),
          blockNumber: data.blockNumber,
          confirmations: data.confirmations || 1
        };
      }

      // Add support for other webhook providers
      logger.warn('Unknown webhook format', { webhookData });
      return null;
    } catch (error) {
      logger.error('Failed to extract deposit data', { error, webhookData });
      return null;
    }
  }

  private getTokenSymbol(activity: any): string {
    if (activity.asset === 'ETH') return 'ETH';
    if (activity.rawContract?.address?.toLowerCase() === process.env['USDT_CONTRACT_ADDRESS']?.toLowerCase()) return 'USDT';
    if (activity.rawContract?.address?.toLowerCase() === process.env['USDC_CONTRACT_ADDRESS']?.toLowerCase()) return 'USDC';
    if (activity.tokenSymbol) return activity.tokenSymbol;
    return 'UNKNOWN';
  }
}
