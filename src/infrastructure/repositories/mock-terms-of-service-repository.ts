/**
 * Mock Terms of Service Repository Implementation
 * For testing purposes only
 */

import { TermsOfService } from '../../domain/entities/terms-of-service';
import { TermsOfServiceRepository } from '../../domain/repositories/terms-of-service-repository';

export class MockTermsOfServiceRepository implements TermsOfServiceRepository {
  private terms: Map<number, TermsOfService> = new Map();
  private nextVersion = 1;

  constructor() {
    // Initialize with mock data
    const mockTerms = new TermsOfService({
      tosVersion: 1,
      terms: '<html><body><h1>Mock Terms of Service</h1><p>This is a mock version for testing.</p></body></html>',
      createdAt: new Date(),
    });
    this.terms.set(1, mockTerms);
  }

  async findLatest(): Promise<TermsOfService | null> {
    const versions = Array.from(this.terms.keys()).sort((a, b) => b - a);
    return versions.length > 0 ? this.terms.get(versions[0]!) || null : null;
  }

  async findByVersion(version: number): Promise<TermsOfService | null> {
    return this.terms.get(version) || null;
  }

  async findAll(): Promise<TermsOfService[]> {
    return Array.from(this.terms.values()).sort((a, b) => b.tosVersion - a.tosVersion);
  }

  async save(termsOfService: TermsOfService): Promise<TermsOfService> {
    const newVersion = this.nextVersion++;
    const savedTerms = new TermsOfService({
      tosVersion: newVersion,
      terms: termsOfService.terms,
      createdAt: termsOfService.createdAt,
    });
    
    this.terms.set(newVersion, savedTerms);
    return savedTerms;
  }
}
