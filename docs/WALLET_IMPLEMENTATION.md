# Wallet Implementation with Address Derivation

This document explains how the Grey Wallet implements multi-asset wallet creation with deterministic address derivation, based on the GreenLight Wallet approach.

## Overview

The wallet system creates a unique mnemonic for each user and derives addresses for all supported tokens using BIP44 hierarchical deterministic (HD) wallet principles. Each token gets its own address index counter, ensuring that the next user gets the next available address for each token.

## Architecture

### 1. Mnemonic Generation and Storage

```typescript
// Generate BIP39 mnemonic
const mnemonic = generateMnemonic();

// Encrypt with AES-256-GCM
const { encrypted, iv, tag } = encryptMnemonic(mnemonic, secret);

// Store in HashiCorp Vault
const vaultPath = `wallets/${userId}`;
await vaultService.storeMnemonic(vaultPath, encryptedMnemonic);
```

### 2. Address Derivation Strategies

Each blockchain has its own derivation strategy:

#### EVM Chains (Ethereum, Polygon, etc.)
```typescript
// Path: m/44'/60'/0'/0/accountIndex
const path = `m/44'/60'/0'/${networkNum}/${accountIndex}`;
const hdWallet = HDNodeWallet.fromMnemonic(Mnemonic.fromPhrase(mnemonic), path);
return hdWallet.address;
```

#### Bitcoin
```typescript
// Path: m/44'/0'/0'/0/accountIndex
const path = `m/44'/0'/0'/0/${accountIndex}`;
const child = root.derivePath(path);
const { address } = bitcoin.payments.p2pkh({ 
  pubkey: child.publicKey,
  network: bitcoinNetwork 
});
```

#### Cardano
```typescript
// Uses Lucid library for Cardano address derivation
const lucid = await Lucid(new Blockfrost(blockfrostUrl, apiKey), network);
lucid.selectWallet.fromSeed(mnemonic);
const address = await lucid.wallet().address();
```

#### Solana
```typescript
// Path: m/44'/501'/0'/0'/accountIndex'
const path = `m/44'/501'/0'/0'/${accountIndex}'`;
const keypair = Keypair.fromSeed(seed.slice(0, 32));
return keypair.publicKey.toString();
```

### 3. Address Index Management

Each wallet/token combination has its own address counter:

```sql
-- Database schema
model AddressCounter {
    walletId    String
    tokenSymbol String
    nextIndex   Int @default(0)
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt

    @@id([walletId, tokenSymbol])
}
```

```typescript
// Get and increment address index atomically
async getAndIncrementAddressIndex(walletId: string, tokenSymbol: string): Promise<number> {
  return await this.prisma.$transaction(async (tx) => {
    let counter = await tx.addressCounter.findUnique({
      where: { walletId_tokenSymbol: { walletId, tokenSymbol } },
    });
    
    if (!counter) {
      counter = await tx.addressCounter.create({
        data: { walletId, tokenSymbol, nextIndex: 1 },
      });
      return 0;
    }
    
    const currentIndex = counter.nextIndex;
    await tx.addressCounter.update({
      where: { walletId_tokenSymbol: { walletId, tokenSymbol } },
      data: { nextIndex: { increment: 1 } },
    });
    
    return currentIndex;
  });
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

  // 4. Create wallet with derived addresses for each token
  const wallet = await this.createWalletWithDerivedAddresses(supabaseUser.id, supportedTokens);

  // 5. Send welcome notifications
  await this.sendWelcomeNotifications(supabaseUser, signUpData);

  return { success: true, data: responseData };
}
```

### 2. Wallet Creation with Address Derivation

```typescript
private async createWalletWithDerivedAddresses(userId: string, tokens: SupportedToken[]): Promise<Wallet> {
  // 1. Generate and encrypt mnemonic
  const mnemonic = generateMnemonic();
  const { encrypted, iv, tag } = encryptMnemonic(mnemonic, secret);
  const encryptedMnemonic = JSON.stringify({ encrypted, iv, tag });
  
  // 2. Store in vault
  const vaultPath = `wallets/${userId}`;
  await this.vaultService.storeMnemonic(vaultPath, encryptedMnemonic);

  // 3. Create wallet
  const wallet = Wallet.create(userId, crypto.randomUUID());
  const savedWallet = await this.walletRepository.save(wallet);
  
  // 4. Determine network
  const network = (process.env['WALLET_NETWORK'] === 'mainnet' ? 'mainnet' : 'testnet');
  
  // 5. Derive addresses for each token
  const addresses = [];
  for (const token of tokens) {
    const strategy = getDerivationStrategy(token.symbol);
    if (!strategy) {
      throw new Error(`No derivation strategy for token: ${token.symbol}`);
    }
    
    // Get next address index
    const accountIndex = await this.walletRepository.getAndIncrementAddressIndex(
      savedWallet.walletId, 
      token.symbol
    );
    
    // Derive address
    const address = await strategy.deriveAddress(mnemonic, token, network, accountIndex);
    
    addresses.push({ address, tokenSymbol: token.symbol });
  }
  
  // 6. Save addresses
  await this.walletRepository.addAddresses(savedWallet.walletId, addresses);
  
  return await this.walletRepository.findById(savedWallet.walletId) || savedWallet;
}
```

## Key Features

### 1. Deterministic Address Generation
- Each user gets a unique mnemonic
- Addresses are derived deterministically using BIP44 paths
- Same mnemonic + path = same address

### 2. Address Index Management
- Each wallet/token combination has its own counter
- Next user gets the next available address for each token
- Atomic operations prevent race conditions

### 3. Multi-Asset Support
- Support for Bitcoin, Ethereum, Cardano, Solana
- Extensible strategy pattern for new blockchains
- Token-specific derivation paths

### 4. Security
- Mnemonics encrypted with AES-256-GCM
- Stored securely in HashiCorp Vault
- No private keys stored in application database

### 5. Network Flexibility
- Support for both mainnet and testnet
- Environment-based configuration
- Network-specific derivation paths

## Environment Configuration

```env
# Wallet Configuration
WALLET_ENCRYPTION_SECRET=your_wallet_encryption_secret_here_make_it_long_and_secure
WALLET_NETWORK=testnet

# Vault Configuration
VAULT_ENDPOINT=http://localhost:8200
VAULT_TOKEN=your_vault_token
VAULT_MOUNT_PATH=secret

# Blockchain APIs (for Cardano)
BLOCKFROST_API_KEY=your_blockfrost_api_key
```

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
// - Wallet created with unique mnemonic
// - Addresses derived for all supported tokens
// - Encrypted mnemonic stored in HashiCorp Vault
// - Address counters initialized for each token
```

## Benefits

1. **Scalability**: Each user gets unique addresses without conflicts
2. **Security**: Mnemonics encrypted and stored in enterprise vault
3. **Flexibility**: Easy to add new blockchains and tokens
4. **Recovery**: Deterministic derivation allows wallet recovery
5. **Compliance**: Enterprise-grade security practices
6. **Performance**: Efficient address generation and storage

## Next Steps

1. Implement real HashiCorp Vault integration
2. Add address balance monitoring
3. Implement transaction signing
4. Add address validation and verification
5. Implement wallet recovery mechanisms
6. Add address rotation capabilities 