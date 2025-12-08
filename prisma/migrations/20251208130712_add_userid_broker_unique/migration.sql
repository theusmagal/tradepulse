/*
  Warnings:

  - A unique constraint covering the columns `[userId,broker]` on the table `BrokerAccount` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ApiKey" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "BrokerAccount_userId_broker_key" ON "BrokerAccount"("userId", "broker");
