-- Migration: Add detailed address fields to Ride and Customer models
-- Date: 2025-12-08
-- Description: Adds structured address fields (street, house number, city, postcode)
--              to improve address precision and geocoding accuracy

-- ============================================================================
-- 1. Add address fields to Ride model
-- ============================================================================

-- Add GPS coordinates (extracted from JSON for easier querying)
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "pickupLat" DOUBLE PRECISION;
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "pickupLng" DOUBLE PRECISION;
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "dropoffLat" DOUBLE PRECISION;
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "dropoffLng" DOUBLE PRECISION;

-- Add detailed pickup address fields
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "pickupAddress" TEXT;
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "pickupStreet" TEXT;
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "pickupHouseNumber" TEXT;
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "pickupCity" TEXT;
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "pickupPostcode" TEXT;

-- Add detailed dropoff address fields
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "dropoffAddress" TEXT;
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "dropoffStreet" TEXT;
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "dropoffHouseNumber" TEXT;
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "dropoffCity" TEXT;
ALTER TABLE "Ride" ADD COLUMN IF NOT EXISTS "dropoffPostcode" TEXT;

-- Make JSON fields nullable (now optional, kept for backward compatibility)
ALTER TABLE "Ride" ALTER COLUMN "pickup" DROP NOT NULL;
ALTER TABLE "Ride" ALTER COLUMN "dropoff" DROP NOT NULL;

-- ============================================================================
-- 2. Add business address fields to Customer model
-- ============================================================================

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "businessAddress" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "businessStreet" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "businessHouseNumber" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "businessCity" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "businessPostcode" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "businessLat" DOUBLE PRECISION;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "businessLng" DOUBLE PRECISION;

-- ============================================================================
-- 3. Migrate existing data (if any rides exist with JSON addresses)
-- ============================================================================

-- Extract GPS coordinates from JSON pickup field
UPDATE "Ride"
SET
  "pickupLat" = CAST((pickup->>'lat') AS DOUBLE PRECISION),
  "pickupLng" = CAST((pickup->>'lng') AS DOUBLE PRECISION),
  "pickupAddress" = pickup->>'address'
WHERE pickup IS NOT NULL
  AND "pickupLat" IS NULL;

-- Extract GPS coordinates from JSON dropoff field
UPDATE "Ride"
SET
  "dropoffLat" = CAST((dropoff->>'lat') AS DOUBLE PRECISION),
  "dropoffLng" = CAST((dropoff->>'lng') AS DOUBLE PRECISION),
  "dropoffAddress" = dropoff->>'address'
WHERE dropoff IS NOT NULL
  AND "dropoffLat" IS NULL;

-- ============================================================================
-- 4. Add indexes for performance
-- ============================================================================

-- Indexes for geospatial queries (nearby rides, distance calculations)
CREATE INDEX IF NOT EXISTS "Ride_pickupLat_pickupLng_idx" ON "Ride"("pickupLat", "pickupLng");
CREATE INDEX IF NOT EXISTS "Ride_dropoffLat_dropoffLng_idx" ON "Ride"("dropoffLat", "dropoffLng");

-- Indexes for city-based searches
CREATE INDEX IF NOT EXISTS "Ride_pickupCity_idx" ON "Ride"("pickupCity");
CREATE INDEX IF NOT EXISTS "Ride_dropoffCity_idx" ON "Ride"("dropoffCity");
CREATE INDEX IF NOT EXISTS "Customer_businessCity_idx" ON "Customer"("businessCity");

-- ============================================================================
-- Notes:
-- ============================================================================
--
-- After running this migration:
-- 1. Run `npx prisma generate` to regenerate the Prisma Client
-- 2. Update frontend code to use new AddressAutocomplete component
-- 3. Update API code to accept and store detailed address fields
-- 4. Test ride creation with new address format
-- 5. Test business registration with address fields
--
-- Backward compatibility:
-- - Old rides with JSON addresses will continue to work
-- - New rides will use the structured fields
-- - JSON fields are kept for additional details (access notes, etc.)
