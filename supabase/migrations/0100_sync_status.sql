-- Phase A: Sync Status Tracking
-- Add sync_status column to track automatic sync progress

ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS sync_error TEXT,
ADD COLUMN IF NOT EXISTS sync_retry_count INTEGER DEFAULT 0;

-- Valid values for sync_status:
-- 'pending' - Not yet synced
-- 'processing' - Currently syncing
-- 'completed' - Successfully synced with all data
-- 'failed' - Failed after max retries

COMMENT ON COLUMN restaurants.sync_status IS 'Sync status: pending, processing, completed, failed';
COMMENT ON COLUMN restaurants.sync_error IS 'Last sync error message if failed';
COMMENT ON COLUMN restaurants.sync_retry_count IS 'Number of retry attempts';
