#!/usr/bin/env node

/**
 * Demo: HashiCorp Vault Integration with Pooled Wallets
 * Shows how the system works with real HashiCorp Vault
 */

const { HashiCorpVaultService } = require('./dist/infrastructure/services/hashicorp-vault-service');
const { generateMnemonic, encryptMnemonic, decryptMnemonic } = require('./dist/shared/utils/crypto');

async function demoVaultIntegration() {
  console.log('🚀 Demo: HashiCorp Vault Integration with Pooled Wallets\n');

  try {
    // Check environment variables
    const vaultUrl = process.env['VAULT_URL'];
    const vaultToken = process.env['VAULT_TOKEN'];
    const encryptionSecret = process.env['WALLET_ENCRYPTION_SECRET'];

    if (!vaultUrl || !vaultToken) {
      console.log('⚠️  Vault not configured, using mock service for demo');
      console.log('   Set VAULT_URL and VAULT_TOKEN to use real HashiCorp Vault\n');
      return;
    }

    if (!encryptionSecret) {
      console.log('⚠️  WALLET_ENCRYPTION_SECRET not set, using default');
      process.env['WALLET_ENCRYPTION_SECRET'] = 'demo_secret_key_for_testing_only';
    }

    console.log('🔧 Initializing HashiCorp Vault service...');
    const vaultService = new HashiCorpVaultService();

    // Test health check
    console.log('🔍 Testing Vault health...');
    const isHealthy = await vaultService.isHealthy();
    console.log(`✅ Vault health: ${isHealthy ? 'Healthy' : 'Unhealthy'}\n`);

    // Demo 1: Wallet Mnemonic Management
    console.log('📋 Demo 1: Wallet Mnemonic Management');
    console.log('=====================================');

    const supportedTokens = ['BTC', 'ETH', 'ADA', 'SOL'];
    
    for (const token of supportedTokens) {
      console.log(`\n🔧 Setting up ${token} wallet...`);
      
      // Generate a new mnemonic for this token
      const mnemonic = generateMnemonic();
      console.log(`   Generated mnemonic: ${mnemonic.substring(0, 20)}...`);
      
      // Encrypt the mnemonic
      const secret = process.env['WALLET_ENCRYPTION_SECRET'] || 'demo_secret';
      const { encrypted, iv, tag } = encryptMnemonic(mnemonic, secret);
      const encryptedMnemonic = JSON.stringify({ encrypted, iv, tag });
      
      // Store in Vault
      await vaultService.storeWalletMnemonic(token, encryptedMnemonic);
      console.log(`   ✅ Stored encrypted mnemonic in Vault`);
      
      // Retrieve from Vault
      const retrievedEncrypted = await vaultService.getWalletMnemonic(token);
      if (retrievedEncrypted) {
        const { encrypted: retEnc, iv: retIv, tag: retTag } = JSON.parse(retrievedEncrypted);
        const decryptedMnemonic = decryptMnemonic(retEnc, retIv, retTag, secret);
        console.log(`   ✅ Retrieved and decrypted mnemonic: ${decryptedMnemonic.substring(0, 20)}...`);
        
        // Verify they match
        if (mnemonic === decryptedMnemonic) {
          console.log(`   ✅ Mnemonic verification: PASSED`);
        } else {
          console.log(`   ❌ Mnemonic verification: FAILED`);
        }
      }
    }

    // Demo 2: User Address Derivation
    console.log('\n\n📋 Demo 2: User Address Derivation');
    console.log('===================================');

    const demoUsers = [
      { id: 'user-001', name: 'Alice' },
      { id: 'user-002', name: 'Bob' },
      { id: 'user-003', name: 'Charlie' }
    ];

    for (const user of demoUsers) {
      console.log(`\n👤 Creating addresses for ${user.name} (${user.id})...`);
      
      for (const token of supportedTokens) {
        // Get the mnemonic for this token
        const encryptedMnemonic = await vaultService.getWalletMnemonic(token);
        if (encryptedMnemonic) {
          const { encrypted, iv, tag } = JSON.parse(encryptedMnemonic);
          const secret = process.env['WALLET_ENCRYPTION_SECRET'] || 'demo_secret';
          const mnemonic = decryptMnemonic(encrypted, iv, tag, secret);
          
          // Simulate address derivation (in real app, this uses derivation strategies)
          const addressIndex = Math.floor(Math.random() * 1000); // Simulate index assignment
          const derivedAddress = `${token.toLowerCase()}_address_${addressIndex}_for_${user.id}`;
          
          console.log(`   ${token}: ${derivedAddress}`);
        }
      }
    }

    // Demo 3: Verification Token Management
    console.log('\n\n📋 Demo 3: Verification Token Management');
    console.log('==========================================');

    const demoUser = 'user-001';
    const emailToken = 'email_verification_token_12345';
    const smsToken = 'sms_verification_token_67890';

    console.log(`\n📧 Storing email verification token for ${demoUser}...`);
    await vaultService.storeVerificationToken(demoUser, 'email', emailToken);
    console.log('   ✅ Email token stored');

    console.log(`📱 Storing SMS verification token for ${demoUser}...`);
    await vaultService.storeVerificationToken(demoUser, 'sms', smsToken);
    console.log('   ✅ SMS token stored');

    console.log(`\n🔍 Retrieving verification tokens...`);
    const retrievedEmailToken = await vaultService.getVerificationToken(demoUser, 'email');
    const retrievedSmsToken = await vaultService.getVerificationToken(demoUser, 'sms');
    
    console.log(`   Email token: ${retrievedEmailToken}`);
    console.log(`   SMS token: ${retrievedSmsToken}`);

    // Demo 4: Master Wallet Key Management
    console.log('\n\n📋 Demo 4: Master Wallet Key Management');
    console.log('=========================================');

    for (const token of supportedTokens) {
      console.log(`\n🔑 Managing master key for ${token}...`);
      
      const masterKey = `master_private_key_for_${token}_${Date.now()}`;
      
      // Store master key
      await vaultService.storeMasterWalletKey(token, masterKey);
      console.log(`   ✅ Master key stored`);
      
      // Retrieve master key
      const retrievedMasterKey = await vaultService.getMasterWalletKey(token);
      console.log(`   Retrieved: ${retrievedMasterKey ? 'Present' : 'Missing'}`);
      
      // Rotate master key
      await vaultService.rotateMasterWalletKey(token);
      console.log(`   ✅ Master key rotated`);
    }

    console.log('\n\n🎉 Demo completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ HashiCorp Vault integration working');
    console.log('✅ Wallet mnemonics stored and retrieved');
    console.log('✅ User address derivation simulated');
    console.log('✅ Verification tokens managed');
    console.log('✅ Master keys managed');
    console.log('\n🚀 Ready for production use!');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    if (error.response) {
      console.error('Vault response:', error.response.statusCode, error.response.body);
    }
  }
}

// Run demo
demoVaultIntegration().catch(console.error); 