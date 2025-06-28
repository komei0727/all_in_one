-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('IN_STOCK', 'OUT_OF_STOCK', 'LOW_STOCK');

-- CreateEnum
CREATE TYPE "ExpiryStatus" AS ENUM ('FRESH', 'EXPIRING_SOON', 'EXPIRED');

-- AlterTable
ALTER TABLE "domain_events" ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "shopping_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "deviceType" TEXT,
    "location" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopping_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_session_items" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "ingredientName" TEXT NOT NULL,
    "stockStatus" "StockStatus" NOT NULL,
    "expiryStatus" "ExpiryStatus",
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "shopping_session_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shopping_sessions_userId_status_idx" ON "shopping_sessions"("userId", "status");

-- CreateIndex
CREATE INDEX "shopping_sessions_startedAt_idx" ON "shopping_sessions"("startedAt");

-- CreateIndex
CREATE INDEX "shopping_sessions_status_idx" ON "shopping_sessions"("status");

-- CreateIndex
CREATE INDEX "shopping_session_items_sessionId_idx" ON "shopping_session_items"("sessionId");

-- CreateIndex
CREATE INDEX "shopping_session_items_ingredientId_idx" ON "shopping_session_items"("ingredientId");

-- CreateIndex
CREATE INDEX "shopping_session_items_checkedAt_idx" ON "shopping_session_items"("checkedAt");

-- CreateIndex
CREATE INDEX "shopping_session_items_stockStatus_idx" ON "shopping_session_items"("stockStatus");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_session_items_sessionId_ingredientId_key" ON "shopping_session_items"("sessionId", "ingredientId");

-- CreateIndex
CREATE INDEX "domain_events_published_idx" ON "domain_events"("published");

-- CreateIndex
CREATE INDEX "domain_events_userId_eventType_idx" ON "domain_events"("userId", "eventType");

-- CreateIndex
CREATE INDEX "ingredients_userId_categoryId_deletedAt_idx" ON "ingredients"("userId", "categoryId", "deletedAt");

-- CreateIndex
CREATE INDEX "ingredients_quantity_threshold_idx" ON "ingredients"("quantity", "threshold");

-- CreateIndex
CREATE INDEX "ingredients_updatedAt_idx" ON "ingredients"("updatedAt");

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "domain_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_sessions" ADD CONSTRAINT "shopping_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "domain_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_session_items" ADD CONSTRAINT "shopping_session_items_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "shopping_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_session_items" ADD CONSTRAINT "shopping_session_items_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
