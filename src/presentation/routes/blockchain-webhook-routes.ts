import { Router } from 'express';
import { container } from '../../infrastructure/container';

const router = Router();
const webhookController = container.getBlockchainWebhookController();

// POST /api/webhooks/blockchain/deposit - Handle blockchain deposit webhooks (no auth)
router.post('/deposit', webhookController.handleDepositWebhook.bind(webhookController));

// GET /api/webhooks/blockchain/health - Health check for webhook endpoint
router.get('/health', webhookController.healthCheck.bind(webhookController));

export default router;
