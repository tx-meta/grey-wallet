-- DropIndex
DROP INDEX "treasury_transactions_treasuryAccountId_idx";

-- DropIndex
DROP INDEX "treasury_transactions_userTransactionId_idx";

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "originatorConversationId" TEXT;

-- AlterTable
ALTER TABLE "treasury_accounts" ALTER COLUMN "updatedAt" DROP DEFAULT;
