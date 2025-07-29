# HashiCorp Vault Integration

This document explains how to set up and use HashiCorp Vault with the Grey Wallet pooled wallet system.

## Overview

The Grey Wallet system uses HashiCorp Vault to securely store:
- **Wallet Mnemonics**: Encrypted mnemonics for each supported token (BTC, ETH, ADA, SOL)
- **User Mnemonics**: Individual user mnemonics (for backward compatibility)
- **Verification Tokens**: Email and SMS verification tokens
- **Master Wallet Keys**: Master keys for each token
- **Wallet Keys**: Individual wallet keys and addresses

## Architecture

### Vault Storage Structure

```
HashiCorp Vault (KV v2)
├── secret/
│   ├── wallet-mnemonics/
│   │   ├── BTC → "encrypted_mnemonic_for_bitcoin_wallet"
│   │   ├── ETH → "encrypted_mnemonic_for_ethereum_wallet"
│   │   ├── ADA → "encrypted_mnemonic_for_cardano_wallet"
│   │   └── SOL → "encrypted_mnemonic_for_solana_wallet"
│   │
│   ├── user-mnemonics/
│   │   └── wallets/{userId} → "encrypted_user_mnemonic"
│   │
│   ├── verification-tokens/
│   │   └── {userId}/{type} → "verification_token"
│   │
│   ├── master-keys/
│   │   └── {tokenSymbol} → "master_wallet_private_key"
│   │
│   └── wallet-keys/
│       └── {walletId}/{tokenSymbol} → "wallet_keys_array"
```

## Setup Instructions

### 1. Install HashiCorp Vault

#### Option A: Docker (Recommended for Development)
```bash
# Run Vault in development mode
docker run -d \
  --name vault-dev \
  -p 8200:8200 \
  -e VAULT_DEV_ROOT_TOKEN_ID=myroot \
  -e VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200 \
  vault:latest

# Set environment variables
export VAULT_URL=http://localhost:8200
export VAULT_TOKEN=myroot
```

#### Option B: Local Installation
```bash
# Download and install Vault
# Follow instructions at: https://developer.hashicorp.com/vault/docs/install

# Start Vault in development mode
vault server -dev -dev-root-token-id=myroot

# Set environment variables
export VAULT_URL=http://localhost:8200
export VAULT_TOKEN=myroot
```

### 2. Configure Environment Variables

Add to your `.env` file:
```env
# HashiCorp Vault Configuration
VAULT_URL=http://localhost:8200
VAULT_TOKEN=myroot
```

### 3. Initialize Vault

Run the setup script to initialize Vault for Grey Wallet:
```bash
npm run vault:setup
```

This script will:
- ✅ Test Vault connection
- ✅ Enable KV secrets engine (v2)
- ✅ Create initial path structure
- ✅ Create sample wallet mnemonics for testing

### 4. Test Vault Integration

Verify the setup is working:
```bash
npm run vault:test
```

## Usage

### Automatic Integration

The system automatically uses HashiCorp Vault when the following environment variables are set:
- `VAULT_URL`: Vault server URL
- `VAULT_TOKEN`: Vault authentication token

If these variables are not set, the system falls back to the mock Vault service.

### Manual Vault Operations

#### Store Wallet Mnemonic
```typescript
const vaultService = container.get<VaultService>('VaultService');

// Store encrypted mnemonic for BTC wallet
await vaultService.storeWalletMnemonic('BTC', encryptedMnemonic);
```

#### Retrieve Wallet Mnemonic
```typescript
// Get encrypted mnemonic for BTC wallet
const encryptedMnemonic = await vaultService.getWalletMnemonic('BTC');
```

#### Store Verification Token
```typescript
// Store email verification token
await vaultService.storeVerificationToken(userId, 'email', token);

// Store SMS verification token
await vaultService.storeVerificationToken(userId, 'sms', token);
```

#### Retrieve Verification Token
```typescript
// Get email verification token
const emailToken = await vaultService.getVerificationToken(userId, 'email');

// Get SMS verification token
const smsToken = await vaultService.getVerificationToken(userId, 'sms');
```

## Security Features

### 1. **Encryption at Rest**
- All mnemonics are encrypted using AES-256-GCM before storage
- Encryption key is derived from `WALLET_ENCRYPTION_SECRET`

### 2. **Access Control**
- Vault provides fine-grained access control
- Tokens can be scoped to specific paths
- Audit logging for all operations

### 3. **Secrets Management**
- Automatic key rotation capabilities
- Version history for all secrets
- Secure deletion of secrets

