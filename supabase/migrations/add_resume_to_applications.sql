-- Migration: Add resume file field to applications table
-- This allows applicants to upload their resume

-- Add resume_file column to store the filename in storage
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS resume_file TEXT;

-- Add comment to document the field
COMMENT ON COLUMN public.applications.resume_file IS 'Filename of uploaded resume in applications-resumes storage bucket';
