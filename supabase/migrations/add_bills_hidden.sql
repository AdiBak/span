-- Allow approved bills to be hidden from the public site while staying in the backend and visible in dashboards.
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.bills.hidden IS 'When true, bill is approved but not shown on the public Bills page; still visible in Bill Management and to the submitter.';

CREATE INDEX IF NOT EXISTS idx_bills_hidden ON public.bills(hidden);
