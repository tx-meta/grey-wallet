/**
 * Token Repository Interface
 * Defines the contract for supported token data access operations
 */

import { SupportedToken } from '../entities/supported-token';

export interface TokenRepository {
  save(token: SupportedToken): Promise<SupportedToken>;
  findById(tokenId: string): Promise<SupportedToken | null>;
  findBySymbol(symbol: string): Promise<SupportedToken | null>;
  update(token: SupportedToken): Promise<SupportedToken>;
  delete(tokenId: string): Promise<boolean>;
  findActiveTokens(): Promise<SupportedToken[]>;
  findAllTokens(): Promise<SupportedToken[]>;
} 