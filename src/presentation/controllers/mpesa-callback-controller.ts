/**
 * M-Pesa Callback Controller
 * Handles M-Pesa payment callbacks for transaction completion
 */

import { Request, Response } from 'express';
import { MpesaPaymentService } from '../../infrastructure/services/mpesa/mpesa-payment-service';
import { WalletRepository } from '../../domain/repositories/wallet-repository';
import { NotificationService } from '../../application/interfaces/notification-service';
import { PrismaClient } from '@prisma/client';
import logger from '../../shared/logging';

export class MpesaCallbackController {
  private mpesaService: MpesaPaymentService;

  constructor(
    private walletRepository: WalletRepository,
    private notificationService: NotificationService,
    private prisma: PrismaClient
  ) {
    this.mpesaService = new MpesaPaymentService();
  }

  /**
   * POST /api/mpesa/callback/stk-push
   * Handle STK Push callback (for buy crypto) - ATOMIC TRANSACTION
   */
  async handleSTKPushCallback(req: Request, res: Response): Promise<void> {
    try {
      const callbackData = req.body;
      
      logger.info('STK Push callback received', {
        body: callbackData
      });

      const result = this.mpesaService.processCallback(callbackData);

      if (result.success) {
        // Find transaction by checkout request ID
        const transaction = await this.walletRepository.findTransactionByCheckoutRequestId(result.transactionId!);
        
        if (transaction) {
          logger.info('Processing STK Push callback for transaction', {
            transactionId: transaction.id,
            transactionType: transaction.transactionType,
            fiatAmount: transaction.fiatAmount,
            cryptoAmount: transaction.cryptoAmount,
            tokenSymbol: transaction.tokenSymbol
          });

          // ATOMIC TRANSACTION: All database operations in a single transaction
          // Increased timeout to 30 seconds for complex operations
          await this.prisma.$transaction(async (tx) => {
            try {
              // 1. Update transaction status to completed
              logger.debug('Step 1: Updating transaction status to completed');
              await tx.transaction.update({
                where: { transactionId: transaction.id },
                data: { status: 'completed' }
              });
              
              // 2. Update transaction with M-Pesa details
              logger.debug('Step 2: Updating transaction with M-Pesa details');
              const updateData: any = {};
              if (result.mpesaReceiptNumber) {
                updateData.mpesaReceiptNumber = result.mpesaReceiptNumber;
              }
              if (result.transactionDate) {
                updateData.transactionDate = new Date(result.transactionDate);
              }
              if (result.amount) {
                updateData.amount = result.amount;
              }
              
              if (Object.keys(updateData).length > 0) {
                await tx.transaction.update({
                  where: { transactionId: transaction.id },
                  data: updateData
                });
              }

              // 3. Add crypto to user's wallet (if ON_RAMP)
              if (transaction.transactionType === 'ON_RAMP') {
                logger.debug('Step 3: Processing ON_RAMP transaction - updating user wallet');
                
                // Validate required amounts
                const fiatAmount = transaction.fiatAmount || 0;
                const cryptoAmount = transaction.cryptoAmount || 0;
                
                if (fiatAmount <= 0 || cryptoAmount <= 0) {
                  throw new Error(`Invalid transaction amounts: fiatAmount=${fiatAmount}, cryptoAmount=${cryptoAmount}`);
                }

                // Update user token balance
                logger.debug('Step 3a: Updating user token balance', { 
                  userId: transaction.userId, 
                  tokenSymbol: transaction.tokenSymbol, 
                  increment: cryptoAmount 
                });
                
                const userAddressUpdate = await tx.userAddress.updateMany({
                  where: {
                    userId: transaction.userId,
                    wallet: {
                      tokenSymbol: transaction.tokenSymbol,
                    },
                  },
                  data: {
                    tokenBalance: {
                      increment: cryptoAmount,
                    },
                  },
                });

                if (userAddressUpdate.count === 0) {
                  logger.warn('No user address found for token balance update', {
                    userId: transaction.userId,
                    tokenSymbol: transaction.tokenSymbol
                  });
                }

                // 4. Update treasury balances atomically
                logger.debug('Step 4: Updating treasury balances');
                
                // Get or create FIAT treasury account
                const fiatAccount = await tx.treasuryAccount.upsert({
                  where: { 
                    accountType_assetSymbol: { 
                      accountType: 'FIAT', 
                      assetSymbol: 'KES' 
                    } 
                  },
                  create: { 
                    accountType: 'FIAT', 
                    assetSymbol: 'KES', 
                    balance: fiatAmount
                  },
                  update: {
                    balance: {
                      increment: fiatAmount
                    }
                  }
                });

                const fiatBalanceBefore = Number(fiatAccount.balance) - fiatAmount;
                const fiatBalanceAfter = Number(fiatAccount.balance);

                logger.debug('FIAT treasury updated', {
                  accountId: fiatAccount.id,
                  balanceBefore: fiatBalanceBefore,
                  balanceAfter: fiatBalanceAfter,
                  increment: fiatAmount
                });

                // Get or create CRYPTO treasury account
                const cryptoAccount = await tx.treasuryAccount.upsert({
                  where: { 
                    accountType_assetSymbol: { 
                      accountType: 'CRYPTO', 
                      assetSymbol: transaction.tokenSymbol 
                    } 
                  },
                  create: { 
                    accountType: 'CRYPTO', 
                    assetSymbol: transaction.tokenSymbol, 
                    balance: -cryptoAmount // Negative because we're giving crypto
                  },
                  update: {
                    balance: {
                      decrement: cryptoAmount
                    }
                  }
                });

                const cryptoBalanceBefore = Number(cryptoAccount.balance) + cryptoAmount;
                const cryptoBalanceAfter = Number(cryptoAccount.balance);

                logger.debug('CRYPTO treasury updated', {
                  accountId: cryptoAccount.id,
                  balanceBefore: cryptoBalanceBefore,
                  balanceAfter: cryptoBalanceAfter,
                  decrement: cryptoAmount
                });

                // 5. Create treasury transaction records
                logger.debug('Step 5: Creating treasury transaction records');
                
                await tx.treasuryTransaction.createMany({
                  data: [
                    {
                      userTransactionId: transaction.id,
                      treasuryAccountId: fiatAccount.id,
                      transactionType: 'ON_RAMP',
                      amount: fiatAmount,
                      balanceBefore: fiatBalanceBefore,
                      balanceAfter: fiatBalanceAfter,
                      description: `Fiat received from STK Push - ${transaction.tokenSymbol} purchase`
                    },
                    {
                      userTransactionId: transaction.id,
                      treasuryAccountId: cryptoAccount.id,
                      transactionType: 'ON_RAMP',
                      amount: -cryptoAmount,
                      balanceBefore: cryptoBalanceBefore,
                      balanceAfter: cryptoBalanceAfter,
                      description: `Crypto distributed to user - ${transaction.tokenSymbol} purchase`
                    }
                  ]
                });

                logger.info('Atomic transaction completed successfully', {
                  transactionId: transaction.id,
                  fiatAmount,
                  cryptoAmount,
                  tokenSymbol: transaction.tokenSymbol,
                  fiatTreasuryBalance: fiatBalanceAfter,
                  cryptoTreasuryBalance: cryptoBalanceAfter
                });
              } else {
                logger.info('Non-ON_RAMP transaction, skipping wallet and treasury updates', {
                  transactionType: transaction.transactionType
                });
              }
            } catch (error) {
              logger.error('Error within atomic transaction', {
                error: error instanceof Error ? error.message : 'Unknown error',
                transactionId: transaction.id,
                stack: error instanceof Error ? error.stack : undefined
              });
              throw error; // Re-throw to trigger transaction rollback
            }
          });

          // Send success notification (outside transaction for performance)
          await this.notificationService.sendNotification({
            userId: transaction.userId,
            type: 'transaction_completed',
            title: 'Transaction Completed',
            message: `Your ${transaction.tokenSymbol} ${transaction.transactionType === 'ON_RAMP' ? 'purchase' : 'sale'} has been completed successfully.`,
            data: {
              transactionId: transaction.id,
              tokenSymbol: transaction.tokenSymbol,
              amount: transaction.fiatAmount,
              mpesaReceiptNumber: result.mpesaReceiptNumber
            }
          });

          logger.info('STK Push transaction completed successfully with atomic treasury updates', {
            transactionId: transaction.id,
            mpesaReceiptNumber: result.mpesaReceiptNumber,
            amount: result.amount,
            fiatAmount: transaction.fiatAmount,
            cryptoAmount: transaction.cryptoAmount,
            tokenSymbol: transaction.tokenSymbol
          });
        } else {
          logger.warn('Transaction not found for STK Push callback', {
            checkoutRequestId: result.transactionId
          });
        }
      } else {
        // Payment failed - find and update transaction
        const transaction = await this.walletRepository.findTransactionByCheckoutRequestId(result.transactionId!);
        
        if (transaction) {
          await this.walletRepository.updateTransactionStatus(transaction.id, 'failed');
          
          // Send failure notification
          await this.notificationService.sendNotification({
            userId: transaction.userId,
            type: 'transaction_failed',
            title: 'Transaction Failed',
            message: `Your ${transaction.tokenSymbol} ${transaction.transactionType === 'ON_RAMP' ? 'purchase' : 'sale'} failed. ${result.error}`,
            data: {
              transactionId: transaction.id,
              tokenSymbol: transaction.tokenSymbol,
              error: result.error
            }
          });

          logger.warn('STK Push transaction failed', {
            transactionId: transaction.id,
            error: result.error
          });
        }
      }

      // Respond to M-Pesa
      res.status(200).json({
        ResultCode: 0,
        ResultDesc: 'Callback processed successfully'
      });
    } catch (error) {
      logger.error('STK Push callback processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body
      });

      res.status(500).json({
        ResultCode: 1,
        ResultDesc: 'Callback processing failed'
      });
    }
  }

  /**
   * POST /api/mpesa/callback/b2c
   * Handle B2C callback (for sell crypto)
   */
  async handleB2CCallback(req: Request, res: Response): Promise<void> {
    try {
      const callbackData = req.body;
      
      logger.info('B2C callback received', {
        body: callbackData
      });

      // B2C callbacks have a different structure
      const result = callbackData.Result;
      
      if (result.ResultCode === 0) {
        // Payment successful
        const transaction = await this.walletRepository.findTransactionByOriginatorConversationId(result.OriginatorConversationID);
        
        if (transaction) {
          await this.walletRepository.updateTransactionStatus(transaction.id, 'completed');
          
          await this.walletRepository.updateTransactionPaymentDetails(transaction.id, {
            status: 'completed',
            mpesaReceiptNumber: result.MpesaReceiptNumber,
            transactionDate: result.TransactionDate,
            amount: result.TransactionAmount
          });

          // Send success notification
          await this.notificationService.sendNotification({
            userId: transaction.userId,
            type: 'transaction_completed',
            title: 'Transaction Completed',
            message: `Your ${transaction.tokenSymbol} sale has been completed successfully. M-Pesa payment processed.`,
            data: {
              transactionId: transaction.id,
              tokenSymbol: transaction.tokenSymbol,
              amount: transaction.fiatAmount,
              mpesaReceiptNumber: result.MpesaReceiptNumber
            }
          });

          logger.info('B2C transaction completed successfully', {
            transactionId: transaction.id,
            mpesaReceiptNumber: result.MpesaReceiptNumber,
            amount: result.TransactionAmount
          });
        } else {
          logger.warn('Transaction not found for B2C callback', {
            originatorConversationId: result.OriginatorConversationID
          });
        }
      } else {
        // Payment failed
        const transaction = await this.walletRepository.findTransactionByOriginatorConversationId(result.OriginatorConversationID);
        
        if (transaction) {
          await this.walletRepository.updateTransactionStatus(transaction.id, 'failed');
          
          // Rollback crypto balance if it was a sale
          if (transaction.transactionType === 'OFF_RAMP') {
            const currentBalance = await this.walletRepository.getUserTokenBalance(transaction.userId, transaction.tokenSymbol);
            await this.walletRepository.updateUserTokenBalance(
              transaction.userId,
              transaction.tokenSymbol,
              currentBalance + transaction.cryptoAmount
            );
          }

          // Send failure notification
          await this.notificationService.sendNotification({
            userId: transaction.userId,
            type: 'transaction_failed',
            title: 'Transaction Failed',
            message: `Your ${transaction.tokenSymbol} sale failed. ${result.ResultDesc}`,
            data: {
              transactionId: transaction.id,
              tokenSymbol: transaction.tokenSymbol,
              error: result.ResultDesc
            }
          });

          logger.warn('B2C transaction failed', {
            transactionId: transaction.id,
            error: result.ResultDesc
          });
        }
      }

      // Respond to M-Pesa
      res.status(200).json({
        ResultCode: 0,
        ResultDesc: 'Callback processed successfully'
      });
    } catch (error) {
      logger.error('B2C callback processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body
      });

      res.status(500).json({
        ResultCode: 1,
        ResultDesc: 'Callback processing failed'
      });
    }
  }
}
