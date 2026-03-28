-- Applicant age (required on new submissions from the public form).
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS age integer;

COMMENT ON COLUMN public.applications.age IS 'Applicant age in years at time of application; required on join form.';

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_age_reasonable_chk;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_age_reasonable_chk
  CHECK (age IS NULL OR (age >= 13 AND age <= 120));
