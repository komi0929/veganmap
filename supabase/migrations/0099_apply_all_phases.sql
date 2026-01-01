-- Apply all missing schema changes for 8-phase implementation
-- Run this in Supabase SQL Editor if columns are missing

-- Phase 1: Real Menu
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS real_menu JSONB DEFAULT '[]'::jsonb;

-- Phase 2/3: Photos array (already in initial schema)

-- Phase 4: Passive Tagging - Search logs
CREATE TABLE IF NOT EXISTS search_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    query TEXT NOT NULL,
    clicked_restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Phase 5: AI Summary and Vibe Tags
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS ai_summary JSONB,
ADD COLUMN IF NOT EXISTS vibe_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS local_ratio FLOAT,
ADD COLUMN IF NOT EXISTS total_reviews_analyzed INTEGER DEFAULT 0;

-- Phase 7/8: Social features
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, restaurant_id)
);

CREATE TABLE IF NOT EXISTS visits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, restaurant_id)
);

-- Additional columns for restaurants
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS dietary_tags JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS rating FLOAT,
ADD COLUMN IF NOT EXISTS user_ratings_total INTEGER,
ADD COLUMN IF NOT EXISTS opening_hours TEXT[],
ADD COLUMN IF NOT EXISTS price_level INTEGER,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS google_maps_uri TEXT;

-- Enable RLS on new tables
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- Policies for public access
CREATE POLICY IF NOT EXISTS "Search logs insert" ON search_logs FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Bookmarks public read" ON bookmarks FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Bookmarks user insert" ON bookmarks FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Bookmarks user delete" ON bookmarks FOR DELETE USING (true);
CREATE POLICY IF NOT EXISTS "Visits public read" ON visits FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Visits user insert" ON visits FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Visits user delete" ON visits FOR DELETE USING (true);
