/**
 * Test confirmation tracker specifically for the USDC deposit
 */

const { PrismaClient } = require('@prisma/client');

async function testConfirmationTracker() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing confirmation tracker for USDC deposit...\n');
    
    // 1. Check pending deposits
    console.log('1️⃣ Checking pending deposits...');
    const pendingDeposits = await prisma.depositTransaction.findMany({
      where: {
        status: 'pending'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    console.log(`   Found ${pendingDeposits.length} pending deposits:`);
    pendingDeposits.forEach((deposit, i) => {
      console.log(`      ${i + 1}. ${deposit.tokenSymbol} ${deposit.amount} - ${deposit.confirmations} confirmations`);
      console.log(`          ID: ${deposit.id}`);
      console.log(`          TX: ${deposit.txHash}`);
      console.log(`          Status: ${deposit.status}`);
      console.log(`          Created: ${deposit.detectedAt}`);
      console.log('');
    });
    
    // 2. Check the specific USDC deposit
    const usdcDepositId = '94f759ca-aaf6-46bf-b23d-5fb6f1c5ced4';
    const usdcTxHash = '0xbea4d264b753cbb59b4bf94c4908c8c9befc8e17dd2f9da8aa046ba5e01fc0ec';
    
    console.log('2️⃣ Checking specific USDC deposit...');
    const usdcDeposit = await prisma.depositTransaction.findUnique({
      where: { id: usdcDepositId }
    });
    
    if (usdcDeposit) {
      console.log('   ✅ USDC deposit found:');
      console.log(`      Status: ${usdcDeposit.status}`);
      console.log(`      Confirmations: ${usdcDeposit.confirmations}`);
      console.log(`      Required for USDC: 2`);
      console.log(`      Block: ${usdcDeposit.blockNumber}`);
      
      if (usdcDeposit.status === 'pending') {
        console.log('   ⏳ Deposit is pending - should be picked up by confirmation tracker');
      } else {
        console.log(`   ✅ Deposit status is: ${usdcDeposit.status}`);
      }
    } else {
      console.log('   ❌ USDC deposit not found');
    }
    
    // 3. Test getting current confirmations manually
    console.log('\n3️⃣ Testing confirmation fetching...');
    
    if (usdcDeposit && usdcDeposit.blockNumber) {
      try {
        // Simulate what the confirmation tracker does
        const { ethers } = require('ethers');
        const ethWsUrl = process.env.ETH_WS_RPC_URL;
        
        if (ethWsUrl) {
          console.log('   📡 Connecting to Ethereum network...');
          const provider = new ethers.WebSocketProvider(ethWsUrl);
          
          const currentBlock = await provider.getBlockNumber();
          const txBlockNumber = Number(usdcDeposit.blockNumber);
          const currentConfirmations = currentBlock - txBlockNumber + 1;
          
          console.log(`   Current block: ${currentBlock}`);
          console.log(`   TX block: ${txBlockNumber}`);
          console.log(`   Calculated confirmations: ${currentConfirmations}`);
          console.log(`   DB confirmations: ${usdcDeposit.confirmations}`);
          console.log(`   Required confirmations: 2`);
          
          if (currentConfirmations >= 2) {
            console.log('   ✅ Should be confirmed now!');
            
            if (currentConfirmations !== usdcDeposit.confirmations) {
              console.log('   ⚠️  DB confirmations are outdated - confirmation tracker should update this');
            }
          } else {
            console.log('   ⏳ Still waiting for more confirmations');
          }
          
          await provider.destroy();
        } else {
          console.log('   ❌ ETH_WS_RPC_URL not configured');
        }
      } catch (error) {
        console.log(`   ❌ Error checking confirmations: ${error.message}`);
      }
    }
    
    // 4. Check user balance before and after
    console.log('\n4️⃣ Checking user balance...');
    if (usdcDeposit) {
      // Find user's USDC balance through UserAddress -> Wallet relationship
      const userAddresses = await prisma.userAddress.findMany({
        where: {
          userId: usdcDeposit.userId,
          wallet: {
            tokenSymbol: 'USDC'
          }
        },
        include: {
          wallet: true,
          user: { select: { email: true } }
        }
      });
      
      if (userAddresses.length > 0) {
        const userAddress = userAddresses[0];
        console.log(`   👤 User: ${userAddress.user.email}`);
        console.log(`   💰 Current USDC balance: ${userAddress.wallet.walletBalance}`);
        console.log(`   📅 Wallet last updated: ${userAddress.wallet.updatedAt}`);
        console.log(`   🏦 Expected balance after confirmation: ${userAddress.wallet.walletBalance + Number(usdcDeposit.amount)}`);
      } else {
        console.log('   ❌ No USDC wallet found for user');
      }
    }
    
    console.log('\n📋 Analysis:');
    if (usdcDeposit) {
      if (usdcDeposit.status === 'pending') {
        console.log('   🔍 The deposit is pending - confirmation tracker should process it');
        console.log('   💡 Check if confirmation tracker is running every 30 seconds');
        console.log('   💡 Check if it can fetch current confirmations from blockchain');
        console.log('   💡 Check if updateUserTokenBalance is working correctly');
      } else if (usdcDeposit.status === 'confirmed') {
        console.log('   ✅ Deposit is confirmed - check if user balance was updated');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConfirmationTracker();
