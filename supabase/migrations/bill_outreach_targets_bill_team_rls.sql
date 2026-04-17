-- Allow anyone with Bills dashboard access (members.bills) to use outreach targets, not only full exec (all four flags).

DROP POLICY IF EXISTS "bill_outreach_targets_exec_all" ON public.bill_outreach_targets;

CREATE POLICY "bill_outreach_targets_bill_team_all"
  ON public.bill_outreach_targets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.user_id = auth.uid()
        AND (m.bills = true OR m.bills = 'true')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.user_id = auth.uid()
        AND (m.bills = true OR m.bills = 'true')
    )
  );

COMMENT ON POLICY "bill_outreach_targets_bill_team_all" ON public.bill_outreach_targets IS
  'Bills team (members.bills) and execs can read/write outreach targets.';
