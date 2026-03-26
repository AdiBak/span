-- Applications: store the date/time an applicant was marked "met_with".

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS met_with_at TIMESTAMPTZ;

COMMENT ON COLUMN public.applications.met_with_at IS 'When the application was marked met_with in the pipeline.';

-- Backfill for existing rows: best effort from reviewed_at
UPDATE public.applications
SET met_with_at = reviewed_at
WHERE status = 'met_with' AND met_with_at IS NULL AND reviewed_at IS NOT NULL;

