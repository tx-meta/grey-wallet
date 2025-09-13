/**
 * Clean Server Startup Script
 * Ensures clean database connections before starting the server
 */

const { spawn } = require('child_process');
const { resetDatabaseConnections } = require('./reset-db-connections');

async function startServerClean() {
  try {
    console.log('🧹 Preparing clean server startup...');
    
    // Reset database connections first
    await resetDatabaseConnections();
    
    // Wait a moment for connections to fully close
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🚀 Starting server with clean database connections...');
    
    // Start the server
    const serverProcess = spawn('node', ['dist/src/index.js'], {
      stdio: 'inherit',
      env: { ...process.env, PRISMA_FORCE_FRESH_CONNECTION: 'true' }
    });
    
    // Handle server process events
    serverProcess.on('error', (error) => {
      console.error('❌ Server startup failed:', error);
      process.exit(1);
    });
    
    serverProcess.on('exit', (code) => {
      console.log(`🛑 Server exited with code ${code}`);
      process.exit(code);
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received, shutting down server...');
      serverProcess.kill('SIGTERM');
    });
    
    process.on('SIGINT', () => {
      console.log('🛑 SIGINT received, shutting down server...');
      serverProcess.kill('SIGINT');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server cleanly:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  startServerClean();
}

module.exports = { startServerClean };
