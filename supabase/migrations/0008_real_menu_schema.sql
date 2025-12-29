-- Phase 1 of Google Symbiosis: Real Menu Data
-- Add a column to store menu items extracted from reviews

ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS real_menu JSONB DEFAULT '[]'::jsonb;

-- Example structure of real_menu:
-- [
--   { "name": "Avocado Toast", "score": 5, "source_reviews": ["..."] },
--   { "name": "Soy Latte", "score": 3, "source_reviews": ["..."] }
-- ]
