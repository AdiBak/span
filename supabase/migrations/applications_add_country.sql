-- Country / region for applicants (international members).
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS country text;

COMMENT ON COLUMN public.applications.country IS 'Country or territory where the applicant is based (e.g. United States, Canada).';

-- Backfill legacy rows as US-based (state was required historically).
UPDATE public.applications
SET country = 'United States'
WHERE country IS NULL;

-- International applicants may not have a US-style state; state is optional when country is not United States at the app layer.
ALTER TABLE public.applications
  ALTER COLUMN state DROP NOT NULL;
