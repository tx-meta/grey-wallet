# Pooled Wallet Implementation

This document explains the **Pooled Wallet System** implementation for Grey Wallet, where there's only one wallet per supported token, and each user gets a derived address from that shared wallet's mnemonic.

## Overview

Instead of creating a new wallet for each user, the system maintains **one wallet per supported token**. Each user gets a **unique address** derived from the shared wallet's mnemonic using BIP44 hierarchical deterministic (HD) wallet principles.

## Architecture

### 1. Pooled Wallet Structure

```
Supported Tokens: [BTC, ETH, ADA, SOL]
     ↓
Pooled Wallets: [BTC Wallet, ETH Wallet, ADA Wallet, SOL Wallet]
     ↓
User Addresses: [User1_BTC_Addr, User1_ETH_Addr, User1_ADA_Addr, User1_SOL_Addr]
```

### 2. Database Schema

```sql
-- One wallet per token
model Wallet {
    walletId      String   @id @default(uuid())
    tokenSymbol   String   @unique // One wallet per token
    walletBalance Float    @default(0)
    createdAt     DateTime @default(now())
    updatedAt     DateTime @updatedAt

    // Relations
    userAddresses UserAddress[]
    AddressCounter AddressCounter[]
}

-- User addresses linked to pooled wallets
model UserAddress {
    id           String   @id @default(uuid())
    userId       String
    walletId     String
    address      String
    tokenBalance Float    @default(0)
    createdAt    DateTime @default(now())
    updatedAt    DateTime @updatedAt

    // Relations
    user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
    wallet Wallet @relation(fields: [walletId], references: [walletId], onDelete: Cascade)

    @@unique([userId, walletId])
}

-- Address index counter per wallet
model AddressCounter {
    walletId    String
    nextIndex   Int      @default(0)
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt

    // Relations
    wallet Wallet @relation(fields: [walletId], references: [walletId], onDelete: Cascade)

    @@id([walletId])
}
```

## Implementation Flow

### 1. User Sign-Up Process

```typescript
async execute(request: SignUpRequest): Promise<SignUpResult> {
  // 1. Validate input
  this.validateSignUpRequest(request);

  // 2. Sign up user with Supabase Auth
  const { user: supabaseUser, error: authError, isNewUser } = 
    await this.supabaseAuthService.signUp(signUpData);

  // 3. Get supported tokens
  const supportedTokens = await this.tokenRepository.findActiveTokens();

  // 4. Create user addresses from pooled wallets
  const userAddresses = await this.createUserAddressesFromPooledWallets(supabaseUser.id, supportedTokens);

  // 5. Send welcome notifications
  await this.sendWelcomeNotifications(supabaseUser, signUpData);

  return { success: true, data: responseData };
}
```

### 2. Pooled Wallet Address Creation

```typescript
private async createUserAddressesFromPooledWallets(userId: string, tokens: SupportedToken[]): Promise<{ tokenSymbol: string; address: string }[]> {
  const network = (process.env['WALLET_NETWORK'] === 'mainnet' ? 'mainnet' : 'testnet') as 'mainnet' | 'testnet';
  const userAddresses = [];

  for (const token of tokens) {
    // 1. Get or create the pooled wallet for this token
    let wallet = await this.walletRepository.findByTokenSymbol(token.symbol);
    
    if (!wallet) {
      // Create new pooled wallet for this token
      wallet = Wallet.create(token.symbol);
      wallet = await this.walletRepository.save(wallet);
      
      // Generate and store mnemonic for this wallet
      const mnemonic = generateMnemonic();
      const { encrypted, iv, tag } = encryptMnemonic(mnemonic, secret);
      const encryptedMnemonic = JSON.stringify({ encrypted, iv, tag });
      
      // Store in vault with token symbol as key
      await this.vaultService.storeWalletMnemonic(token.symbol, encryptedMnemonic);
    }

    // 2. Get the mnemonic for this wallet from vault
    const encryptedMnemonic = await this.vaultService.getWalletMnemonic(token.symbol);
    if (!encryptedMnemonic) {
      throw new Error(`No mnemonic found for token: ${token.symbol}`);
    }

    // 3. Decrypt the mnemonic
    const { encrypted, iv, tag } = JSON.parse(encryptedMnemonic);
    const mnemonic = decryptMnemonic(encrypted, iv, tag, secret);

    // 4. Get the next address index for this wallet
    const accountIndex = await this.walletRepository.getAndIncrementAddressIndex(wallet.walletId);
    
    // 5. Derive the address using the strategy
    const strategy = getDerivationStrategy(token.symbol);
    const address = await strategy.deriveAddress(mnemonic, token, network, accountIndex);
    
    // 6. Save the user address
    await this.walletRepository.addUserAddress(userId, wallet.walletId, address);
    
    userAddresses.push({
      tokenSymbol: token.symbol,
      address,
    });
  }

  return userAddresses;
}
```

