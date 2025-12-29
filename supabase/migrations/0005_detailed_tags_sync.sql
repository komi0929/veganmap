-- Phase 1: Database Schema Expansion
-- Run this in Supabase SQL Editor

-- 1. Add detailed dietary tags and sync columns to restaurants
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS dietary_tags JSONB DEFAULT '{
    "oriental_vegan": false,
    "alcohol_free": false,
    "nut_free": false,
    "soy_free": false,
    "halal": false,
    "kosher": false
}'::jsonb;

-- Ensure last_synced_at exists
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Ensure cached_reviews exists
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS cached_reviews JSONB DEFAULT '[]'::jsonb;

-- Add opening_hours column
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS opening_hours JSONB;

-- Add rating column
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1);

-- Add user_ratings_total column
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS user_ratings_total INTEGER;

-- 2. Update reservations table for detailed dietary requirements
ALTER TABLE reservations 
DROP COLUMN IF EXISTS dietary_request;

ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS dietary_requirements JSONB DEFAULT '{
    "vegan": false,
    "vegetarian": false,
    "gluten_free": false,
    "oriental_vegan": false,
    "alcohol_free": false,
    "nut_free": false,
    "soy_free": false,
    "allergies": null,
    "other": null
}'::jsonb;

-- 3. Create index for faster dietary filtering
CREATE INDEX IF NOT EXISTS idx_restaurants_dietary_tags 
ON restaurants USING gin (dietary_tags);

CREATE INDEX IF NOT EXISTS idx_restaurants_last_synced 
ON restaurants (last_synced_at);

-- 4. Add function to check if sync is needed (older than 72 hours)
CREATE OR REPLACE FUNCTION needs_sync(last_sync TIMESTAMPTZ)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN last_sync IS NULL OR (NOW() - last_sync) > INTERVAL '72 hours';
END;
$$ LANGUAGE plpgsql;
