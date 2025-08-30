/**
 * Terms of Service Repository Interface
 * Defines the contract for terms of service data access
 */

import { TermsOfService } from '../entities/terms-of-service';

export interface TermsOfServiceRepository {
  /**
   * Find the latest terms of service by version
   */
  findLatest(): Promise<TermsOfService | null>;

  /**
   * Find terms of service by specific version
   */
  findByVersion(version: number): Promise<TermsOfService | null>;

  /**
   * Find all terms of service versions
   */
  findAll(): Promise<TermsOfService[]>;

  /**
   * Save new terms of service
   */
  save(termsOfService: TermsOfService): Promise<TermsOfService>;
}
