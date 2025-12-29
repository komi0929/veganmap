-- Create restaurants table
create table restaurants (
  id uuid default gen_random_uuid() primary key,
  google_place_id text unique not null,
  name text not null,
  address text,
  photos text[],
  is_verified boolean default false,
  tags jsonb default '{}'::jsonb,
  last_synced_at timestamp with time zone,
  cached_reviews jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now()
);

-- Create reservations table
create type reservation_status as enum ('pending', 'confirmed', 'rejected');

create table reservations (
  id uuid default gen_random_uuid() primary key,
  restaurant_id uuid references restaurants(id) not null,
  user_email text not null,
  user_name text not null,
  user_lang text not null,
  dietary_request jsonb default '{}'::jsonb,
  status reservation_status default 'pending',
  owner_note text,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS)
alter table restaurants enable row level security;
alter table reservations enable row level security;

-- Policies (Public read for restaurants, strict for reservations)
create policy "Public restaurants are viewable by everyone"
  on restaurants for select
  using (true);

create policy "Users can insert reservations"
  on reservations for insert
  with check (true);
