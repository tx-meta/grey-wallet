/*
  Warnings:

  - You are about to drop the column `paymentDetails` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `remarks` on the `transactions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "paymentDetails",
DROP COLUMN "paymentMethod",
DROP COLUMN "remarks";
