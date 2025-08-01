# Vault Mnemonics Setup Guide

This guide explains how to populate HashiCorp Vault with real mnemonics for the Grey Wallet system.

## Prerequisites

1. **HashiCorp Vault** running and accessible
2. **Vault Token** with appropriate permissions
3. **wallet-mnemonics.json** file in the project root

## Setup Steps

### 1. Set Environment Variables

```bash
export VAULT_URL=http://localhost:8200  # or your Vault URL
export VAULT_TOKEN=your_vault_token_here
```

### 2. Initialize Vault (First Time Only)

```bash
npm run vault:setup
```

This script:
- Tests Vault connection
- Enables KV secrets engine
- Creates initial path structure
- Loads sample mnemonics (for testing)

### 3. Populate Real Mnemonics

```bash
npm run vault:populate
```

This script:
- Reads real mnemonics from `wallet-mnemonics.json`
- Validates JSON structure
- Stores them securely in HashiCorp Vault
- Verifies storage was successful
- Provides detailed summary

### 4. Test Vault Integration

```bash
npm run vault:test
```

This script:
- Tests Vault health
- Reads stored mnemonics
- Performs write/read operations
- Lists secrets

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Setup | `npm run vault:setup` | Initialize Vault for Grey Wallet |
| Populate | `npm run vault:populate` | Load real mnemonics into Vault |
| Test | `npm run vault:test` | Test Vault integration |

## Real Mnemonics Source

The real mnemonics are stored in `wallet-mnemonics.json`:

```json
{
  "BTC": "{\"encrypted\":\"...\",\"iv\":\"...\",\"tag\":\"...\"}",
  "ETH": "{\"encrypted\":\"...\",\"iv\":\"...\",\"tag\":\"...\"}",
  "ADA": "{\"encrypted\":\"...\",\"iv\":\"...\",\"tag\":\"...\"}",
  "SOL": "{\"encrypted\":\"...\",\"iv\":\"...\",\"tag\":\"...\"}"
}
```

## Vault Storage Structure

Mnemonics are stored in Vault at:
```
secret/data/wallet-mnemonics/{TOKEN_SYMBOL}
```

Each entry contains:
- `encryptedMnemonic`: The encrypted mnemonic string
- `createdAt`: Timestamp when stored
- `description`: Human-readable description
- `tokenSymbol`: Token symbol (BTC, ETH, etc.)
- `encrypted`: Whether the mnemonic is encrypted
- `hasIV`: Whether IV is present
- `hasTag`: Whether authentication tag is present

## Troubleshooting

### Common Issues

1. **VAULT_TOKEN not set**
   ```
   ❌ VAULT_TOKEN environment variable is required
   ```
   Solution: Set the environment variable

2. **Vault not accessible**
   ```
   ❌ Vault connection failed
   ```
   Solution: Check Vault URL and network connectivity

3. **KV secrets engine not enabled**
   ```
   ❌ KV secrets engine not enabled
   ```
   Solution: Run `npm run vault:setup` first

4. **Mnemonics file not found**
   ```
   ❌ Mnemonics file not found
   ```
   Solution: Ensure `wallet-mnemonics.json` exists in project root

## Security Notes

- Real mnemonics are already encrypted before storage
- Vault provides additional security layer
- Access is controlled by Vault tokens
- All operations are logged for audit purposes

## Next Steps

After successful population:

1. Start the application: `npm start`
2. Test user registration to verify wallet creation
3. Monitor Vault logs for any issues
4. Set up regular backups of Vault data
