-- Add RLS policies for owner dashboard
-- Run this in Supabase SQL Editor

-- Allow reading reservations for owner dashboard (simplified - no auth for MVP)
create policy "Allow reading reservations for dashboard"
  on reservations for select
  using (true);

-- Allow updating reservation status
create policy "Allow updating reservation status"
  on reservations for update
  using (true)
  with check (true);

-- Allow updating restaurants
create policy "Allow updating restaurants"
  on restaurants for update
  using (true)
  with check (true);
