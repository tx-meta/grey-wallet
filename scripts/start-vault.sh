#!/bin/bash

# Script to start and unseal HashiCorp Vault in Docker for development
# This script will:
# 1. Check if Vault container is already running
# 2. Start Vault in Docker if not running
# 3. Export VAULT_ADDR environment variable
# 4. Unseal the vault with the provided dev keys

set -e

VAULT_CONTAINER_NAME="vault"
VAULT_ADDR="http://127.0.0.1:8200"

echo "🔐 Starting HashiCorp Vault in Docker..."

# Check if Vault container is already running
if docker ps --format 'table {{.Names}}' | grep -q "^${VAULT_CONTAINER_NAME}$"; then
    echo "✅ Vault container is already running"
else
    # Check if Vault container exists but is stopped
    if docker ps -a --format 'table {{.Names}}' | grep -q "^${VAULT_CONTAINER_NAME}$"; then
        echo "🔄 Starting existing Vault container..."
        docker start ${VAULT_CONTAINER_NAME}
    else
        echo "🚀 Creating and starting new Vault container..."
        docker run -d \
            --name ${VAULT_CONTAINER_NAME} \
            --cap-add=IPC_LOCK \
            -p 8200:8200 \
            -e 'VAULT_DEV_ROOT_TOKEN_ID=myroot' \
            -e 'VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200' \
            hashicorp/vault:latest
    fi
    
    # Wait for Vault to be ready
    echo "⏳ Waiting for Vault to be ready..."
    sleep 5
    
    # Check if Vault is responding
    max_attempts=30
    attempt=1
    while ! curl -s ${VAULT_ADDR}/v1/sys/health > /dev/null; do
        if [ $attempt -ge $max_attempts ]; then
            echo "❌ Vault failed to start after ${max_attempts} attempts"
            exit 1
        fi
        echo "⏳ Attempt ${attempt}/${max_attempts}: Waiting for Vault..."
        sleep 2
        ((attempt++))
    done
    
    echo "✅ Vault is ready!"
fi

# Export VAULT_ADDR for current session
export VAULT_ADDR=${VAULT_ADDR}
echo "📍 Exported VAULT_ADDR=${VAULT_ADDR}"

# Check if vault is already unsealed
echo "🔍 Checking vault seal status..."
if docker exec ${VAULT_CONTAINER_NAME} sh -c "VAULT_ADDR=${VAULT_ADDR} vault status" | grep -q "Sealed.*false"; then
    echo "✅ Vault is already unsealed"
else
    echo "🔓 Unsealing vault with dev keys..."
    
    # Unseal vault with the three keys
    echo "🔑 Using unseal key 1..."
    docker exec ${VAULT_CONTAINER_NAME} sh -c "VAULT_ADDR=${VAULT_ADDR} vault operator unseal JLjFN88Ea3nSsA8Rsl4aDUo0xgPQ5HGOgJnhc80hf0qV"
    
    echo "🔑 Using unseal key 2..."
    docker exec ${VAULT_CONTAINER_NAME} sh -c "VAULT_ADDR=${VAULT_ADDR} vault operator unseal 2ueLDqsMJ1wVkSTaBTXzPiSaq92x1pOdGLpsLxEjozHQ"
    
    echo "🔑 Using unseal key 3..."
    docker exec ${VAULT_CONTAINER_NAME} sh -c "VAULT_ADDR=${VAULT_ADDR} vault operator unseal 0xe1bMfZ571+lwmDVOotd2PQba1F4Bmtg0LeXp/dLV+6"
    
    # Verify vault is unsealed
    if docker exec ${VAULT_CONTAINER_NAME} sh -c "VAULT_ADDR=${VAULT_ADDR} vault status" | grep -q "Sealed.*false"; then
        echo "✅ Vault successfully unsealed!"
    else
        echo "❌ Failed to unseal vault"
        exit 1
    fi
fi

echo ""
echo "🎉 Vault is ready for use!"
echo "📋 Environment variables:"
echo "   VAULT_ADDR=${VAULT_ADDR}"
echo "   VAULT_TOKEN=myroot (for dev mode)"
echo ""
echo "💡 To use vault in your terminal session, run:"
echo "   export VAULT_ADDR=${VAULT_ADDR}"
echo "   export VAULT_TOKEN=myroot"
