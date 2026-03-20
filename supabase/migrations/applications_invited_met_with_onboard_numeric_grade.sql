-- Applications: rename pipeline statuses (invited, met_with, onboard) + internal numeric review score
-- Existing rows: under_review -> invited, contacted -> met_with
--
-- IMPORTANT: Drop the old CHECK before UPDATEs, or changing contacted -> met_with violates the old constraint.

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS numeric_grade NUMERIC(6, 3);

COMMENT ON COLUMN public.applications.numeric_grade IS 'Internal review score (decimals allowed, e.g. 1, 2.5). Not the applicant school grade.';

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;

UPDATE public.applications SET status = 'invited' WHERE status = 'under_review';
UPDATE public.applications SET status = 'met_with' WHERE status = 'contacted';

ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN ('pending', 'invited', 'met_with', 'onboard', 'accepted', 'rejected'));

COMMENT ON COLUMN public.applications.status IS 'Application pipeline: pending, invited, met_with, onboard, accepted, rejected';
