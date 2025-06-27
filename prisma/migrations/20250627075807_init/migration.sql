-- CreateEnum
CREATE TYPE "StorageLocation" AS ENUM ('REFRIGERATED', 'FROZEN', 'ROOM_TEMPERATURE');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('COUNT', 'WEIGHT', 'VOLUME');

-- CreateEnum
CREATE TYPE "UserStatusType" AS ENUM ('ACTIVE', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "OperationType" AS ENUM ('CONSUME', 'REPLENISH', 'ADJUST');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "domain_users" (
    "id" TEXT NOT NULL,
    "nextAuthId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'ja',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',
    "theme" TEXT NOT NULL DEFAULT 'light',
    "notifications" BOOLEAN NOT NULL DEFAULT true,
    "emailFrequency" TEXT NOT NULL DEFAULT 'weekly',
    "status" "UserStatusType" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domain_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "type" "UnitType" NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "memo" TEXT,
    "price" DECIMAL(10,2),
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitId" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION,
    "storageLocationType" "StorageLocation" NOT NULL,
    "storageLocationDetail" TEXT,
    "bestBeforeDate" TIMESTAMP(3),
    "useByDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredient_stock_histories" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "operationType" "OperationType" NOT NULL,
    "quantityChange" DOUBLE PRECISION NOT NULL,
    "quantityBefore" DOUBLE PRECISION NOT NULL,
    "quantityAfter" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "operatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operatedBy" TEXT NOT NULL,

    CONSTRAINT "ingredient_stock_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_events" (
    "id" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "eventVersion" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "domain_users_nextAuthId_key" ON "domain_users"("nextAuthId");

-- CreateIndex
CREATE UNIQUE INDEX "domain_users_email_key" ON "domain_users"("email");

-- CreateIndex
CREATE INDEX "domain_users_nextAuthId_idx" ON "domain_users"("nextAuthId");

-- CreateIndex
CREATE INDEX "domain_users_email_idx" ON "domain_users"("email");

-- CreateIndex
CREATE INDEX "domain_users_status_idx" ON "domain_users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "categories_displayOrder_idx" ON "categories"("displayOrder");

-- CreateIndex
CREATE INDEX "categories_isActive_idx" ON "categories"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "units_symbol_key" ON "units"("symbol");

-- CreateIndex
CREATE INDEX "units_type_idx" ON "units"("type");

-- CreateIndex
CREATE INDEX "units_displayOrder_idx" ON "units"("displayOrder");

-- CreateIndex
CREATE INDEX "units_isActive_idx" ON "units"("isActive");

-- CreateIndex
CREATE INDEX "ingredients_userId_idx" ON "ingredients"("userId");

-- CreateIndex
CREATE INDEX "ingredients_categoryId_idx" ON "ingredients"("categoryId");

-- CreateIndex
CREATE INDEX "ingredients_deletedAt_idx" ON "ingredients"("deletedAt");

-- CreateIndex
CREATE INDEX "ingredients_userId_name_deletedAt_idx" ON "ingredients"("userId", "name", "deletedAt");

-- CreateIndex
CREATE INDEX "ingredients_bestBeforeDate_useByDate_idx" ON "ingredients"("bestBeforeDate", "useByDate");

-- CreateIndex
CREATE INDEX "ingredients_storageLocationType_idx" ON "ingredients"("storageLocationType");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_userId_name_bestBeforeDate_useByDate_storageLoc_key" ON "ingredients"("userId", "name", "bestBeforeDate", "useByDate", "storageLocationType", "storageLocationDetail", "deletedAt");

-- CreateIndex
CREATE INDEX "ingredient_stock_histories_ingredientId_operatedAt_idx" ON "ingredient_stock_histories"("ingredientId", "operatedAt");

-- CreateIndex
CREATE INDEX "ingredient_stock_histories_operationType_operatedAt_idx" ON "ingredient_stock_histories"("operationType", "operatedAt");

-- CreateIndex
CREATE INDEX "domain_events_aggregateId_aggregateType_occurredAt_idx" ON "domain_events"("aggregateId", "aggregateType", "occurredAt");

-- CreateIndex
CREATE INDEX "domain_events_eventType_occurredAt_idx" ON "domain_events"("eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "domain_events_correlationId_idx" ON "domain_events"("correlationId");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_users" ADD CONSTRAINT "domain_users_nextAuthId_fkey" FOREIGN KEY ("nextAuthId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingredient_stock_histories" ADD CONSTRAINT "ingredient_stock_histories_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
