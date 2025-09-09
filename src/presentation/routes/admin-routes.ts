/**
 * Admin Routes
 * Defines admin-only API endpoints for treasury management
 */

import { Router } from 'express';
import { param, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import { TreasuryController } from '../controllers/treasury-controller';
import { TreasuryService } from '../../application/interfaces/treasury-service';

// Create treasury controller
// Note: This will be injected via container in the main routes setup
export function createAdminRoutes(treasuryService: TreasuryService): Router {
  const router = Router();
  const treasuryController = new TreasuryController(treasuryService);

  // Validation rules
  const getBalanceValidation = [
    param('accountType')
      .isIn(['crypto', 'fiat', 'CRYPTO', 'FIAT'])
      .withMessage('Account type must be CRYPTO or FIAT'),
    param('assetSymbol')
      .isLength({ min: 2, max: 10 })
      .isAlphanumeric()
      .withMessage('Asset symbol must be 2-10 alphanumeric characters'),
  ];

  const getTransactionHistoryValidation = [
    query('accountType')
      .optional()
      .isIn(['crypto', 'fiat', 'CRYPTO', 'FIAT'])
      .withMessage('Account type must be CRYPTO or FIAT'),
    query('assetSymbol')
      .optional()
      .isLength({ min: 2, max: 10 })
      .isAlphanumeric()
      .withMessage('Asset symbol must be 2-10 alphanumeric characters'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
  ];

  // Treasury Routes
  router.get('/treasury/health', treasuryController.healthCheck.bind(treasuryController));

  router.get('/treasury/balances', treasuryController.getAllBalances.bind(treasuryController));

  router.get(
    '/treasury/balance/:accountType/:assetSymbol',
    getBalanceValidation,
    validateRequest,
    treasuryController.getBalance.bind(treasuryController)
  );

  router.get(
    '/treasury/transactions',
    getTransactionHistoryValidation,
    validateRequest,
    treasuryController.getTransactionHistory.bind(treasuryController)
  );

  return router;
}

export default createAdminRoutes;
