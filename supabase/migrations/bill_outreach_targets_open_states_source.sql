-- Outreach targets: distinguish LegiScan vs Open States prospecting; store Open States IDs.

ALTER TABLE public.bill_outreach_targets
  ADD COLUMN IF NOT EXISTS target_source TEXT NOT NULL DEFAULT 'legiscan'
    CHECK (target_source IN ('legiscan', 'openstates_committee', 'openstates_bill')),
  ADD COLUMN IF NOT EXISTS openstates_person_id TEXT,
  ADD COLUMN IF NOT EXISTS openstates_committee_id TEXT;

CREATE INDEX IF NOT EXISTS idx_bill_outreach_targets_source
  ON public.bill_outreach_targets (bill_id, target_source);

COMMENT ON COLUMN public.bill_outreach_targets.target_source IS 'legiscan: LegiScan sync; openstates_committee / openstates_bill: prospect imports.';
COMMENT ON COLUMN public.bill_outreach_targets.openstates_person_id IS 'Open States person id when target_source references Open States.';
COMMENT ON COLUMN public.bill_outreach_targets.openstates_committee_id IS 'Open States committee id when imported from committee membership.';

COMMENT ON TABLE public.bill_outreach_targets IS 'Sponsor/prospect list per bill (LegiScan and/or Open States); exec tracks outreach status.';
