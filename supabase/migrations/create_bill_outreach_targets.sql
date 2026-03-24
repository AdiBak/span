-- Exec outreach tracking: sponsors pulled from LegiScan per approved SPAN bill; status + notes per target.

CREATE TABLE public.bill_outreach_targets (
  target_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id INTEGER NOT NULL REFERENCES public.bills (bill_id) ON DELETE CASCADE,
  sponsor_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  party TEXT,
  sponsor_role TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'contacted', 'responded')),
  notes TEXT,
  updated_by_member_id UUID REFERENCES public.members (member_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bill_id, sponsor_key)
);

CREATE INDEX idx_bill_outreach_targets_bill ON public.bill_outreach_targets (bill_id);
CREATE INDEX idx_bill_outreach_targets_status ON public.bill_outreach_targets (status);

COMMENT ON TABLE public.bill_outreach_targets IS 'LegiScan-derived sponsor list per bill; exec tracks contact status (Outreach tab).';
COMMENT ON COLUMN public.bill_outreach_targets.sponsor_key IS 'Stable key from normalized name|party|role for merge on LegiScan refresh.';

ALTER TABLE public.bill_outreach_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bill_outreach_targets_exec_all"
  ON public.bill_outreach_targets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.user_id = auth.uid()
        AND (m.volunteer = true OR m.volunteer = 'true')
        AND (m.applications = true OR m.applications = 'true')
        AND (m.bills = true OR m.bills = 'true')
        AND (m.registration = true OR m.registration = 'true')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.user_id = auth.uid()
        AND (m.volunteer = true OR m.volunteer = 'true')
        AND (m.applications = true OR m.applications = 'true')
        AND (m.bills = true OR m.bills = 'true')
        AND (m.registration = true OR m.registration = 'true')
    )
  );

CREATE OR REPLACE FUNCTION public.bill_outreach_targets_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER bill_outreach_targets_updated_at
  BEFORE UPDATE ON public.bill_outreach_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.bill_outreach_targets_set_updated_at();
