-- Run this in Supabase SQL Editor if you hit:
--   ERROR: new row violates check constraint "applications_status_check"
-- (e.g. first migration ran UPDATEs before DROP, or the app writes met_with while the DB still has the old CHECK.)

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;

UPDATE public.applications SET status = 'invited' WHERE status = 'under_review';
UPDATE public.applications SET status = 'met_with' WHERE status = 'contacted';

ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN ('pending', 'invited', 'met_with', 'onboard', 'accepted', 'rejected'));
