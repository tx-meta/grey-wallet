/**
 * Terms of Service Controller
 * Handles terms of service-related HTTP requests
 */

import { Request, Response } from 'express';
import { GetTermsOfServiceUseCase } from '../../domain/use_cases/get-terms-of-service';
import logger from '../../shared/logging';
import { ErrorResponseBuilder } from '../../shared/utils/error-response';

export class TermsController {
  constructor(
    private getTermsOfServiceUseCase: GetTermsOfServiceUseCase
  ) {}

  /**
   * GET /api/terms
   * Get the latest terms of service
   */
  async getLatestTerms(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.getTermsOfServiceUseCase.execute({});

      if (!result.success) {
        const errorResponse = ErrorResponseBuilder.notFound(
          result.error || 'Terms of service not found'
        );
        
        res.status(404).json(errorResponse);
        return;
      }

      logger.info('Terms of service retrieved successfully', { 
        version: result.data!.tosVersion 
      });

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error('Terms controller error', { error: error instanceof Error ? error.message : 'Unknown error' });
      
      const errorResponse = ErrorResponseBuilder.internalError('Failed to retrieve terms of service');
      res.status(500).json(errorResponse);
    }
  }

  /**
   * GET /api/terms/:version
   * Get terms of service by specific version
   */
  async getTermsByVersion(req: Request, res: Response): Promise<void> {
    try {
      const version = parseInt(req.params['version'] || '0');
      
      if (isNaN(version) || version <= 0) {
        const errorResponse = ErrorResponseBuilder.badRequest('Invalid version number');
        res.status(400).json(errorResponse);
        return;
      }

      const result = await this.getTermsOfServiceUseCase.execute({ version });

      if (!result.success) {
        const statusCode = result.code === 'VERSION_NOT_FOUND' ? 404 : 400;
        const errorResponse = ErrorResponseBuilder.badRequest(
          result.error || 'Failed to retrieve terms of service'
        );
        
        res.status(statusCode).json(errorResponse);
        return;
      }

      logger.info('Terms of service retrieved by version', { 
        version: result.data!.tosVersion 
      });

      res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      logger.error('Terms controller error', { error: error instanceof Error ? error.message : 'Unknown error' });
      
      const errorResponse = ErrorResponseBuilder.internalError('Failed to retrieve terms of service');
      res.status(500).json(errorResponse);
    }
  }
}
