const { PrismaClient } = require('@prisma/client');

async function checkTransactions() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Checking database connection...');
    
    // Check total transactions
    const totalCount = await prisma.transaction.count();
    console.log('Total transactions:', totalCount);
    
    if (totalCount > 0) {
      // Get recent transactions
      const recentTransactions = await prisma.transaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          transactionId: true,
          userId: true,
          tokenSymbol: true,
          status: true,
          checkoutRequestId: true,
          merchantRequestId: true,
          createdAt: true
        }
      });
      
      console.log('Recent transactions:');
      recentTransactions.forEach((tx, index) => {
        console.log(`${index + 1}. ID: ${tx.transactionId}`);
        console.log(`   User: ${tx.userId}`);
        console.log(`   Token: ${tx.tokenSymbol}`);
        console.log(`   Status: ${tx.status}`);
        console.log(`   CheckoutRequestId: ${tx.checkoutRequestId || 'NULL'}`);
        console.log(`   MerchantRequestId: ${tx.merchantRequestId || 'NULL'}`);
        console.log(`   Created: ${tx.createdAt}`);
        console.log('');
      });
      
      // Check for the specific transaction from the error
      const specificTransaction = await prisma.transaction.findFirst({
        where: { checkoutRequestId: 'ws_CO_1754229306152726367035' }
      });
      
      if (specificTransaction) {
        console.log('Found the specific transaction:');
        console.log(JSON.stringify(specificTransaction, null, 2));
      } else {
        console.log('Specific transaction NOT found');
        
        // Check for transactions with similar checkoutRequestId
        const similarTransactions = await prisma.transaction.findMany({
          where: {
            checkoutRequestId: {
              contains: 'ws_CO_'
            }
          },
          select: {
            transactionId: true,
            checkoutRequestId: true,
            merchantRequestId: true,
            status: true,
            createdAt: true
          }
        });
        
        console.log('Similar transactions with ws_CO_ pattern:');
        similarTransactions.forEach(tx => {
          console.log(`- ${tx.checkoutRequestId} (${tx.status})`);
        });
      }
    }
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTransactions(); 