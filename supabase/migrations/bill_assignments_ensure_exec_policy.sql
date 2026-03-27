-- Re-ensure executives can read/update all bill_assignments (RLS).
-- If this policy was dropped or never applied, the dashboard shows 0 rows even when data exists.
-- Safe to run multiple times.

DROP POLICY IF EXISTS "bill_assignments_exec_all" ON public.bill_assignments;

CREATE POLICY "bill_assignments_exec_all"
  ON public.bill_assignments
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
