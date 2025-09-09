-- Add Treasury System
CREATE TABLE "treasury_accounts" (
    "id" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "assetSymbol" TEXT NOT NULL,
    "balance" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "reservedBalance" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treasury_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "treasury_transactions" (
    "id" TEXT NOT NULL,
    "userTransactionId" TEXT,
    "treasuryAccountId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "balanceBefore" DECIMAL(20,8) NOT NULL,
    "balanceAfter" DECIMAL(20,8) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treasury_transactions_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "treasury_accounts_accountType_assetSymbol_key" ON "treasury_accounts"("accountType", "assetSymbol");
CREATE INDEX "treasury_transactions_userTransactionId_idx" ON "treasury_transactions"("userTransactionId");
CREATE INDEX "treasury_transactions_treasuryAccountId_idx" ON "treasury_transactions"("treasuryAccountId");

-- Foreign keys
ALTER TABLE "treasury_transactions" ADD CONSTRAINT "treasury_transactions_treasuryAccountId_fkey" FOREIGN KEY ("treasuryAccountId") REFERENCES "treasury_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "treasury_transactions" ADD CONSTRAINT "treasury_transactions_userTransactionId_fkey" FOREIGN KEY ("userTransactionId") REFERENCES "transactions"("transactionId") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed initial treasury accounts with specified balances
INSERT INTO "treasury_accounts" ("id", "accountType", "assetSymbol", "balance") VALUES
(gen_random_uuid(), 'FIAT', 'KES', 5000),
(gen_random_uuid(), 'FIAT', 'USD', 5000),
(gen_random_uuid(), 'CRYPTO', 'BTC', 1),
(gen_random_uuid(), 'CRYPTO', 'ETH', 5),
(gen_random_uuid(), 'CRYPTO', 'SOL', 12),
(gen_random_uuid(), 'CRYPTO', 'ADA', 2300),
(gen_random_uuid(), 'CRYPTO', 'USDT', 5000),
(gen_random_uuid(), 'CRYPTO', 'USDC', 5000);
