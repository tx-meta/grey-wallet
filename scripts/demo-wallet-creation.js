/**
 * Demo: Wallet Creation with Address Derivation
 * This script demonstrates how wallets are created with derived addresses for each supported token
 */

const { generateMnemonic, encryptMnemonic } = require('./dist/shared/utils/crypto');
const { getDerivationStrategy } = require('./dist/domain/derivation/DerivationRegistry');

async function demonstrateWalletCreation() {
  console.log('🔐 Grey Wallet - Address Derivation Demo\n');

  // 1. Generate a mnemonic for the wallet
  console.log('1. Generating mnemonic...');
  const mnemonic = generateMnemonic();
  console.log(`   Mnemonic: ${mnemonic}\n`);

  // 2. Encrypt the mnemonic for storage
  console.log('2. Encrypting mnemonic...');
  const secret = process.env.WALLET_ENCRYPTION_SECRET || 'demo_secret';
  const { encrypted, iv, tag } = encryptMnemonic(mnemonic, secret);
  console.log(`   Encrypted: ${encrypted.substring(0, 50)}...`);
  console.log(`   IV: ${iv}`);
  console.log(`   Tag: ${tag}\n`);

  // 3. Supported tokens
  const supportedTokens = [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'ADA', name: 'Cardano' },
    { symbol: 'SOL', name: 'Solana' }
  ];

  console.log('3. Deriving addresses for each token...');
  const network = process.env.WALLET_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
  console.log(`   Network: ${network}\n`);

  // 4. Derive addresses for each token
  for (let i = 0; i < supportedTokens.length; i++) {
    const token = supportedTokens[i];
    const strategy = getDerivationStrategy(token.symbol);
    
    if (strategy) {
      try {
        const address = await strategy.deriveAddress(mnemonic, token, network, i);
        console.log(`   ${token.symbol} (${token.name}): ${address}`);
      } catch (error) {
        console.log(`   ${token.symbol} (${token.name}): Error - ${error.message}`);
      }
    } else {
      console.log(`   ${token.symbol} (${token.name}): No derivation strategy available`);
    }
  }

  console.log('\n✅ Demo completed!');
  console.log('\n📝 Key Points:');
  console.log('   • Each user gets a unique mnemonic');
  console.log('   • Mnemonic is encrypted and stored in HashiCorp Vault');
  console.log('   • Addresses are derived deterministically using BIP44 paths');
  console.log('   • Each token gets its own address index counter');
  console.log('   • Next user will get the next index for each token');
}

// Run the demo
if (require.main === module) {
  demonstrateWalletCreation().catch(console.error);
}

module.exports = { demonstrateWalletCreation }; 