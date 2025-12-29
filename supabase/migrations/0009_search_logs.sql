-- Phase 4: Self-Evolution Loop
-- Track what users search for and what they click to "learn" new tags and trends

CREATE TABLE IF NOT EXISTS search_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    search_term TEXT NOT NULL,
    restaurant_id TEXT REFERENCES restaurants(id),
    clicked_at TIMESTAMPTZ DEFAULT NOW(),
    source TEXT DEFAULT 'list' -- 'list', 'map', 'gallery'
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_search_logs_term ON search_logs (search_term);
CREATE INDEX IF NOT EXISTS idx_search_logs_restaurant ON search_logs (restaurant_id);
