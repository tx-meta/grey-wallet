const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('Checking users table...');
    
    const userCount = await prisma.user.count();
    console.log(`Total users in database: ${userCount}`);
    
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          country: true,
          currency: true,
          createdAt: true
        }
      });
      
      console.log('\nUsers found:');
      users.forEach(user => {
        console.log(`- ${user.email} (${user.firstName} ${user.lastName}) from ${user.country}`);
      });
    }
    
    // Check for specific user
    const testUser = await prisma.user.findUnique({
      where: { email: 'testuser2@example.com' }
    });
    
    if (testUser) {
      console.log('\n✅ testuser2@example.com found in database!');
      console.log('User details:', testUser);
    } else {
      console.log('\n❌ testuser2@example.com NOT found in database');
    }
    
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers(); 