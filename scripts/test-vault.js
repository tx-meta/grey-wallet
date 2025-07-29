#!/usr/bin/env node

/**
 * HashiCorp Vault Test Script
 * Tests the Vault integration for Grey Wallet
 */

const vault = require('node-vault');

// Configuration
const VAULT_URL = process.env.VAULT_URL || 'http://localhost:8200';
const VAULT_TOKEN = process.env.VAULT_TOKEN;

if (!VAULT_TOKEN) {
  console.error('❌ VAULT_TOKEN environment variable is required');
  process.exit(1);
}

async function testVault() {
  console.log('🧪 Testing HashiCorp Vault integration...');
  console.log(`📍 Vault URL: ${VAULT_URL}`);

  try {
    // Initialize Vault client
    const client = vault({
      apiVersion: 'v1',
      endpoint: VAULT_URL,
      token: VAULT_TOKEN,
    });

    // Test 1: Health check
    console.log('\n🔍 Test 1: Health check');
    const health = await client.health();
    console.log('✅ Vault is healthy:', health);

    // Test 2: Read sample wallet mnemonics
    console.log('\n🔍 Test 2: Reading wallet mnemonics');
    const tokens = ['BTC', 'ETH', 'ADA', 'SOL'];
    
    for (const token of tokens) {
      try {
        const response = await client.read(`secret/data/wallet-mnemonics/${token}`);
        console.log(`✅ ${token} mnemonic found:`, response.data.data.encryptedMnemonic ? 'Present' : 'Missing');
      } catch (error) {
        console.log(`❌ ${token} mnemonic not found`);
      }
    }

    // Test 3: Write and read a test value
    console.log('\n🔍 Test 3: Write and read test value');
    const testKey = 'test-key';
    const testValue = { message: 'Hello from Grey Wallet!', timestamp: new Date().toISOString() };
    
    await client.write(`secret/data/test/${testKey}`, {
      data: testValue
    });
    console.log('✅ Test value written');

    const readResponse = await client.read(`secret/data/test/${testKey}`);
    console.log('✅ Test value read:', readResponse.data.data);

    // Test 4: List secrets
    console.log('\n🔍 Test 4: Listing secrets');
    try {
      const listResponse = await client.list('secret/metadata/wallet-mnemonics');
      console.log('✅ Wallet mnemonics found:', listResponse.data.keys || []);
    } catch (error) {
      console.log('⚠️  Could not list wallet mnemonics:', error.message);
    }

    // Test 5: Delete test value
    console.log('\n🔍 Test 5: Cleanup test value');
    await client.delete(`secret/data/test/${testKey}`);
    console.log('✅ Test value deleted');

    console.log('\n🎉 All Vault tests passed!');
    console.log('\n📋 Vault is ready for Grey Wallet integration');

  } catch (error) {
    console.error('❌ Vault test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.statusCode);
      console.error('Response body:', error.response.body);
    }
    process.exit(1);
  }
}

// Run tests
testVault().catch(console.error); 