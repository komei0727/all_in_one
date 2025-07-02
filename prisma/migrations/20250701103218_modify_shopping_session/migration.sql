/*
  Warnings:

  - You are about to drop the column `location` on the `shopping_sessions` table. All the data in the column will be lost.
  - The `deviceType` column on the `shopping_sessions` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('MOBILE', 'TABLET', 'DESKTOP');

-- AlterTable
ALTER TABLE "shopping_sessions" DROP COLUMN "location",
ADD COLUMN     "locationLat" DECIMAL(10,8),
ADD COLUMN     "locationLng" DECIMAL(11,8),
ADD COLUMN     "locationName" VARCHAR(100),
DROP COLUMN "deviceType",
ADD COLUMN     "deviceType" "DeviceType";

-- CreateIndex
CREATE INDEX "shopping_sessions_deviceType_idx" ON "shopping_sessions"("deviceType");

-- CreateIndex
CREATE INDEX "shopping_sessions_locationLat_locationLng_idx" ON "shopping_sessions"("locationLat", "locationLng");
