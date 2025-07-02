-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExpiryStatus" ADD VALUE 'NEAR_EXPIRY';
ALTER TYPE "ExpiryStatus" ADD VALUE 'CRITICAL';

-- AlterEnum
ALTER TYPE "SessionStatus" ADD VALUE 'ABANDONED';
