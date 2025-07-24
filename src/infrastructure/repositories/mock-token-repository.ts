/**
 * Mock Token Repository Implementation
 * For testing purposes only
 */

import { SupportedToken } from '../../domain/entities/supported-token';
import { TokenRepository } from '../../domain/repositories/token-repository';

export class MockTokenRepository implements TokenRepository {
  private tokens: Map<string, SupportedToken> = new Map();

  constructor() {
    // Initialize with default tokens
    const defaultTokens = SupportedToken.getDefaultTokens();
    defaultTokens.forEach(token => {
      this.tokens.set(token.tokenId, token);
    });
  }

  async save(token: SupportedToken): Promise<SupportedToken> {
    this.tokens.set(token.tokenId, token);
    return token;
  }

  async findById(tokenId: string): Promise<SupportedToken | null> {
    return this.tokens.get(tokenId) || null;
  }

  async findBySymbol(symbol: string): Promise<SupportedToken | null> {
    for (const token of this.tokens.values()) {
      if (token.symbol === symbol.toUpperCase()) {
        return token;
      }
    }
    return null;
  }

  async update(token: SupportedToken): Promise<SupportedToken> {
    this.tokens.set(token.tokenId, token);
    return token;
  }

  async delete(tokenId: string): Promise<boolean> {
    return this.tokens.delete(tokenId);
  }

  async findActiveTokens(): Promise<SupportedToken[]> {
    return Array.from(this.tokens.values()).filter(token => token.isActive);
  }

  async findAllTokens(): Promise<SupportedToken[]> {
    return Array.from(this.tokens.values());
  }
} 