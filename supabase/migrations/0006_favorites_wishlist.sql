-- Phase 1: Smart Wishlist Database Schema
-- Run this in Supabase SQL Editor

-- 1. Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate saves
    UNIQUE(user_id, restaurant_id)
);

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_restaurant_id ON favorites(restaurant_id);

-- 3. Enable Row Level Security
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies - Users can only manage their own favorites
CREATE POLICY "Users can view their own favorites"
    ON favorites FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorites"
    ON favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorites"
    ON favorites FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Add inquiry_type to reservations for bulk inquiry support
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS inquiry_type TEXT DEFAULT 'reservation' 
CHECK (inquiry_type IN ('reservation', 'inquiry_only', 'walkin_support'));

-- 6. Add last_inquiry_at to track spam prevention
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS last_inquiry_at TIMESTAMPTZ;