### 4. **Network Security**
- TLS encryption for all communications
- Authentication via tokens
- Network policies and firewalls

## Production Deployment

### 1. **Vault Server Setup**
```bash
# Install Vault on production server
# Configure TLS certificates
# Set up authentication (LDAP, OIDC, etc.)
# Enable audit logging
```

### 2. **Environment Configuration**
```env
# Production Vault Configuration
VAULT_URL=https://vault.yourcompany.com
VAULT_TOKEN=your_production_token
VAULT_NAMESPACE=your_namespace  # If using Vault Enterprise
```

### 3. **Backup and Recovery**
```bash
# Backup Vault data
vault operator raft snapshot save backup.snap

# Restore from backup
vault operator raft snapshot restore backup.snap
```

### 4. **Monitoring**
- Set up Vault metrics collection
- Configure alerts for:
  - Failed authentication attempts
  - High error rates
  - Storage usage
  - Token expiration

## Troubleshooting

### Common Issues

#### 1. **Connection Refused**
```bash
# Check if Vault is running
curl http://localhost:8200/v1/sys/health

# Check Docker container
docker ps | grep vault
```

#### 2. **Authentication Failed**
```bash
# Verify token is correct
export VAULT_TOKEN=your_token
vault login

# Check token permissions
vault token lookup
```

#### 3. **KV Engine Not Enabled**
```bash
# Enable KV secrets engine
vault secrets enable -path=secret kv-v2
```

#### 4. **Permission Denied**
```bash
# Check token policies
vault token lookup

# Create policy for Grey Wallet
vault policy write grey-wallet-policy -<<EOF
path "secret/data/wallet-mnemonics/*" {
  capabilities = ["create", "read", "update", "delete"]
}

path "secret/data/user-mnemonics/*" {
  capabilities = ["create", "read", "update", "delete"]
}

path "secret/data/verification-tokens/*" {
  capabilities = ["create", "read", "update", "delete"]
}

path "secret/data/master-keys/*" {
  capabilities = ["create", "read", "update", "delete"]
}

path "secret/data/wallet-keys/*" {
  capabilities = ["create", "read", "update", "delete"]
}
EOF
```

### Debug Mode

Enable debug logging:
```bash
export VAULT_LOG_LEVEL=debug
npm run vault:test
```

## API Reference

### VaultService Interface

```typescript
interface VaultService {
  // Wallet mnemonic management
  storeWalletMnemonic(tokenSymbol: string, encryptedMnemonic: string): Promise<void>;
  getWalletMnemonic(tokenSymbol: string): Promise<string | null>;
  deleteWalletMnemonic(tokenSymbol: string): Promise<void>;

  // User mnemonic management
  storeMnemonic(path: string, encryptedMnemonic: string): Promise<void>;
  getMnemonic(path: string): Promise<string | null>;
  deleteMnemonic(path: string): Promise<void>;

  // Verification token management
  storeVerificationToken(userId: string, type: 'email' | 'sms', token: string): Promise<void>;
  getVerificationToken(userId: string, type: 'email' | 'sms'): Promise<string | null>;
  deleteVerificationToken(userId: string, type: 'email' | 'sms'): Promise<void>;

  // Master wallet key management
  storeMasterWalletKey(tokenSymbol: string, privateKey: string): Promise<void>;
  getMasterWalletKey(tokenSymbol: string): Promise<string | null>;
  rotateMasterWalletKey(tokenSymbol: string): Promise<void>;

  // Health check
  isHealthy(): Promise<boolean>;
}
```

## Best Practices

### 1. **Token Management**
- Use short-lived tokens when possible
- Rotate tokens regularly
- Use different tokens for different environments

### 2. **Access Control**
- Follow principle of least privilege
- Use Vault policies to restrict access
- Regularly audit access permissions

### 3. **Monitoring**
- Monitor Vault performance metrics
- Set up alerts for critical events
- Log all Vault operations

### 4. **Backup**
- Regular backups of Vault data
- Test restore procedures
- Store backups securely

### 5. **Security**
- Use TLS for all communications
- Implement network segmentation
- Regular security audits

## Migration from Mock Service

To migrate from the mock Vault service to HashiCorp Vault:

1. **Set up HashiCorp Vault** (follow setup instructions above)
2. **Configure environment variables**
3. **Run setup script**: `npm run vault:setup`
4. **Test integration**: `npm run vault:test`
5. **Update application configuration**
6. **Deploy with real Vault service**

The system will automatically detect the Vault configuration and use the real service instead of the mock. 