/**
 * Solana Derivation Strategy
 * Derives addresses for Solana
 */

import { AddressDerivationStrategy } from './AddressDerivationStrategy';
import { SupportedToken } from '../entities/supported-token';
import { Keypair } from '@solana/web3.js';
import * as bip39 from 'bip39';

export class SolanaDerivationStrategy implements AddressDerivationStrategy {
  async deriveAddress(
    mnemonic: string,
    _token: SupportedToken,
    _network: 'mainnet' | 'testnet',
    _accountIndex: number
  ): Promise<string> {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    
    // Derive keypair using BIP44 path for Solana
    // Note: Solana derivation path is m/44'/501'/0'/0'/accountIndex'
    // For now, using a simplified approach
    const keypair = Keypair.fromSeed(seed.slice(0, 32));
    
    return keypair.publicKey.toString();
  }
} 