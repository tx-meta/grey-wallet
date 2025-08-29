/**
 * Prisma Terms of Service Repository Implementation
 * Implements terms of service data access using Prisma ORM
 */

import { TermsOfService } from '../../domain/entities/terms-of-service';
import { TermsOfServiceRepository } from '../../domain/repositories/terms-of-service-repository';
import prisma from '../database/prisma-client';

export class PrismaTermsOfServiceRepository implements TermsOfServiceRepository {
  async findLatest(): Promise<TermsOfService | null> {
    try {
      const latestTerms = await prisma.termsOfService.findFirst({
        orderBy: {
          tosVersion: 'desc',
        },
      });

      return latestTerms ? this.mapToDomain(latestTerms) : null;
    } catch (error) {
      console.error('❌ PrismaTermsOfServiceRepository.findLatest failed:', error);
      throw error;
    }
  }

  async findByVersion(version: number): Promise<TermsOfService | null> {
    try {
      const terms = await prisma.termsOfService.findUnique({
        where: { tosVersion: version },
      });

      return terms ? this.mapToDomain(terms) : null;
    } catch (error) {
      console.error('❌ PrismaTermsOfServiceRepository.findByVersion failed:', error);
      throw error;
    }
  }

  async findAll(): Promise<TermsOfService[]> {
    try {
      const allTerms = await prisma.termsOfService.findMany({
        orderBy: {
          tosVersion: 'desc',
        },
      });

      return allTerms.map((terms: any) => this.mapToDomain(terms));
    } catch (error) {
      console.error('❌ PrismaTermsOfServiceRepository.findAll failed:', error);
      throw error;
    }
  }

  async save(termsOfService: TermsOfService): Promise<TermsOfService> {
    try {
      const savedTerms = await prisma.termsOfService.create({
        data: {
          terms: termsOfService.terms,
        },
      });

      console.log('✅ PrismaTermsOfServiceRepository.save successful:', savedTerms.tosVersion);
      return this.mapToDomain(savedTerms);
    } catch (error) {
      console.error('❌ PrismaTermsOfServiceRepository.save failed:', error);
      throw error;
    }
  }

  private mapToDomain(prismaTerms: any): TermsOfService {
    return new TermsOfService({
      tosVersion: prismaTerms.tosVersion,
      terms: prismaTerms.terms,
      createdAt: prismaTerms.createdAt,
    });
  }
}
