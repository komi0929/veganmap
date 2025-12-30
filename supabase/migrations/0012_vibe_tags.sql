-- Phase 5 Part 2: Vibe Search
-- Add columns to store AI-generated atmosphere tags

ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS vibe_tags TEXT[]; -- ['romantic', 'lively', 'work_friendly']
