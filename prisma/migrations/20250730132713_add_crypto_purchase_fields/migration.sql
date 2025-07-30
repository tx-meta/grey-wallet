-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "checkoutRequestId" TEXT,
ADD COLUMN     "cryptoAmount" DOUBLE PRECISION,
ADD COLUMN     "exchangeRate" DOUBLE PRECISION,
ADD COLUMN     "fiatAmount" DOUBLE PRECISION,
ADD COLUMN     "merchantRequestId" TEXT,
ADD COLUMN     "mpesaReceiptNumber" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "platformFee" DOUBLE PRECISION,
ADD COLUMN     "tokenSymbol" TEXT,
ADD COLUMN     "totalAmount" DOUBLE PRECISION,
ADD COLUMN     "transactionDate" TIMESTAMP(3),
ADD COLUMN     "transactionType" TEXT,
ADD COLUMN     "userId" TEXT;
