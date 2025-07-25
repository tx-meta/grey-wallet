/**
 * Derivation Registry
 * Maps token symbols to their derivation strategies
 */

import { AddressDerivationStrategy } from './AddressDerivationStrategy';
import { EvmDerivationStrategy } from './EvmDerivationStrategy';
import { BitcoinDerivationStrategy } from './BitcoinDerivationStrategy';
import { CardanoDerivationStrategy } from './CardanoDerivationStrategy';
import { SolanaDerivationStrategy } from './SolanaDerivationStrategy';

const derivationStrategies: Record<string, AddressDerivationStrategy> = {
  // EVM-compatible chains
  ETH: new EvmDerivationStrategy(),
  USDC: new EvmDerivationStrategy(),
  USDT: new EvmDerivationStrategy(),
  
  // Bitcoin
  BTC: new BitcoinDerivationStrategy(),
  
  // Cardano
  ADA: new CardanoDerivationStrategy(),
  
  // Solana
  SOL: new SolanaDerivationStrategy(),
};

export function getDerivationStrategy(tokenSymbol: string): AddressDerivationStrategy | undefined {
  return derivationStrategies[tokenSymbol.toUpperCase()];
}

export function registerDerivationStrategy(tokenSymbol: string, strategy: AddressDerivationStrategy): void {
  derivationStrategies[tokenSymbol.toUpperCase()] = strategy;
} 