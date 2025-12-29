-- Seed data for restaurants table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

INSERT INTO restaurants (google_place_id, name, address, is_verified, tags, latitude, longitude)
VALUES 
  (
    'ChIJd18eMNqBQTURNrlLKF3l8GE',
    'Organic Kitchen Hakata',
    '福岡県福岡市博多区博多駅前2-1-1',
    true,
    '["vegan", "organic", "gluten-free"]'::jsonb,
    33.5902,
    130.4207
  ),
  (
    'ChIJgUbEo8cfqokR5lP9_Wh_DaM',
    'Green Cafe Tenjin',
    '福岡県福岡市中央区天神1-4-2',
    true,
    '["vegetarian", "gluten-free", "cafe"]'::jsonb,
    33.5897,
    130.3986
  ),
  (
    'ChIJ2eUgeAK6j4ARbn5u_wAGqWA',
    'Herbivore Nakasu',
    '福岡県福岡市博多区中洲3-7-24',
    false,
    '["vegan", "japanese"]'::jsonb,
    33.5937,
    130.4044
  ),
  (
    'ChIJN1t_tDeuEmsRUsoyG83frY4',
    'Vegan Deli Ohori',
    '福岡県福岡市中央区大濠公園1-2',
    true,
    '["vegan", "deli", "takeout"]'::jsonb,
    33.5867,
    130.3754
  ),
  (
    'ChIJrTLr-GyuEmsRBfy61i59si0',
    'Plant Based Kitchen',
    '福岡県福岡市早良区西新3-1-1',
    true,
    '["vegan", "organic", "lunch"]'::jsonb,
    33.5820,
    130.3577
  );
