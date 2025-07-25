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

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(cors({
      origin: config.server.corsOrigin,
      credentials: true,
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
    logger.info('Using Supabase authentication');
    
    this.app.use('/api/wallet', walletRoutes);
    this.app.use('/api/user', userRoutes);

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
      logger.info(`CORS Origin: ${config.server.corsOrigin}`);
    });
  }
}

// Start the application
const app = new App();
app.listen();

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