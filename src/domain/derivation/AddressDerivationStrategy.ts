/**
 * Address Derivation Strategy Interface
 * Defines the contract for deriving addresses from mnemonics
 */

import { SupportedToken } from '../entities/supported-token';

export interface AddressDerivationStrategy {
  deriveAddress(
    mnemonic: string,
    token: SupportedToken,
    network: 'mainnet' | 'testnet',
    accountIndex: number
  ): Promise<string>;
} 