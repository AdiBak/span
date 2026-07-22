-- Exec cleanup: delete HR reports and resignation requests (dashboard).
-- Matches the four-permission exec check used for strikes / member_requests deletes.

GRANT DELETE ON public.hr_reports TO authenticated;
GRANT DELETE ON public.member_resignations TO authenticated;

DROP POLICY IF EXISTS "Executive directors can delete hr reports" ON public.hr_reports;
CREATE POLICY "Executive directors can delete hr reports"
  ON public.hr_reports
  FOR DELETE
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
  );

DROP POLICY IF EXISTS "Executive directors can delete resignations" ON public.member_resignations;
CREATE POLICY "Executive directors can delete resignations"
  ON public.member_resignations
  FOR DELETE
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
  );
