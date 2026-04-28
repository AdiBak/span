-- Strikes (linked to HR reports or manual), dual-exec removal proposals, resignation workflow.

CREATE TABLE IF NOT EXISTS public.member_strikes (
  strike_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(member_id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('hr_report', 'manual')),
  hr_report_id UUID REFERENCES public.hr_reports(report_id) ON DELETE SET NULL,
  notes TEXT,
  recorded_by UUID NOT NULL REFERENCES public.members(member_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_member_strikes_one_per_hr
  ON public.member_strikes(hr_report_id)
  WHERE hr_report_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_member_strikes_member_created ON public.member_strikes(member_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.member_removal_proposals (
  proposal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(member_id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL REFERENCES public.members(member_id) ON DELETE SET NULL,
  confirmed_by UUID REFERENCES public.members(member_id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'awaiting_second' CHECK (status IN ('awaiting_second', 'dual_confirmed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT member_removal_confirmer_diff CHECK (confirmed_by IS NULL OR confirmed_by <> initiated_by)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_member_removal_one_pending
  ON public.member_removal_proposals(member_id)
  WHERE (status = 'awaiting_second');

CREATE INDEX IF NOT EXISTS idx_member_removal_status ON public.member_removal_proposals(status);

CREATE TABLE IF NOT EXISTS public.member_resignations (
  resignation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(member_id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested',
    'meeting_scheduled',
    'met',
    'honorable_letter_sent',
    'completed',
    'withdrawn'
  )),
  directors_notified_at TIMESTAMPTZ,
  exec_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_resignations_member ON public.member_resignations(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_resignations_status ON public.member_resignations(status);

ALTER TABLE public.member_strikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_removal_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_resignations ENABLE ROW LEVEL SECURITY;

-- Exec = all four permission flags (same pattern as member_requests).

CREATE POLICY "Executive directors select member strikes" ON public.member_strikes
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.user_id = auth.uid()
        AND (m.volunteer = true OR m.volunteer = 'true')
        AND (m.applications = true OR m.applications = 'true')
        AND (m.bills = true OR m.bills = 'true')
        AND (m.registration = true OR m.registration = 'true')
    )
  );

CREATE POLICY "Executive directors insert member strikes" ON public.member_strikes
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.user_id = auth.uid()
        AND m.member_id = member_strikes.recorded_by
        AND (m.volunteer = true OR m.volunteer = 'true')
        AND (m.applications = true OR m.applications = 'true')
        AND (m.bills = true OR m.bills = 'true')
        AND (m.registration = true OR m.registration = 'true')
    )
  );

CREATE POLICY "Executive directors delete member strikes" ON public.member_strikes
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.user_id = auth.uid()
        AND (m.volunteer = true OR m.volunteer = 'true')
        AND (m.applications = true OR m.applications = 'true')
        AND (m.bills = true OR m.bills = 'true')
        AND (m.registration = true OR m.registration = 'true')
    )
  );

CREATE POLICY "Executive directors select removal proposals" ON public.member_removal_proposals
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.user_id = auth.uid()
        AND (m.volunteer = true OR m.volunteer = 'true')
        AND (m.applications = true OR m.applications = 'true')
        AND (m.bills = true OR m.bills = 'true')
        AND (m.registration = true OR m.registration = 'true')
    )
  );

CREATE POLICY "Executive directors insert removal proposals" ON public.member_removal_proposals
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.user_id = auth.uid()
        AND m.member_id = member_removal_proposals.initiated_by
        AND (m.volunteer = true OR m.volunteer = 'true')
        AND (m.applications = true OR m.applications = 'true')
        AND (m.bills = true OR m.bills = 'true')
        AND (m.registration = true OR m.registration = 'true')
    )
  );

CREATE POLICY "Executive directors update removal proposals" ON public.member_removal_proposals
  FOR UPDATE TO authenticated USING (
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

CREATE POLICY "Members insert own resignation" ON public.member_resignations
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.user_id = auth.uid() AND m.member_id = member_resignations.member_id
    )
  );

CREATE POLICY "Members select own resignation" ON public.member_resignations
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.user_id = auth.uid() AND m.member_id = member_resignations.member_id
    )
  );

CREATE POLICY "Members withdraw resignation" ON public.member_resignations
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.user_id = auth.uid() AND m.member_id = member_resignations.member_id
    )
  )
  WITH CHECK (
    status = 'withdrawn'
    AND EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.user_id = auth.uid() AND m.member_id = member_resignations.member_id
    )
  );

CREATE POLICY "Executive directors select all resignations" ON public.member_resignations
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.user_id = auth.uid()
        AND (m.volunteer = true OR m.volunteer = 'true')
        AND (m.applications = true OR m.applications = 'true')
        AND (m.bills = true OR m.bills = 'true')
        AND (m.registration = true OR m.registration = 'true')
    )
  );

CREATE POLICY "Executive directors update resignations" ON public.member_resignations
  FOR UPDATE TO authenticated USING (
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

GRANT SELECT, INSERT, DELETE ON public.member_strikes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.member_removal_proposals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.member_resignations TO authenticated;

COMMENT ON TABLE public.member_strikes IS 'Disciplinary strikes; 3 max regular members, 2 for leadership (exec permission set).';
COMMENT ON TABLE public.member_removal_proposals IS 'Removal intent; requires two distinct executives to confirm.';
COMMENT ON TABLE public.member_resignations IS 'Member-initiated resignation; directors notified by email; exec-managed status through honorable letter.';
