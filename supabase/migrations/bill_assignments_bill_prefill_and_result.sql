-- Prefill fields for publishing a bill after exec approves assigned work; link to created bill row.

ALTER TABLE public.bill_assignments
  ADD COLUMN IF NOT EXISTS prefill_state TEXT,
  ADD COLUMN IF NOT EXISTS prefill_bill_name TEXT,
  ADD COLUMN IF NOT EXISTS prefill_position TEXT,
  ADD COLUMN IF NOT EXISTS resulting_bill_id INTEGER REFERENCES public.bills (bill_id) ON DELETE SET NULL;

COMMENT ON COLUMN public.bill_assignments.prefill_state IS 'Optional state label for bill form when publishing after assignment approval.';
COMMENT ON COLUMN public.bill_assignments.prefill_bill_name IS 'Optional bill name/number prefill (e.g. HB 123).';
COMMENT ON COLUMN public.bill_assignments.prefill_position IS 'Optional SPAN position: Support, Oppose, Support If Amended, Propose.';
COMMENT ON COLUMN public.bill_assignments.resulting_bill_id IS 'Bill created when exec completes upload from this assignment.';

CREATE INDEX IF NOT EXISTS idx_bill_assignments_resulting_bill_id ON public.bill_assignments (resulting_bill_id);
