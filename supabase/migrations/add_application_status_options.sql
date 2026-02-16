-- Migration: Add 'under_review' and 'contacted' status options to applications table
-- This allows executive directors to track which applicants they have contacted

-- Step 1: Drop the existing CHECK constraint if it exists
ALTER TABLE public.applications 
DROP CONSTRAINT IF EXISTS applications_status_check;

-- Step 2: Add new CHECK constraint with additional status options
ALTER TABLE public.applications
ADD CONSTRAINT applications_status_check 
CHECK (status IN ('pending', 'under_review', 'contacted', 'accepted', 'rejected'));

-- Step 3: Add comment to document the status values
COMMENT ON COLUMN public.applications.status IS 'Application status: pending (new), under_review (being reviewed), contacted (applicant has been contacted), accepted, rejected';
