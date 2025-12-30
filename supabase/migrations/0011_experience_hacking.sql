-- Phase 5: Experience Hacking - Local vs Tourist Analysis
-- Add columns to store the ratio of local (Japanese) reviews

ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS local_ratio FLOAT, -- 0.0 to 1.0 (1.0 = All Japanese)
ADD COLUMN IF NOT EXISTS total_reviews_analyzed INTEGER DEFAULT 0;

-- Additional column for the AI Honest Summary (Phase 5 Part 2)
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS ai_summary JSONB; -- { pros: string[], cons: string[], tips: string[] }
