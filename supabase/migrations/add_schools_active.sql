-- Add active column to schools (like partners)
-- Inactive schools are hidden from the homepage carousel

ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

COMMENT ON COLUMN public.schools.active IS 'When false, school is hidden from the homepage carousel';
