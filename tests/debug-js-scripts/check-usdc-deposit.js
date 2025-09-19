/**
 * Check USDC deposit configuration and recent transactions
 */

const { PrismaClient } = require('@prisma/client');

async function checkUSDCDeposit() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking USDC deposit configuration and recent activity...\n');
    
    // 1. Environment check
    console.log('1️⃣ Environment Configuration:');
    console.log(`   USDC_CONTRACT_ADDRESS: ${process.env.USDC_CONTRACT_ADDRESS || 'Not set (will use default)'}`);
    console.log(`   ETH_WS_RPC_URL: ${process.env.ETH_WS_RPC_URL ? 'Set' : 'Missing'}`);
    console.log(`   WALLET_NETWORK: ${process.env.WALLET_NETWORK || 'testnet (default)'}`);
    
    // Show what addresses will be used
    const defaultUSDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Sepolia USDC
    const usdcContract = process.env.USDC_CONTRACT_ADDRESS || defaultUSDC;
    console.log(`   Effective USDC contract: ${usdcContract}`);
    console.log(`   Network: ${process.env.WALLET_NETWORK === 'mainnet' ? 'Ethereum Mainnet' : 'Sepolia Testnet'}`);
    
    // 2. Check USDC user addresses
    console.log('\n2️⃣ USDC User Addresses:');
    const usdcAddresses = await prisma.userAddress.findMany({
      where: {
        wallet: {
          tokenSymbol: 'USDC'
        }
      },
      include: {
        user: {
          select: { email: true, id: true }
        },
        wallet: {
          select: { tokenSymbol: true }
        }
      }
    });
    
    if (usdcAddresses.length === 0) {
      console.log('   ❌ No USDC addresses found in database');
      console.log('   💡 Users need to create USDC wallets first');
    } else {
      console.log(`   ✅ Found ${usdcAddresses.length} USDC addresses:`);
      usdcAddresses.forEach((addr, i) => {
        console.log(`      ${i + 1}. ${addr.address}`);
        console.log(`          User: ${addr.user.email}`);
        console.log(`          Token: ${addr.wallet.tokenSymbol}`);
        console.log('');
      });
    }
    
    // 3. Check recent USDC deposits
    console.log('3️⃣ Recent USDC Deposits:');
    const usdcDeposits = await prisma.depositTransaction.findMany({
      where: {
        tokenSymbol: 'USDC'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    if (usdcDeposits.length === 0) {
      console.log('   📝 No USDC deposits found');
    } else {
      console.log(`   📊 Found ${usdcDeposits.length} recent USDC deposits:`);
      usdcDeposits.forEach((deposit, i) => {
        console.log(`      ${i + 1}. ${deposit.amount} USDC - ${deposit.status}`);
        console.log(`          TX: ${deposit.txHash}`);
        console.log(`          To: ${deposit.userAddress}`);
        console.log(`          From: ${deposit.fromAddress}`);
        console.log(`          Confirmations: ${deposit.confirmations}`);
        console.log(`          Detected: ${deposit.detectedAt}`);
        console.log('');
      });
    }
    
    // 4. Check all recent ERC20 transfers (might be USDC)
    console.log('4️⃣ Recent ERC20 Deposits (all tokens):');
    const allERC20Deposits = await prisma.depositTransaction.findMany({
      where: {
        tokenSymbol: {
          in: ['USDT', 'USDC']
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    if (allERC20Deposits.length === 0) {
      console.log('   📝 No ERC20 deposits found');
    } else {
      console.log(`   📊 Recent ERC20 activity:`);
      allERC20Deposits.forEach((deposit, i) => {
        console.log(`      ${i + 1}. ${deposit.tokenSymbol} ${deposit.amount} - ${deposit.status}`);
        console.log(`          To: ${deposit.userAddress}`);
        console.log(`          TX: ${deposit.txHash}`);
        console.log(`          Time: ${deposit.detectedAt}`);
        console.log('');
      });
    }
    
    // 5. Check if there's a specific address you sent to
    console.log('5️⃣ Address Analysis:');
    if (usdcAddresses.length > 0) {
      const yourAddress = usdcAddresses[0].address; // Assuming first address is yours
      console.log(`   Your USDC address: ${yourAddress}`);
      console.log(`   📋 Please confirm you sent 2 USDC to this address`);
      console.log(`   🌐 On network: ${process.env.WALLET_NETWORK === 'mainnet' ? 'Ethereum Mainnet' : 'Sepolia Testnet'}`);
      console.log(`   📜 Contract: ${usdcContract}`);
    } else {
      console.log('   ❌ No USDC address found - this is likely the issue!');
      console.log('   💡 You need to create a USDC wallet first in the app');
    }
    
    console.log('\n📋 Troubleshooting Checklist:');
    console.log('   1. ✅ USDC contract address configured (fixed)');
    console.log('   2. ✅ USDC decimals corrected (6 instead of 18)');
    console.log('   3. ❓ Do you have a USDC address in the app?');
    console.log('   4. ❓ Did you send to the correct address?');
    console.log('   5. ❓ Did you send on the correct network (Sepolia)?');
    console.log('   6. ❓ Is the EVM listener running and monitoring?');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUSDCDeposit();
