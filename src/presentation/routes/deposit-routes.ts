import { Router } from 'express';
import { container } from '../../infrastructure/container';

const router = Router();
const depositController = container.getDepositController();
const authMiddleware = container.getAuthMiddleware();

// GET /api/deposits/history - Get user's deposit history (authenticated)
router.get('/history', authMiddleware.authenticate, depositController.getDepositHistory.bind(depositController));

// GET /api/deposits/addresses - Get user's deposit addresses (authenticated)
router.get('/addresses', authMiddleware.authenticate, depositController.getDepositAddresses.bind(depositController));

// GET /api/deposits/:id - Get specific deposit details (authenticated)
router.get('/:id', authMiddleware.authenticate, depositController.getDepositDetails.bind(depositController));

export default router;
