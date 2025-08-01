#!/usr/bin/env node

/**
 * Populate Vault with Real Mnemonics Script
 * Loads real encrypted mnemonics from wallet-mnemonics.json into HashiCorp Vault
 */

const vault = require('node-vault');
const fs = require('fs');
const path = require('path');

// Configuration
const VAULT_URL = process.env.VAULT_URL || 'http://localhost:8200';
const VAULT_TOKEN = process.env.VAULT_TOKEN;
const MNEMONICS_FILE = path.join(__dirname, '..', 'wallet-mnemonics.json');

if (!VAULT_TOKEN) {
  console.error('❌ VAULT_TOKEN environment variable is required');
  console.log('Please set your Vault token:');
  console.log('export VAULT_TOKEN=your_vault_token_here');
  process.exit(1);
}

async function populateVaultMnemonics() {
  console.log('🔐 Populating HashiCorp Vault with real mnemonics...');
  console.log(`📍 Vault URL: ${VAULT_URL}`);
  console.log(`📁 Mnemonics file: ${MNEMONICS_FILE}`);

  try {
    // Check if mnemonics file exists
    if (!fs.existsSync(MNEMONICS_FILE)) {
      console.error(`❌ Mnemonics file not found: ${MNEMONICS_FILE}`);
      console.log('Please ensure wallet-mnemonics.json exists in the project root');
      process.exit(1);
    }

    // Read mnemonics from file
    console.log('📖 Reading mnemonics from file...');
    const mnemonicsData = JSON.parse(fs.readFileSync(MNEMONICS_FILE, 'utf8'));
    const tokenSymbols = Object.keys(mnemonicsData);
    
    console.log(`✅ Found ${tokenSymbols.length} token mnemonics: ${tokenSymbols.join(', ')}`);

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
      console.log('✅ KV secrets engine is enabled');
    } catch (error) {
      if (error.response && error.response.statusCode === 404) {
        console.error('❌ KV secrets engine not enabled');
        console.log('Please run the setup script first: npm run vault:setup');
        process.exit(1);
      } else {
        throw error;
      }
    }

    // Populate mnemonics into Vault
    console.log('\n🔐 Loading mnemonics into Vault...');
    let successCount = 0;
    let errorCount = 0;

    for (const [tokenSymbol, encryptedMnemonic] of Object.entries(mnemonicsData)) {
      try {
        // Parse the encrypted mnemonic to validate JSON structure
        const mnemonicData = JSON.parse(encryptedMnemonic);
        
        // Store in Vault
        await client.write(`secret/data/wallet-mnemonics/${tokenSymbol}`, {
          data: {
            encryptedMnemonic: encryptedMnemonic,
            createdAt: new Date().toISOString(),
            description: `Real mnemonic for ${tokenSymbol} wallet`,
            tokenSymbol: tokenSymbol,
            encrypted: mnemonicData.encrypted ? 'true' : 'false',
            hasIV: mnemonicData.iv ? 'true' : 'false',
            hasTag: mnemonicData.tag ? 'true' : 'false'
          }
        });

        console.log(`✅ Loaded ${tokenSymbol} mnemonic into Vault`);
        successCount++;

      } catch (error) {
        console.error(`❌ Failed to load ${tokenSymbol} mnemonic:`, error.message);
        errorCount++;
      }
    }

    // Verify the mnemonics were stored correctly
    console.log('\n🔍 Verifying stored mnemonics...');
    const verificationResults = [];

    for (const tokenSymbol of tokenSymbols) {
      try {
        const response = await client.read(`secret/data/wallet-mnemonics/${tokenSymbol}`);
        const storedData = response.data.data;
        
        if (storedData.encryptedMnemonic) {
          console.log(`✅ ${tokenSymbol}: Verified in Vault`);
          verificationResults.push({ token: tokenSymbol, status: 'success' });
        } else {
          console.log(`❌ ${tokenSymbol}: Missing encrypted mnemonic`);
          verificationResults.push({ token: tokenSymbol, status: 'missing' });
        }
      } catch (error) {
        console.log(`❌ ${tokenSymbol}: Not found in Vault`);
        verificationResults.push({ token: tokenSymbol, status: 'not_found' });
      }
    }

    // Summary
    console.log('\n📊 Population Summary:');
    console.log(`✅ Successfully loaded: ${successCount} mnemonics`);
    console.log(`❌ Failed to load: ${errorCount} mnemonics`);
    console.log(`🔍 Verified in Vault: ${verificationResults.filter(r => r.status === 'success').length} mnemonics`);

    if (successCount > 0) {
      console.log('\n🎉 Vault population completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('1. Test the vault integration: npm run vault:test');
      console.log('2. Start the application: npm start');
      console.log('3. Test wallet creation with user signup');
    } else {
      console.log('\n❌ No mnemonics were successfully loaded');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Vault population failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.statusCode);
      console.error('Response body:', error.response.body);
    }
    process.exit(1);
  }
}

// Run population
populateVaultMnemonics().catch(console.error);
