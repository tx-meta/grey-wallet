/**
 * Debug USDC configuration and deposit detection
 */

const { PrismaClient } = require('@prisma/client');

async function debugUSDCConfig() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Debugging USDC deposit configuration...\n');
    
    // 1. Check environment variables
    console.log('1️⃣ Environment Configuration:');
    console.log(`   ETH_WS_RPC_URL: ${process.env.ETH_WS_RPC_URL ? '✅ Set' : '❌ Missing'}`);
    console.log(`   USDC_CONTRACT_ADDRESS: ${process.env.USDC_CONTRACT_ADDRESS || '❌ Not set (using default)'}`);
    console.log(`   USDT_CONTRACT_ADDRESS: ${process.env.USDT_CONTRACT_ADDRESS || '❌ Not set (using default)'}`);
    console.log(`   INFURA_PROJECT_ID: ${process.env.INFURA_PROJECT_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`   WALLET_NETWORK: ${process.env.WALLET_NETWORK || 'testnet (default)'}`);
    
    // Show actual values (masked)
    if (process.env.ETH_WS_RPC_URL) {
      const maskedUrl = process.env.ETH_WS_RPC_URL.replace(/(wss?:\/\/[^\/]+).*/, '$1/***');
      console.log(`   ETH_WS_RPC_URL value: ${maskedUrl}`);
    }
    
    // 2. Check USDC addresses in database
    console.log('\n2️⃣ USDC Addresses in Database:');
    const usdcAddresses = await prisma.userAddress.findMany({
      where: {
        wallet: {
          tokenSymbol: 'USDC'
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
    
    if (usdcAddresses.length === 0) {
      console.log('   ❌ No USDC addresses found in database');
      console.log('   💡 Users need USDC wallets created first');
    } else {
      console.log(`   ✅ Found ${usdcAddresses.length} USDC addresses:`);
      usdcAddresses.forEach((addr, i) => {
        console.log(`      ${i + 1}. ${addr.address} (${addr.user.email})`);
      });
    }
    
    // 3. Check recent USDC deposits
    console.log('\n3️⃣ Recent USDC Deposits:');
    const usdcDeposits = await prisma.depositTransaction.findMany({
      where: {
        tokenSymbol: 'USDC'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    if (usdcDeposits.length === 0) {
      console.log('   📝 No USDC deposits found in database');
    } else {
      console.log(`   📊 Found ${usdcDeposits.length} recent USDC deposits:`);
      usdcDeposits.forEach((deposit, i) => {
        console.log(`      ${i + 1}. ${deposit.amount} USDC - ${deposit.status} (${deposit.confirmations} confirmations)`);
        console.log(`          TX: ${deposit.txHash}`);
        console.log(`          To: ${deposit.userAddress}`);
        console.log(`          Date: ${deposit.detectedAt}`);
      });
    }
    
    // 4. Check contract addresses being used
    console.log('\n4️⃣ Contract Address Analysis:');
    const defaultUSDC = '0xA0b86a33E6441E8aBBf2C4E2b0eFb5D5d8F8F8F8'; // From code
    const configuredUSDC = process.env.USDC_CONTRACT_ADDRESS;
    
    console.log(`   Default USDC (hardcoded): ${defaultUSDC}`);
    console.log(`   Configured USDC: ${configuredUSDC || 'Not set'}`);
    
    if (!configuredUSDC) {
      console.log('   ⚠️  WARNING: No USDC_CONTRACT_ADDRESS configured!');
      console.log('   💡 The system will skip USDC monitoring entirely');
    } else {
      console.log(`   ✅ Using configured address: ${configuredUSDC}`);
    }
    
    // 5. Check if EVM listener would be initialized
    console.log('\n5️⃣ EVM Listener Initialization Check:');
    const ethWsUrl = process.env.ETH_WS_RPC_URL;
    const infuraProjectId = process.env.INFURA_PROJECT_ID;
    
    if (!ethWsUrl) {
      console.log('   ❌ ETH_WS_RPC_URL not set - EVM listener will NOT start');
    } else if (ethWsUrl.includes(infuraProjectId)) {
      console.log('   ❌ ETH_WS_RPC_URL contains INFURA_PROJECT_ID - EVM listener will be SKIPPED');
      console.log('   💡 This appears to be a configuration check to prevent placeholder URLs');
    } else {
      console.log('   ✅ EVM listener should initialize properly');
    }
    
    // 6. Test Sepolia USDC contract (common testnet address)
    console.log('\n6️⃣ Sepolia USDC Contract Info:');
    const sepoliaUSDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Common Sepolia USDC
    console.log(`   Sepolia USDC: ${sepoliaUSDC}`);
    console.log(`   Current config matches Sepolia: ${configuredUSDC === sepoliaUSDC ? '✅ Yes' : '❌ No'}`);
    
    console.log('\n📋 Summary:');
    console.log('   For USDC deposits to work, you need:');
    console.log('   1. ✅ ETH_WS_RPC_URL properly configured');
    console.log('   2. ✅ USDC_CONTRACT_ADDRESS set to correct contract');
    console.log('   3. ✅ Users with USDC wallet addresses created');
    console.log('   4. ✅ EVM listener running and monitoring Transfer events');
    console.log('   5. ✅ Sent to the correct user address on the right network');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugUSDCConfig();
