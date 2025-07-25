/**
 * Prisma Token Repository Implementation
 * Real database implementation using Prisma ORM
 */

import { SupportedToken } from '../../domain/entities/supported-token';
import { TokenRepository } from '../../domain/repositories/token-repository';
import prisma from '../database/prisma-client';

export class PrismaTokenRepository implements TokenRepository {
  async save(token: SupportedToken): Promise<SupportedToken> {
    const savedToken = await prisma.supportedToken.create({
      data: {
        tokenId: token.tokenId,
        name: token.name,
        symbol: token.symbol,
        icon: token.icon,
        isActive: token.isActive,
      },
    });

    return this.mapToDomain(savedToken);
  }

  async findById(tokenId: string): Promise<SupportedToken | null> {
    const token = await prisma.supportedToken.findUnique({
      where: { tokenId },
    });

    return token ? this.mapToDomain(token) : null;
  }

  async findBySymbol(symbol: string): Promise<SupportedToken | null> {
    const token = await prisma.supportedToken.findUnique({
      where: { symbol },
    });

    return token ? this.mapToDomain(token) : null;
  }

  async update(token: SupportedToken): Promise<SupportedToken> {
    const updatedToken = await prisma.supportedToken.update({
      where: { tokenId: token.tokenId },
      data: {
        name: token.name,
        symbol: token.symbol,
        icon: token.icon,
        isActive: token.isActive,
      },
    });

    return this.mapToDomain(updatedToken);
  }

  async delete(tokenId: string): Promise<boolean> {
    try {
      await prisma.supportedToken.delete({
        where: { tokenId },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async findActiveTokens(): Promise<SupportedToken[]> {
    const tokens = await prisma.supportedToken.findMany({
      where: { isActive: true },
    });

    return tokens.map(token => this.mapToDomain(token));
  }

  async findAllTokens(): Promise<SupportedToken[]> {
    const tokens = await prisma.supportedToken.findMany();
    return tokens.map(token => this.mapToDomain(token));
  }

  private mapToDomain(prismaToken: any): SupportedToken {
    return new SupportedToken({
      tokenId: prismaToken.tokenId,
      name: prismaToken.name,
      symbol: prismaToken.symbol,
      icon: prismaToken.icon,
      isActive: prismaToken.isActive,
      createdAt: prismaToken.createdAt,
      updatedAt: prismaToken.updatedAt,
    });
  }
} 