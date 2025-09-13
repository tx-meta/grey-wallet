/**
 * Database Connection Reset Script
 * Terminates all active database connections to resolve prepared statement conflicts
 */

const { PrismaClient } = require('@prisma/client');

async function resetDatabaseConnections() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Resetting database connections...');
    
    // Terminate all active connections from this application
    await prisma.$queryRaw`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid()
        AND application_name LIKE '%prisma%'
    `;
    
    console.log('✅ Database connections reset successfully');
  } catch (error) {
    console.error('❌ Failed to reset database connections:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  resetDatabaseConnections()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { resetDatabaseConnections };
