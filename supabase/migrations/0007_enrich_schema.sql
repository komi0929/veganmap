-- Phase 2: Detail View Enrichment
-- Run this in Supabase SQL Editor

-- 1. Add photos column (JSONB array of strings/objects)
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

-- 2. Add price_level column (0-4)
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS price_level INTEGER;

-- 3. Add column for formatted phone number
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- 4. Add google_maps_uri (direct link)
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS google_maps_uri TEXT;

-- 5. Create index for price filtering
CREATE INDEX IF NOT EXISTS idx_restaurants_price 
ON restaurants (price_level);