## Key Features

### 1. **Pooled Wallet Management**
- **One wallet per token**: BTC, ETH, ADA, SOL each have their own wallet
- **Shared mnemonics**: Each wallet has one mnemonic stored in HashiCorp Vault
- **Deterministic addresses**: All addresses derived from the same mnemonic

### 2. **Address Index Management**
- **Per-wallet counter**: Each wallet has its own address index counter
- **Atomic operations**: Prevents race conditions during address assignment
- **Sequential assignment**: User 1 gets index 0, User 2 gets index 1, etc.

### 3. **Security**
- **Encrypted mnemonics**: AES-256-GCM encryption for vault storage
- **Vault integration**: Enterprise-grade secure storage
- **No private keys in DB**: Only addresses stored in application database

### 4. **Scalability**
- **Efficient storage**: One mnemonic per token instead of per user
- **Fast address generation**: Deterministic derivation from existing mnemonics
- **Easy management**: Centralized wallet management per token

## Address Derivation Examples

### Bitcoin Wallet (BTC)
```
Mnemonic: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
Wallet ID: "btc-wallet-001"
User 1: Index 0 → Address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
User 2: Index 1 → Address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
User 3: Index 2 → Address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
```

### Ethereum Wallet (ETH)
```
Mnemonic: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
Wallet ID: "eth-wallet-001"
User 1: Index 0 → Address: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
User 2: Index 1 → Address: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b7"
User 3: Index 2 → Address: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b8"
```

## Vault Storage Structure

```
HashiCorp Vault:
├── wallets/
│   ├── BTC → "encrypted_mnemonic_for_bitcoin_wallet"
│   ├── ETH → "encrypted_mnemonic_for_ethereum_wallet"
│   ├── ADA → "encrypted_mnemonic_for_cardano_wallet"
│   └── SOL → "encrypted_mnemonic_for_solana_wallet"
```

## Database Structure

```
Database:
├── wallets (1 per token)
│   ├── BTC Wallet (ID: btc-wallet-001)
│   ├── ETH Wallet (ID: eth-wallet-001)
│   ├── ADA Wallet (ID: ada-wallet-001)
│   └── SOL Wallet (ID: sol-wallet-001)
│
├── user_addresses (1 per user per token)
│   ├── User1 → BTC Address
│   ├── User1 → ETH Address
│   ├── User1 → ADA Address
│   ├── User1 → SOL Address
│   ├── User2 → BTC Address
│   ├── User2 → ETH Address
│   └── ...
│
└── address_counters (1 per wallet)
    ├── BTC Wallet → nextIndex: 150
    ├── ETH Wallet → nextIndex: 150
    ├── ADA Wallet → nextIndex: 150
    └── SOL Wallet → nextIndex: 150
```

## Benefits

### 1. **Efficiency**
- **Reduced storage**: One mnemonic per token instead of per user
- **Faster setup**: No need to generate new mnemonics for each user
- **Simplified management**: Centralized wallet management

### 2. **Security**
- **Fewer secrets**: Only 4 mnemonics total (for 4 tokens) vs thousands
- **Better audit**: Easier to track and audit wallet operations
- **Reduced risk**: Fewer encryption keys to manage

### 3. **Scalability**
- **Unlimited users**: Can support millions of users with 4 wallets
- **Predictable costs**: Storage costs don't scale with user count
- **Easy backup**: Only 4 mnemonics to backup and secure

### 4. **Compliance**
- **Regulatory friendly**: Easier to comply with financial regulations
- **Audit trail**: Clear separation of user addresses
- **Risk management**: Centralized control over wallet operations

## Usage Example

```typescript
// User signs up
const signUpRequest = {
  email: 'user@example.com',
  phone: '+1234567890',
  password: 'securepassword',
  firstName: 'John',
  lastName: 'Doe',
  country: 'United States',
  currency: 'USD'
};

const result = await signUpUseCase.execute(signUpRequest);

// Result includes:
// - User account created in Supabase
// - Addresses derived from existing pooled wallets
// - Each address is unique and deterministic
// - Addresses stored in user_addresses table
```

## Response Format

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "country": "United States",
      "currency": "USD",
      "phone": "+1234567890",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "addresses": [
      {
        "tokenSymbol": "BTC",
        "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
      },
      {
        "tokenSymbol": "ETH",
        "address": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"
      },
      {
        "tokenSymbol": "ADA",
        "address": "addr1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
      },
      {
        "tokenSymbol": "SOL",
        "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
      }
    ],
    "requiresEmailConfirmation": true
  }
}
```

## Next Steps

1. **Implement real HashiCorp Vault integration**
2. **Add address balance monitoring**
3. **Implement transaction signing from pooled wallets**
4. **Add address validation and verification**
5. **Implement wallet recovery mechanisms**
6. **Add address rotation capabilities**
7. **Implement multi-signature support for pooled wallets** 