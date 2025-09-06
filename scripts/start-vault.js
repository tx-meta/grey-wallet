#!/usr/bin/env node

/**
 * Node.js wrapper for starting and unsealing HashiCorp Vault in Docker
 * This script provides better npm integration and cross-platform support
 */

const { spawn, exec } = require('child_process');
const path = require('path');

const VAULT_CONTAINER_NAME = 'vault';
const VAULT_ADDR = 'http://127.0.0.1:8200';

// Unseal keys provided by the user
const UNSEAL_KEYS = [
    'JLjFN88Ea3nSsA8Rsl4aDUo0xgPQ5HGOgJnhc80hf0qV',
    '2ueLDqsMJ1wVkSTaBTXzPiSaq92x1pOdGLpsLxEjozHQ',
    '0xe1bMfZ571+lwmDVOotd2PQba1F4Bmtg0LeXp/dLV+6'
];

function runCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
        exec(command, options, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

async function checkDockerRunning() {
    try {
        await runCommand('docker --version');
        return true;
    } catch (error) {
        console.error('❌ Docker is not running or not installed');
        console.error('Please start Docker Desktop or install Docker');
        return false;
    }
}

async function isVaultContainerRunning() {
    try {
        const { stdout } = await runCommand(`docker ps --format 'table {{.Names}}' | grep '^${VAULT_CONTAINER_NAME}$'`);
        return stdout.trim() === VAULT_CONTAINER_NAME;
    } catch (error) {
        return false;
    }
}

async function isVaultContainerExists() {
    try {
        const { stdout } = await runCommand(`docker ps -a --format 'table {{.Names}}' | grep '^${VAULT_CONTAINER_NAME}$'`);
        return stdout.trim() === VAULT_CONTAINER_NAME;
    } catch (error) {
        return false;
    }
}

async function startVaultContainer() {
    const containerExists = await isVaultContainerExists();
    
    if (containerExists) {
        console.log('🔄 Starting existing Vault container...');
        await runCommand(`docker start ${VAULT_CONTAINER_NAME}`);
    } else {
        console.log('🚀 Creating and starting new Vault container...');
        await runCommand(`docker run -d \
            --name ${VAULT_CONTAINER_NAME} \
            --cap-add=IPC_LOCK \
            -p 8200:8200 \
            -e 'VAULT_DEV_ROOT_TOKEN_ID=myroot' \
            -e 'VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200' \
            hashicorp/vault:latest`);
    }
}

async function waitForVaultReady() {
    console.log('⏳ Waiting for Vault to be ready...');
    const maxAttempts = 30;
    let attempt = 1;
    
    while (attempt <= maxAttempts) {
        try {
            await runCommand(`curl -s ${VAULT_ADDR}/v1/sys/health`);
            console.log('✅ Vault is ready!');
            return true;
        } catch (error) {
            if (attempt >= maxAttempts) {
                console.error(`❌ Vault failed to start after ${maxAttempts} attempts`);
                return false;
            }
            console.log(`⏳ Attempt ${attempt}/${maxAttempts}: Waiting for Vault...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempt++;
        }
    }
    return false;
}

async function isVaultUnsealed() {
    try {
        const { stdout } = await runCommand(`docker exec ${VAULT_CONTAINER_NAME} sh -c "VAULT_ADDR=${VAULT_ADDR} vault status"`);
        return stdout.includes('Sealed') && stdout.includes('false');
    } catch (error) {
        return false;
    }
}

async function unsealVault() {
    console.log('🔓 Unsealing vault with dev keys...');
    
    for (let i = 0; i < UNSEAL_KEYS.length; i++) {
        console.log(`🔑 Using unseal key ${i + 1}...`);
        try {
            await runCommand(`docker exec ${VAULT_CONTAINER_NAME} sh -c "VAULT_ADDR=${VAULT_ADDR} vault operator unseal ${UNSEAL_KEYS[i]}"`);
        } catch (error) {
            console.error(`❌ Failed to use unseal key ${i + 1}:`, error.message);
        }
    }
    
    // Verify vault is unsealed
    const unsealed = await isVaultUnsealed();
    if (unsealed) {
        console.log('✅ Vault successfully unsealed!');
        return true;
    } else {
        console.error('❌ Failed to unseal vault');
        return false;
    }
}

async function startVault() {
    console.log('🔐 Starting HashiCorp Vault in Docker...');
    
    try {
        // Check if Docker is running
        const dockerRunning = await checkDockerRunning();
        if (!dockerRunning) {
            process.exit(1);
        }
        
        // Check if Vault container is already running
        const isRunning = await isVaultContainerRunning();
        
        if (isRunning) {
            console.log('✅ Vault container is already running');
        } else {
            await startVaultContainer();
            
            // Wait for Vault to be ready
            const ready = await waitForVaultReady();
            if (!ready) {
                process.exit(1);
            }
        }
        
        // Export VAULT_ADDR for current session
        process.env.VAULT_ADDR = VAULT_ADDR;
        console.log(`📍 Set VAULT_ADDR=${VAULT_ADDR}`);
        
        // Check if vault is already unsealed
        console.log('🔍 Checking vault seal status...');
        const unsealed = await isVaultUnsealed();
        
        if (unsealed) {
            console.log('✅ Vault is already unsealed');
        } else {
            const unsealSuccess = await unsealVault();
            if (!unsealSuccess) {
                process.exit(1);
            }
        }
        
        console.log('');
        console.log('🎉 Vault is ready for use!');
        console.log('📋 Environment variables:');
        console.log(`   VAULT_ADDR=${VAULT_ADDR}`);
        console.log('   VAULT_TOKEN=myroot (for dev mode)');
        console.log('');
        console.log('💡 To use vault in your terminal session, run:');
        console.log(`   export VAULT_ADDR=${VAULT_ADDR}`);
        console.log('   export VAULT_TOKEN=myroot');
        
        return true;
        
    } catch (error) {
        console.error('❌ Failed to start Vault:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    startVault().catch(console.error);
}

module.exports = { startVault, VAULT_ADDR };
