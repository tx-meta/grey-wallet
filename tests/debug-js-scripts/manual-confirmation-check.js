/**
 * Manually trigger confirmation tracking for debugging
 */

const { PrismaClient } = require('@prisma/client');

async function manualConfirmationCheck() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Manual confirmation check...\n');
    
    // 1. Test findPendingDeposits directly
    console.log('1️⃣ Testing findPendingDeposits...');
    
    const pendingFromDB = await prisma.depositTransaction.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });
    
    console.log(`   Raw DB query found ${pendingFromDB.length} pending deposits:`);
    pendingFromDB.forEach((deposit, i) => {
      console.log(`      ${i + 1}. ${deposit.tokenSymbol} ${deposit.amount}`);
      console.log(`          ID: ${deposit.id}`);
      console.log(`          Status: ${deposit.status}`);
      console.log(`          TX: ${deposit.txHash}`);
      console.log(`          Block: ${deposit.blockNumber}`);
      console.log(`          Confirmations: ${deposit.confirmations}`);
    });
    
    // 2. Test repository method
    console.log('\n2️⃣ Testing repository method...');
    const { PrismaDepositRepository } = require('./dist/src/infrastructure/repositories/prisma-deposit-repository.js');
    const depositRepo = new PrismaDepositRepository(prisma);
    
    const pendingFromRepo = await depositRepo.findPendingDeposits();
    console.log(`   Repository method found ${pendingFromRepo.length} pending deposits:`);
    pendingFromRepo.forEach((deposit, i) => {
      console.log(`      ${i + 1}. ${deposit.tokenSymbol} ${deposit.amount}`);
      console.log(`          ID: ${deposit.id}`);
      console.log(`          Status: ${deposit.status}`);
      console.log(`          TX: ${deposit.txHash}`);
    });
    
    // 3. Test confirmation fetching for USDC
    if (pendingFromRepo.length > 0) {
      const usdcDeposit = pendingFromRepo.find(d => d.tokenSymbol === 'USDC');
      if (usdcDeposit) {
        console.log('\n3️⃣ Testing USDC confirmation fetching...');
        
        try {
          const { ethers } = require('ethers');
          const ethWsUrl = process.env.ETH_WS_RPC_URL;
          
          if (ethWsUrl) {
            const provider = new ethers.WebSocketProvider(ethWsUrl);
            
            // Get transaction receipt
            const receipt = await provider.getTransactionReceipt(usdcDeposit.txHash);
            if (receipt) {
              const currentBlock = await provider.getBlockNumber();
              const confirmations = currentBlock - receipt.blockNumber + 1;
              
              console.log(`   TX Receipt found:`);
              console.log(`      Block: ${receipt.blockNumber}`);
              console.log(`      Current block: ${currentBlock}`);
              console.log(`      Confirmations: ${confirmations}`);
              console.log(`      Status: ${receipt.status} (1 = success)`);
              
              // Test updating confirmations
              console.log('\n   Testing confirmation update...');
              await depositRepo.updateConfirmations(usdcDeposit.txHash, confirmations);
              console.log('   ✅ Confirmations updated successfully');
              
              // Check if it should be confirmed now
              const requiredConfirmations = 2; // USDC testing value
              if (confirmations >= requiredConfirmations) {
                console.log(`   ✅ Has ${confirmations} >= ${requiredConfirmations} confirmations - should be confirmed!`);
                
                // Test status update
                console.log('\n   Testing status update to confirmed...');
                await depositRepo.updateStatus(usdcDeposit.id, 'confirmed');
                console.log('   ✅ Status updated to confirmed');
                
                // Test balance update (this is what's missing)
                console.log('\n   Testing balance update...');
                const { PrismaWalletRepository } = require('./dist/src/infrastructure/repositories/prisma-wallet-repository.js');
                const walletRepo = new PrismaWalletRepository(prisma);
                
                await walletRepo.updateUserTokenBalance(
                  usdcDeposit.userId,
                  usdcDeposit.tokenSymbol,
                  usdcDeposit.amount
                );
                console.log('   ✅ User balance updated successfully');
                
                console.log('\n🎉 MANUAL CONFIRMATION COMPLETE!');
                console.log('   The deposit should now be confirmed and balance updated.');
                
              } else {
                console.log(`   ⏳ Only ${confirmations} confirmations, need ${requiredConfirmations}`);
              }
            } else {
              console.log('   ❌ Transaction receipt not found');
            }
            
            await provider.destroy();
          } else {
            console.log('   ❌ ETH_WS_RPC_URL not configured');
          }
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

manualConfirmationCheck();
