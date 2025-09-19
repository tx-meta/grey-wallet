/**
 * Test script to check if the confirmation tracking fix works
 */

const { PrismaClient } = require('@prisma/client');

async function testConfirmationFix() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking current deposit status...');
    
    // Find the USDT deposit from the logs
    const txHash = '0x44bd34bb356a420077b5788bbc87613ef982c12b54a786ce0032f6ba10205ddc';
    
    const deposit = await prisma.depositTransaction.findUnique({
      where: { txHash }
    });
    
    if (!deposit) {
      console.log('❌ Deposit not found in database');
      return;
    }
    
    console.log('📊 Current deposit status:');
    console.log(`  - ID: ${deposit.id}`);
    console.log(`  - Amount: ${deposit.amount} USDT`);
    console.log(`  - Status: ${deposit.status}`);
    console.log(`  - Confirmations: ${deposit.confirmations}`);
    console.log(`  - Block Number: ${deposit.blockNumber}`);
    console.log(`  - Detected At: ${deposit.detectedAt}`);
    console.log(`  - Confirmed At: ${deposit.confirmedAt || 'Not confirmed yet'}`);
    
    // Check all pending deposits
    console.log('\n🔄 All pending deposits:');
    const pendingDeposits = await prisma.depositTransaction.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    if (pendingDeposits.length === 0) {
      console.log('✅ No pending deposits found');
    } else {
      pendingDeposits.forEach((dep, index) => {
        console.log(`  ${index + 1}. ${dep.tokenSymbol} ${dep.amount} - ${dep.confirmations} confirmations - ${dep.status}`);
      });
    }
    
    // Check user balance
    console.log('\n💰 Current USDT balance:');
    const userAddress = await prisma.userAddress.findFirst({
      where: {
        address: '0x217F087bEd898eDC858122d838a698B0B0acAF49'
      },
      include: {
        user: true,
        wallet: true
      }
    });
    
    if (userAddress) {
      console.log(`  - User: ${userAddress.user.email}`);
      console.log(`  - Token Balance: ${userAddress.wallet.tokenBalance} USDT`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConfirmationFix();
