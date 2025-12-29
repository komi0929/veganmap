-- Phase 4: SNS Smart Link Support
-- Add website column to store official site / instagram

ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS website TEXT;
