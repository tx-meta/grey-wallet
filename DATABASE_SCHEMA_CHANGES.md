# Database Schema Changes for Crypto Transaction System

## Updated Approach: Single Transactions Table

Instead of creating a separate `crypto_purchases` table, we'll extend the existing `transactions` table to handle all transaction types (ON_RAMP, OFF_RAMP, PAYMENT, TRANSFER, etc.).

## Database Schema Changes

### 1. Update `transactions` Table

```sql
-- Add new columns to existing transactions table
ALTER TABLE transactions 
ADD COLUMN transaction_type VARCHAR(20) NOT NULL DEFAULT 'TRANSFER',
ADD COLUMN fiat_amount DECIMAL(15,2),
ADD COLUMN crypto_amount DECIMAL(20,8),
ADD COLUMN exchange_rate DECIMAL(15,6),
ADD COLUMN platform_fee DECIMAL(15,2),
ADD COLUMN total_amount DECIMAL(15,2),
ADD COLUMN phone_number VARCHAR(20),
ADD COLUMN checkout_request_id VARCHAR(100),
ADD COLUMN merchant_request_id VARCHAR(100),
ADD COLUMN mpesa_receipt_number VARCHAR(50),
ADD COLUMN transaction_date TIMESTAMP,
ADD COLUMN status VARCHAR(20) DEFAULT 'pending';

-- Add indexes for performance
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_checkout_request_id ON transactions(checkout_request_id);
CREATE INDEX idx_transactions_user_id_type ON transactions(user_id, transaction_type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
```

### 2. Update `user_addresses` Table

Add a `tokenBalance` column to track user's crypto balance in the pooled wallet:

```sql
ALTER TABLE user_addresses 
ADD COLUMN tokenBalance DECIMAL(20,8) DEFAULT 0;

-- Index for balance queries
CREATE INDEX idx_user_addresses_token_balance ON user_addresses(userId, tokenSymbol, tokenBalance);
```

## Transaction Types

```typescript
export enum TransactionType {
  ON_RAMP = 'ON_RAMP',      // Fiat to Crypto (M-Pesa to BTC/ETH/etc.)
  OFF_RAMP = 'OFF_RAMP',    // Crypto to Fiat (BTC/ETH to M-Pesa)
  PAYMENT = 'PAYMENT',       // Merchant payments
  TRANSFER = 'TRANSFER',     // Internal transfers between users
  WITHDRAWAL = 'WITHDRAWAL', // Withdrawals to external wallets
  DEPOSIT = 'DEPOSIT'        // Deposits from external wallets
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}
```

## Repository Interface Updates

### Update `WalletRepository` interface:

```typescript
// Add these methods to src/domain/repositories/wallet-repository.ts

export interface Transaction {
  id: string;
  userId: string;
  transactionType: TransactionType;
  tokenSymbol: string;
  fiatAmount?: number;
  cryptoAmount?: number;
  exchangeRate?: number;
  platformFee?: number;
  totalAmount?: number;
  phoneNumber?: string;
  status: TransactionStatus;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  mpesaReceiptNumber?: string;
  transactionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransactionRequest {
  userId: string;
  transactionType: TransactionType;
  tokenSymbol: string;
  fiatAmount?: number;
  cryptoAmount?: number;
  exchangeRate?: number;
  platformFee?: number;
  totalAmount?: number;
  phoneNumber?: string;
  status: TransactionStatus;
}

export interface UpdateTransactionPaymentDetailsRequest {
  checkoutRequestId?: string;
  merchantRequestId?: string;
  mpesaReceiptNumber?: string;
  transactionDate?: Date;
  status: TransactionStatus;
}

export interface WalletRepository {
  // ... existing methods ...
  
  // New methods for transactions
  createTransaction(request: CreateTransactionRequest): Promise<string>;
  findTransactionByCheckoutId(checkoutRequestId: string): Promise<Transaction | null>;
  updateTransactionStatus(transactionId: string, status: TransactionStatus): Promise<void>;
  updateTransactionPaymentDetails(transactionId: string, details: UpdateTransactionPaymentDetailsRequest): Promise<void>;
  updateUserTokenBalance(userId: string, tokenSymbol: string, amount: number): Promise<void>;
  getUserTransactions(userId: string, type?: TransactionType, limit?: number, offset?: number): Promise<Transaction[]>;
  getTransactionById(transactionId: string): Promise<Transaction | null>;
}
```

