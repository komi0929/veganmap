-- Add geolocation columns to restaurants table
ALTER TABLE restaurants
ADD COLUMN latitude double precision,
ADD COLUMN longitude double precision;
