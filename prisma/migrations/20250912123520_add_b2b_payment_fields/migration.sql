-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "paymentDetails" JSONB,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "remarks" TEXT;
