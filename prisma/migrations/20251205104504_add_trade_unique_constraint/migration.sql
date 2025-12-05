/*
  Warnings:

  - A unique constraint covering the columns `[brokerAccountId,symbol,side,closeTime,qty,netPnl]` on the table `Trade` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Trade_brokerAccountId_symbol_side_closeTime_qty_netPnl_key" ON "Trade"("brokerAccountId", "symbol", "side", "closeTime", "qty", "netPnl");
