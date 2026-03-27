-- Run this in the Supabase SQL Editor to enable LIVE updates
-- This is NECESSARY for Realtime to work without manual reloads

-- SAFE "NON-STOP" REALTIME SCRIPT
-- This script will not fail if some tables are already added.

-- 1. Enable for Orders
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Enable for Table Management (CORRECTED NAMES)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_tables;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.dine_in_sessions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Enable for Delivery & Profiles
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_locations;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Enable for Notifications
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- VERIFY
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Verify if it's enabled
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
