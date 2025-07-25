/**
 * Cardano Derivation Strategy
 * Derives addresses for Cardano
 */

import { AddressDerivationStrategy } from './AddressDerivationStrategy';
import { SupportedToken } from '../entities/supported-token';
import { Lucid, Blockfrost } from '@lucid-evolution/lucid';

export class CardanoDerivationStrategy implements AddressDerivationStrategy {
  async deriveAddress(
    mnemonic: string,
    _token: SupportedToken,
    network: 'mainnet' | 'testnet',
    _accountIndex: number
  ): Promise<string> {
    // Set up Blockfrost API key and network
    const blockfrostApiKey = process.env['BLOCKFROST_API_KEY'];
    const blockfrostUrl =
      network === 'mainnet'
        ? 'https://cardano-mainnet.blockfrost.io/api/v0'
        : 'https://cardano-preview.blockfrost.io/api/v0';
    const lucidNetwork = network === 'mainnet' ? 'Mainnet' : 'Preview';

    // Initialize Lucid with Blockfrost provider
    const lucid = await Lucid(
      new Blockfrost(blockfrostUrl, blockfrostApiKey),
      lucidNetwork
    );

    // Load wallet from mnemonic
    lucid.selectWallet.fromSeed(mnemonic);

    // Derive base address (Shelley)
    const address = await lucid.wallet().address();
    return address;
  }
} 