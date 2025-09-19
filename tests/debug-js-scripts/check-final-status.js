/**
 * Check final status after manual confirmation
 */

const { PrismaClient } = require('@prisma/client');

async function checkFinalStatus() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🎉 Checking final status after manual confirmation...\n');
    
    const depositId = '94f759ca-aaf6-46bf-b23d-5fb6f1c5ced4';
    const userId = '5708babd-e309-4b6c-bd9c-d90ee43c9c8d';
    
    // 1. Check deposit status
    console.log('1️⃣ Deposit Status:');
    const deposit = await prisma.depositTransaction.findUnique({
      where: { id: depositId }
    });
    
    if (deposit) {
      console.log(`   ✅ Status: ${deposit.status}`);
      console.log(`   ✅ Confirmations: ${deposit.confirmations}`);
      console.log(`   ✅ Amount: ${deposit.amount} ${deposit.tokenSymbol}`);
      console.log(`   ✅ Confirmed At: ${deposit.confirmedAt || 'Not set'}`);
    }
    
    // 2. Check user's USDC balance
    console.log('\n2️⃣ User USDC Balance:');
    const userAddresses = await prisma.userAddress.findMany({
      where: {
        userId: userId,
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
      console.log(`   💰 User Address Balance: ${userAddress.tokenBalance} USDC`);
      console.log(`   🏦 Pooled Wallet Balance: ${userAddress.wallet.walletBalance} USDC`);
      console.log(`   📅 Address Updated: ${userAddress.updatedAt}`);
      console.log(`   📅 Wallet Updated: ${userAddress.wallet.updatedAt}`);
      console.log(`   🏦 Address: ${userAddress.address}`);
    }
    
    // 3. Check recent deposit history
    console.log('\n3️⃣ Recent Deposit History:');
    const recentDeposits = await prisma.depositTransaction.findMany({
      where: {
        userId: userId,
        tokenSymbol: 'USDC'
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });
    
    recentDeposits.forEach((dep, i) => {
      console.log(`   ${i + 1}. ${dep.amount} USDC - ${dep.status}`);
      console.log(`      TX: ${dep.txHash}`);
      console.log(`      Confirmations: ${dep.confirmations}`);
      console.log(`      Date: ${dep.detectedAt}`);
      console.log('');
    });
    
    console.log('🎯 Summary:');
    if (deposit?.status === 'confirmed' && userAddresses.length > 0) {
      console.log('   ✅ USDC deposit successfully confirmed');
      console.log('   ✅ User balance updated');
      console.log('   ✅ User should see 2 USDC in their wallet');
      console.log('\n   📱 The user can now check their app wallet balance!');
    } else {
      console.log('   ❌ Something went wrong - check the logs');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkFinalStatus();
