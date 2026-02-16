-- Migration: Add LinkedIn and Instagram fields to applications table
-- These fields are optional and will NOT be imported to members table
-- They are only for application data collection

-- Add LinkedIn and Instagram columns to applications table
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT;

-- Add comments to document that these fields are application-only
COMMENT ON COLUMN public.applications.linkedin_url IS 'Optional LinkedIn URL from application. Not imported to members table.';
COMMENT ON COLUMN public.applications.instagram_url IS 'Optional Instagram URL from application. Not imported to members table.';
