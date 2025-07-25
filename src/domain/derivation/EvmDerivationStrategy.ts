/**
 * EVM Derivation Strategy
 * Derives addresses for Ethereum and EVM-compatible chains
 */

import { AddressDerivationStrategy } from './AddressDerivationStrategy';
import { SupportedToken } from '../entities/supported-token';
import { HDNodeWallet, Mnemonic } from 'ethers';

export class EvmDerivationStrategy implements AddressDerivationStrategy {
  async deriveAddress(
    mnemonic: string,
    _token: SupportedToken,
    network: 'mainnet' | 'testnet',
    accountIndex: number
  ): Promise<string> {
    const networkNum = network === 'mainnet' ? 1 : 0;
    const path = `m/44'/60'/0'/${networkNum}/${accountIndex}`;
    
    // Use ethers v6 for HD wallet derivation
    const hdWallet = HDNodeWallet.fromMnemonic(Mnemonic.fromPhrase(mnemonic), path);
    return hdWallet.address;
  }
} 