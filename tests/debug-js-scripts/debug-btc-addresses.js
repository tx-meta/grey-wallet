/**
 * Debug script to check BTC addresses and BlockCypher API issues
 */

const { PrismaClient } = require('@prisma/client');

async function debugBTCAddresses() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking BTC addresses in database...');
    
    // Find all BTC addresses
    const btcAddresses = await prisma.userAddress.findMany({
      where: {
        wallet: {
          tokenSymbol: 'BTC'
        }
      },
      include: {
        user: {
          select: { email: true }
        },
        wallet: {
          select: { tokenSymbol: true, network: true }
        }
      }
    });
    
    console.log(`📊 Found ${btcAddresses.length} BTC addresses:`);
    
    btcAddresses.forEach((addr, index) => {
      console.log(`  ${index + 1}. ${addr.address} (${addr.user.email}) - Network: ${addr.wallet.network}`);
    });
    
    if (btcAddresses.length === 0) {
      console.log('❌ No BTC addresses found in database');
      return;
    }
    
    // Test BlockCypher API with the problematic addresses
    console.log('\n🌐 Testing BlockCypher API calls...');
    
    const testAddresses = ['mx3k6xrpsahzbqn3sxu3ywbnfmvgf8rhwy', 'mumqg3fjxdqhz4kddzqsaysvvenmvuf8gr'];
    
    for (const address of testAddresses) {
      console.log(`\n🔗 Testing address: ${address}`);
      
      // Test different API endpoints
      const endpoints = [
        `https://api.blockcypher.com/v1/btc/test3/addrs/${address}`,
        `https://api.blockcypher.com/v1/btc/test3/addrs/${address}/balance`,
        `https://api.blockcypher.com/v1/btc/main/addrs/${address}`,
      ];
      
      for (const url of endpoints) {
        try {
          console.log(`  📡 Testing: ${url}`);
          const response = await fetch(url);
          console.log(`    Status: ${response.status} ${response.statusText}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`    ✅ Success - Balance: ${data.balance || 'N/A'} satoshis`);
          } else {
            const errorText = await response.text();
            console.log(`    ❌ Error: ${errorText}`);
          }
        } catch (error) {
          console.log(`    ❌ Network Error: ${error.message}`);
        }
      }
    }
    
    // Check if we have API key configured
    console.log('\n🔑 API Configuration:');
    console.log(`  BLOCKCYPHER_API_KEY: ${process.env.BLOCKCYPHER_API_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`  WALLET_NETWORK: ${process.env.WALLET_NETWORK || 'Not set (defaults to test)'}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugBTCAddresses();
