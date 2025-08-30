/**
 * Get Terms of Service Use Case
 * Retrieves the latest terms of service
 */

import { TermsOfService } from '../entities/terms-of-service';
import { TermsOfServiceRepository } from '../repositories/terms-of-service-repository';
import logger from '../../shared/logging';

export interface GetTermsOfServiceRequest {
  version?: number; // Optional: if provided, get specific version; otherwise get latest
}

export interface GetTermsOfServiceResponse {
  tosVersion: number;
  terms: string;
  createdAt: string;
  isLatest: boolean;
}

export interface GetTermsOfServiceResult {
  success: boolean;
  data?: GetTermsOfServiceResponse;
  error?: string;
  code?: string;
}

export class GetTermsOfServiceUseCase {
  constructor(
    private termsOfServiceRepository: TermsOfServiceRepository
  ) {}

  async execute(request: GetTermsOfServiceRequest): Promise<GetTermsOfServiceResult> {
    try {
      let termsOfService: TermsOfService | null;

      if (request.version) {
        // Get specific version
        termsOfService = await this.termsOfServiceRepository.findByVersion(request.version);
        
        if (!termsOfService) {
          logger.warn('Terms of service version not found', { version: request.version });
          return {
            success: false,
            error: `Terms of service version ${request.version} not found`,
            code: 'VERSION_NOT_FOUND',
          };
        }
      } else {
        // Get latest version
        termsOfService = await this.termsOfServiceRepository.findLatest();
        
        if (!termsOfService) {
          logger.warn('No terms of service found');
          return {
            success: false,
            error: 'No terms of service available',
            code: 'NO_TERMS_FOUND',
          };
        }
      }

      // Check if this is the latest version
      const latestTerms = await this.termsOfServiceRepository.findLatest();
      const isLatest = latestTerms ? termsOfService.tosVersion >= latestTerms.tosVersion : true;

      const responseData: GetTermsOfServiceResponse = {
        tosVersion: termsOfService.tosVersion,
        terms: termsOfService.terms,
        createdAt: termsOfService.createdAt.toISOString(),
        isLatest,
      };

      logger.info('Terms of service retrieved successfully', { 
        version: termsOfService.tosVersion,
        isLatest 
      });

      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Get terms of service use case error', { 
        error: errorMessage,
        version: request.version 
      });
      
      return {
        success: false,
        error: 'Failed to retrieve terms of service',
        code: 'INTERNAL_ERROR',
      };
    }
  }
}
