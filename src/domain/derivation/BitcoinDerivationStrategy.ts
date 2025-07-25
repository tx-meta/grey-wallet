/**
 * Bitcoin Derivation Strategy
 * Derives addresses for Bitcoin
 */

import { AddressDerivationStrategy } from './AddressDerivationStrategy';
import { SupportedToken } from '../entities/supported-token';
import * as bitcoin from 'bitcoinjs-lib';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bip39 from 'bip39';

export class BitcoinDerivationStrategy implements AddressDerivationStrategy {
  async deriveAddress(
    mnemonic: string,
    _token: SupportedToken,
    network: 'mainnet' | 'testnet',
    accountIndex: number
  ): Promise<string> {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const bip32 = BIP32Factory(ecc);
    const root = bip32.fromSeed(seed);
    
    // BIP44 path: m/44'/0'/0'/0/accountIndex
    const path = `m/44'/0'/0'/0/${accountIndex}`;
    const child = root.derivePath(path);
    
    const bitcoinNetwork = network === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
    const { address } = bitcoin.payments.p2pkh({ 
      pubkey: Buffer.from(child.publicKey),
      network: bitcoinNetwork 
    });
    
    return address!;
  }
} 