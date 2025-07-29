
// Load mnemonics into MockVaultService
const { MockVaultService } = require('./dist/infrastructure/services/mock-vault-service');
const fs = require('fs');

const mnemonics = JSON.parse(fs.readFileSync('./wallet-mnemonics.json', 'utf8'));
const vaultService = new MockVaultService();

// Load mnemonics into mock service
Object.entries(mnemonics).forEach(([tokenSymbol, encryptedMnemonic]) => {
  vaultService.storeWalletMnemonic(tokenSymbol, encryptedMnemonic);
  console.log(`Loaded mnemonic for ${tokenSymbol}`);
});

module.exports = { vaultService, mnemonics };
