-- Add owner authentication support
-- Run this in Supabase SQL Editor

-- Add owner_id to restaurants table
alter table restaurants add column if not exists owner_id uuid references auth.users(id);

-- Update RLS policies for owner-based access
drop policy if exists "Allow updating restaurants" on restaurants;
create policy "Owners can update their restaurants"
  on restaurants for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Allow reading reservations for dashboard" on reservations;
create policy "Owners can read reservations for their restaurants"
  on reservations for select
  using (
    restaurant_id in (
      select id from restaurants where owner_id = auth.uid()
    )
  );

drop policy if exists "Allow updating reservation status" on reservations;
create policy "Owners can update reservations for their restaurants"
  on reservations for update
  using (
    restaurant_id in (
      select id from restaurants where owner_id = auth.uid()
    )
  )
  with check (
    restaurant_id in (
      select id from restaurants where owner_id = auth.uid()
    )
  );
