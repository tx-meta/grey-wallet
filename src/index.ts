/**
 * Main Application Entry Point
 * Express server setup with Clean Architecture
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import config from '../shared/config';
import logger, { stream } from '../shared/logging';

// Import routes
import authRoutes from './presentation/routes/auth-routes';
import walletRoutes from './presentation/routes/wallet-routes';
import userRoutes from './presentation/routes/user-routes';
import phoneVerificationRoutes from './presentation/routes/phone-verification-routes';
import paymentRoutes from './presentation/routes/payment-routes';
import cryptoQuoteRoutes from './presentation/routes/crypto-quote-routes';
import sellCryptoRoutes from './presentation/routes/sell-crypto-routes';
import buyCryptoRoutes from './presentation/routes/buy-crypto-routes';
import b2bPaymentRoutes from './presentation/routes/b2b-payment-routes';
import mpesaCallbackRoutes from './presentation/routes/mpesa-callback-routes';
import depositRoutes from './presentation/routes/deposit-routes';
import blockchainWebhookRoutes from './presentation/routes/blockchain-webhook-routes';
import { createTermsRoutes } from './presentation/routes/terms-routes';
import { createTestSMSRoutes } from './presentation/routes/test-sms-routes';
import { createAdminRoutes } from './presentation/routes/admin-routes';

// Import middleware
import { errorHandler } from './presentation/middleware/error-handler';
// import { requestLogger } from './presentation/middleware/request-logger';

class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private configureCorsOrigin(): string | string[] | boolean {
    const corsOrigin = config.server.corsOrigin;
    
    // In development, allow all origins for mobile development
    if (config.server.nodeEnv === 'development' && corsOrigin === '*') {
      return true;
    }
    
    // Support multiple origins separated by comma
    if (corsOrigin.includes(',')) {
      return corsOrigin.split(',').map(origin => origin.trim());
    }
    
    // Single origin
    return corsOrigin;
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(cors({
      origin: this.configureCorsOrigin(),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
    });
    this.app.use('/api/', limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression middleware
    this.app.use(compression());

    // Logging middleware
    this.app.use(morgan('combined', { stream }));
    // this.app.use(requestLogger);

    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'grey-wallet-api',
        version: '1.0.0',
      });
    });
  }

  private initializeRoutes(): void {
    // API routes - Using Supabase authentication
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/wallet', walletRoutes);
    this.app.use('/api/user', userRoutes);
    this.app.use('/api/phone', phoneVerificationRoutes);
    this.app.use('/api/payments', paymentRoutes);
    this.app.use('/api/quotes/crypto', cryptoQuoteRoutes);
    this.app.use('/api/sell/crypto', sellCryptoRoutes);
    this.app.use('/api/buy/crypto', buyCryptoRoutes);
    this.app.use('/api/payments/b2b', b2bPaymentRoutes);
    this.app.use('/api/mpesa/callback', mpesaCallbackRoutes);
    this.app.use('/api/deposits', depositRoutes);
    this.app.use('/api/webhooks/blockchain', blockchainWebhookRoutes);
    
    // Terms of service routes
    const container = require('./infrastructure/container').container;
    const termsRoutes = createTermsRoutes(container.getRepositories().termsOfServiceRepository);
    this.app.use('/api/terms', termsRoutes);
    
    // Test SMS routes (development only)
    const testSMSRoutes = createTestSMSRoutes();
    this.app.use('/api/test/sms', testSMSRoutes);
    
    // Admin routes (treasury management)
    const adminRoutes = createAdminRoutes(container.getServices().treasuryService);
    this.app.use('/api/admin', adminRoutes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl,
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public listen(): void {
    const port = config.server.port;
    const host = config.server.host;

    this.app.listen(port, host, () => {
      logger.info(`Server running on http://${host}:${port}`);
      logger.info(`Environment: ${config.server.nodeEnv}`);
    });
  }
}

// Import database seeder
import { seedDatabase } from './infrastructure/database/seed';

// Start the application
const app = new App();

// Seed database on startup (non-blocking)
seedDatabase()
  .then(() => {
    logger.info('Database seeding completed, starting server...');
  })
  .catch((error) => {
    logger.error('Database seeding failed, but continuing with server startup', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  })
  .finally(() => {
    // Start the server regardless of seeding result
    app.listen();
    
    // Start blockchain monitoring after server starts
    const container = require('./infrastructure/container').container;
    const blockchainMonitorService = container.getServices().blockchainMonitorService;
    
    blockchainMonitorService.startAll()
      .then(() => {
        logger.info('All blockchain listeners started successfully');
      })
      .catch((error: any) => {
        logger.error('Failed to start blockchain listeners', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      });
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app; 