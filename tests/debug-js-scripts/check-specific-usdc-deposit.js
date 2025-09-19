/**
 * Check the specific USDC deposit that was detected
 */

const { PrismaClient } = require('@prisma/client');

async function checkSpecificUSDCDeposit() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking specific USDC deposit from logs...\n');
    
    // The deposit ID from logs: 94f759ca-aaf6-46bf-b23d-5fb6f1c5ced4
    const depositId = '94f759ca-aaf6-46bf-b23d-5fb6f1c5ced4';
    const txHash = '0xbea4d264b753cbb59b4bf94c4908c8c9befc8e17dd2f9da8aa046ba5e01fc0ec';
    const toAddress = '0xe24Cd7Dc8D34A122F49930DC12F2D7cdaE1cD2d3';
    
    console.log('📋 Expected deposit details:');
    console.log(`   Deposit ID: ${depositId}`);
    console.log(`   TX Hash: ${txHash}`);
    console.log(`   To Address: ${toAddress}`);
    console.log(`   Amount: 2 USDC`);
    console.log(`   Token: USDC`);
    
    // 1. Check if the deposit exists
    console.log('\n1️⃣ Checking deposit record...');
    const deposit = await prisma.depositTransaction.findUnique({
      where: { id: depositId }
    });
    
    if (!deposit) {
      console.log('   ❌ Deposit record not found in database');
      
      // Check by TX hash
      const depositByTx = await prisma.depositTransaction.findUnique({
        where: { txHash: txHash }
      });
      
      if (depositByTx) {
        console.log(`   ✅ Found deposit by TX hash: ${depositByTx.id}`);
        console.log(`      Status: ${depositByTx.status}`);
        console.log(`      Amount: ${depositByTx.amount}`);
        console.log(`      Confirmations: ${depositByTx.confirmations}`);
      } else {
        console.log('   ❌ No deposit found by TX hash either');
        return;
      }
    } else {
      console.log('   ✅ Deposit record found!');
      console.log(`      ID: ${deposit.id}`);
      console.log(`      User ID: ${deposit.userId}`);
      console.log(`      Amount: ${deposit.amount} ${deposit.tokenSymbol}`);
      console.log(`      Status: ${deposit.status}`);
      console.log(`      Confirmations: ${deposit.confirmations}`);
      console.log(`      TX Hash: ${deposit.txHash}`);
      console.log(`      To Address: ${deposit.userAddress}`);
      console.log(`      From Address: ${deposit.fromAddress}`);
      console.log(`      Block Number: ${deposit.blockNumber}`);
      console.log(`      Detected At: ${deposit.detectedAt}`);
      console.log(`      Confirmed At: ${deposit.confirmedAt || 'Not confirmed yet'}`);
    }
    
    // 2. Check user's wallet balance
    console.log('\n2️⃣ Checking user wallet balance...');
    const userId = deposit?.userId;
    if (userId) {
      const userWallet = await prisma.wallet.findFirst({
        where: {
          userId: userId,
          tokenSymbol: 'USDC'
        }
      });
      
      if (userWallet) {
        console.log(`   ✅ USDC wallet found:`);
        console.log(`      Wallet ID: ${userWallet.walletId}`);
        console.log(`      Balance: ${userWallet.walletBalance} USDC`);
        console.log(`      Updated: ${userWallet.updatedAt}`);
      } else {
        console.log('   ❌ No USDC wallet found for user');
      }
      
      // Check user info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, id: true }
      });
      console.log(`   👤 User: ${user?.email} (${user?.id})`);
    }
    
    // 3. Check address ownership
    console.log('\n3️⃣ Checking address ownership...');
    const userAddress = await prisma.userAddress.findFirst({
      where: {
        address: toAddress
      },
      include: {
        user: { select: { email: true } },
        wallet: { select: { tokenSymbol: true } }
      }
    });
    
    if (userAddress) {
      console.log(`   ✅ Address is owned by user:`);
      console.log(`      Address: ${userAddress.address}`);
      console.log(`      User: ${userAddress.user.email}`);
      console.log(`      Token: ${userAddress.wallet.tokenSymbol}`);
    } else {
      console.log(`   ❌ Address ${toAddress} not found in user addresses`);
      console.log(`   💡 This could be why the deposit wasn't processed`);
    }
    
    // 4. Compare with USDT deposits
    console.log('\n4️⃣ Comparing with recent USDT deposits...');
    const recentUSDTDeposits = await prisma.depositTransaction.findMany({
      where: { tokenSymbol: 'USDT' },
      orderBy: { createdAt: 'desc' },
      take: 3
    });
    
    console.log(`   📊 Recent USDT deposits for comparison:`);
    recentUSDTDeposits.forEach((usdt, i) => {
      console.log(`      ${i + 1}. ${usdt.amount} USDT - ${usdt.status} (${usdt.confirmations} confirmations)`);
      console.log(`          TX: ${usdt.txHash}`);
      console.log(`          To: ${usdt.userAddress}`);
    });
    
    // 5. Check confirmation requirements
    console.log('\n5️⃣ Confirmation Analysis...');
    const currentDeposit = deposit || await prisma.depositTransaction.findUnique({ where: { txHash } });
    if (currentDeposit) {
      console.log(`   Current confirmations: ${currentDeposit.confirmations}`);
      console.log(`   Required confirmations for USDC: 2 (testing)`);
      console.log(`   Status: ${currentDeposit.status}`);
      
      if (currentDeposit.confirmations >= 2) {
        console.log(`   ✅ Sufficient confirmations - should be confirmed`);
        if (currentDeposit.status === 'pending') {
          console.log(`   ⚠️  WARNING: Has enough confirmations but still pending!`);
        }
      } else {
        console.log(`   ⏳ Waiting for more confirmations`);
      }
    }
    
    console.log('\n📋 Summary:');
    if (deposit && deposit.status === 'confirmed') {
      console.log('   ✅ Deposit is confirmed - check wallet balance update');
    } else if (deposit && deposit.status === 'pending') {
      console.log('   ⏳ Deposit is pending - waiting for confirmations');
    } else {
      console.log('   ❌ Deposit processing issue - check address ownership and configuration');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecificUSDCDeposit();
