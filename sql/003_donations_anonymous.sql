-- Add fields to support anonymous and named donations
-- Run this migration in Supabase SQL editor

ALTER TABLE public.contributions
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS donor_name TEXT,
ADD COLUMN IF NOT EXISTS donor_message TEXT;

-- Index for fetching recent donors
CREATE INDEX IF NOT EXISTS idx_contributions_campaign_created ON public.contributions(campaign_id, created_at DESC);

-- Ensure contributions have a default status of 'confirmed' for donationsa
ALTER TABLE public.contributions
ALTER COLUMN status SET DEFAULT 'confirmed';
