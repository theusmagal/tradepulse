/*
  Warnings:

  - You are about to alter the column `realizedPnl` on the `Execution` table. The data in that column could be lost. The data in that column will be cast from `Decimal(18,2)` to `Decimal(18,6)`.
  - A unique constraint covering the columns `[brokerAccountId,symbol,side,qty,price,execTime,fee,realizedPnl]` on the table `Execution` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Execution" ALTER COLUMN "realizedPnl" DROP NOT NULL,
ALTER COLUMN "realizedPnl" DROP DEFAULT,
ALTER COLUMN "realizedPnl" SET DATA TYPE DECIMAL(18,6);

-- CreateIndex
CREATE UNIQUE INDEX "Execution_brokerAccountId_symbol_side_qty_price_execTime_fe_key" ON "Execution"("brokerAccountId", "symbol", "side", "qty", "price", "execTime", "fee", "realizedPnl");
