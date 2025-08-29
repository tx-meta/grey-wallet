/**
 * Terms of Service Routes
 * Defines the API endpoints for terms of service
 */

import { Router } from 'express';
import { TermsController } from '../controllers/terms-controller';
import { GetTermsOfServiceUseCase } from '../../domain/use_cases/get-terms-of-service';
import { TermsOfServiceRepository } from '../../domain/repositories/terms-of-service-repository';

export function createTermsRoutes(termsRepository: TermsOfServiceRepository): Router {
  const router = Router();
  
  // Create use case and controller
  const getTermsOfServiceUseCase = new GetTermsOfServiceUseCase(termsRepository);
  const termsController = new TermsController(getTermsOfServiceUseCase);

  // GET /api/terms - Get latest terms of service
  router.get('/', (req, res) => termsController.getLatestTerms(req, res));

  // GET /api/terms/:version - Get terms of service by specific version
  router.get('/:version', (req, res) => termsController.getTermsByVersion(req, res));

  return router;
}
