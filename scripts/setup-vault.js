#!/usr/bin/env node

/**
 * HashiCorp Vault Setup Script
 * Initializes Vault for Grey Wallet pooled wallet system
 */

const vault = require('node-vault');

// Configuration
const VAULT_URL = process.env.VAULT_URL || 'http://localhost:8200';
const VAULT_TOKEN = process.env.VAULT_TOKEN;

if (!VAULT_TOKEN) {
  console.error('❌ VAULT_TOKEN environment variable is required');
  console.log('Please set your Vault token:');
  console.log('export VAULT_TOKEN=your_vault_token_here');
  process.exit(1);
}

async function setupVault() {
  console.log('🔧 Setting up HashiCorp Vault for Grey Wallet...');
  console.log(`📍 Vault URL: ${VAULT_URL}`);

  try {
    // Initialize Vault client
    const client = vault({
      apiVersion: 'v1',
      endpoint: VAULT_URL,
      token: VAULT_TOKEN,
    });

    // Test connection
    console.log('🔍 Testing Vault connection...');
    const health = await client.health();
    console.log('✅ Vault connection successful');

    // Check if KV secrets engine is enabled
    console.log('🔍 Checking KV secrets engine...');
    try {
      await client.read('sys/mounts/secret');
      console.log('✅ KV secrets engine already enabled');
    } catch (error) {
      if (error.response && error.response.statusCode === 404) {
        console.log('🔧 Enabling KV secrets engine...');
        await client.mount({
          mount_point: 'secret',
          type: 'kv',
          options: {
            version: '2'
          }
        });
        console.log('✅ KV secrets engine enabled successfully');
      } else {
        throw error;
      }
    }

    // Create initial path structure
    console.log('🔧 Creating initial path structure...');
    const initialPaths = [
      'wallet-keys/.initial',
      'wallet-mnemonics/.initial',
      'user-mnemonics/.initial',
      'verification-tokens/.initial',
      'master-keys/.initial'
    ];

    for (const path of initialPaths) {
      try {
        await client.write(`secret/data/${path}`, {
          data: { 
            initialized: 'true',
            timestamp: new Date().toISOString(),
            description: 'Grey Wallet Vault initialization marker'
          }
        });
        console.log(`✅ Created path: ${path}`);
      } catch (error) {
        console.log(`⚠️  Path already exists: ${path}`);
      }
    }

    // Create sample wallet mnemonics for testing
    console.log('🔧 Creating sample wallet mnemonics...');
    const sampleMnemonics = {
      'BTC': {
        encrypted: 'sample_encrypted_btc_mnemonic_for_testing',
        iv: 'sample_iv',
        tag: 'sample_tag'
      },
      'ETH': {
        encrypted: 'sample_encrypted_eth_mnemonic_for_testing',
        iv: 'sample_iv',
        tag: 'sample_tag'
      },
      'ADA': {
        encrypted: 'sample_encrypted_ada_mnemonic_for_testing',
        iv: 'sample_iv',
        tag: 'sample_tag'
      },
      'SOL': {
        encrypted: 'sample_encrypted_sol_mnemonic_for_testing',
        iv: 'sample_iv',
        tag: 'sample_tag'
      }
    };

    for (const [tokenSymbol, mnemonicData] of Object.entries(sampleMnemonics)) {
      try {
        await client.write(`secret/data/wallet-mnemonics/${tokenSymbol}`, {
          data: { 
            encryptedMnemonic: JSON.stringify(mnemonicData),
            createdAt: new Date().toISOString(),
            description: `Sample mnemonic for ${tokenSymbol} wallet`
          }
        });
        console.log(`✅ Created sample mnemonic for ${tokenSymbol}`);
      } catch (error) {
        console.log(`⚠️  Sample mnemonic already exists for ${tokenSymbol}`);
      }
    }

    console.log('\n🎉 Vault setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Update your .env file with:');
    console.log(`   VAULT_URL=${VAULT_URL}`);
    console.log(`   VAULT_TOKEN=${VAULT_TOKEN}`);
    console.log('2. Run the application: npm start');
    console.log('3. Test wallet creation with a user signup');

  } catch (error) {
    console.error('❌ Vault setup failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.statusCode);
      console.error('Response body:', error.response.body);
    }
    process.exit(1);
  }
}

// Run setup
setupVault().catch(console.error); 