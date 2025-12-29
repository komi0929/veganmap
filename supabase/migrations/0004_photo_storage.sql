-- Create storage bucket for restaurant photos
-- Run this in Supabase SQL Editor or use the Supabase Dashboard

-- Note: You may need to create this bucket via the Supabase Dashboard:
-- 1. Go to Storage > Create bucket
-- 2. Name: restaurant-photos
-- 3. Public: Yes
-- 4. File size limit: 5MB
-- 5. Allowed MIME types: image/*

-- Storage policies (create these after making the bucket)
-- Allow public to read photos
insert into storage.policies (bucket_id, name, definition)
values (
    'restaurant-photos',
    'Public Access',
    '{"allowedOperations":["SELECT"]}'
) on conflict do nothing;

-- Allow authenticated users to upload
insert into storage.policies (bucket_id, name, definition)
values (
    'restaurant-photos',
    'Authenticated Upload',
    '{"allowedOperations":["INSERT"],"match":{"authenticated":true}}'
) on conflict do nothing;