## Prisma Schema Updates

### Update `prisma/schema.prisma`:

```prisma
enum TransactionType {
  ON_RAMP
  OFF_RAMP
  PAYMENT
  TRANSFER
  WITHDRAWAL
  DEPOSIT
}

enum TransactionStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}

model Transaction {
  id                    String           @id @default(uuid())
  userId                String
  transactionType       TransactionType  @default(TRANSFER)
  tokenSymbol           String
  fiatAmount            Decimal?         @db.Decimal(15, 2)
  cryptoAmount          Decimal?         @db.Decimal(20, 8)
  exchangeRate          Decimal?         @db.Decimal(15, 6)
  platformFee           Decimal?         @db.Decimal(15, 2)
  totalAmount           Decimal?         @db.Decimal(15, 2)
  phoneNumber           String?
  status                TransactionStatus @default(PENDING)
  checkoutRequestId     String?
  merchantRequestId     String?
  mpesaReceiptNumber    String?
  transactionDate       DateTime?
  createdAt             DateTime         @default(now())
  updatedAt             DateTime         @updatedAt

  user                  User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([transactionType])
  @@index([status])
  @@index([checkoutRequestId])
  @@index([userId, transactionType])
  @@index([createdAt])
}

// Update UserAddress model
model UserAddress {
  // ... existing fields ...
  tokenBalance          Decimal  @default(0) @db.Decimal(20, 8)
  
  // ... existing relations ...
}

// Update User model
model User {
  // ... existing fields ...
  transactions          Transaction[]
}
```

## Benefits of This Approach

### 1. **Scalability**
- Single table handles all transaction types
- Easy to add new transaction types without schema changes
- Consistent data structure across all transaction types

### 2. **Analytics & Reporting**
- Unified view of all user transactions
- Easy to generate reports by transaction type
- Better data consistency for analytics

### 3. **Maintenance**
- Single table to maintain and backup
- Consistent indexing strategy
- Easier to implement transaction history

### 4. **Flexibility**
- Can handle future transaction types (staking, rewards, etc.)
- Supports complex transaction flows
- Better for audit trails

## Updated Use Cases

### Update `InitiateCryptoPurchaseUseCase`:

```typescript
// Change from createPurchase to createTransaction
const transactionId = await this.walletRepository.createTransaction({
  userId: request.userId,
  transactionType: TransactionType.ON_RAMP,
  tokenSymbol: request.tokenSymbol,
  fiatAmount: request.fiatAmount,
  cryptoAmount,
  exchangeRate,
  platformFee,
  totalAmount,
  phoneNumber: request.phoneNumber,
  status: TransactionStatus.PENDING
});
```

### Update `ProcessPaymentCallbackUseCase`:

```typescript
// Change from findPurchaseByCheckoutId to findTransactionByCheckoutId
const transaction = await this.walletRepository.findTransactionByCheckoutId(request.checkoutRequestId);
```

## Migration Steps

1. **Create the migration:**
   ```bash
   npx prisma migrate dev --name update_transactions_table
   ```

2. **Update the repository implementations:**
   - Update `PrismaWalletRepository` to implement the new methods
   - Update `MockWalletRepository` for testing

3. **Update the use cases:**
   - Change all references from `purchase` to `transaction`
   - Update method names and interfaces

4. **Update the container:**
   - Add `PaymentController` to the container
   - Add `MpesaPaymentService` to the container

5. **Update the main app:**
   - Add payment routes to `index.ts`

## Environment Variables

Add these to your `.env` file:

```env
# M-Pesa Daraja API Configuration
DARAJA_CONSUMER_KEY=your_consumer_key_here
DARAJA_CONSUMER_SECRET=your_consumer_secret_here
DARAJA_BUSINESS_SHORTCODE=your_business_shortcode
DARAJA_PASSKEY=your_passkey_here
DARAJA_ENVIRONMENT=sandbox  # or production

# API Base URL for callbacks
API_BASE_URL=http://localhost:3000
```

## Security Considerations

1. **Input Validation:** All amounts are validated before processing
2. **Phone Number Formatting:** Automatic formatting for M-Pesa compatibility
3. **Payment Verification:** Double verification with M-Pesa API
4. **Audit Trail:** All transactions are logged with timestamps
5. **Rate Limiting:** Implement rate limiting on transaction endpoints
6. **Amount Limits:** Enforced minimum and maximum transaction amounts
7. **Transaction Isolation:** Proper database transaction handling 