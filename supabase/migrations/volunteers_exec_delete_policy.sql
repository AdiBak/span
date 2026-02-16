-- Allow only execs (all 4 permissions) to delete volunteer entries.
-- Members can only delete their own entries via this policy; we restrict the UI to execs only.
CREATE POLICY "Execs can delete volunteer entries" ON public.volunteers
  FOR DELETE
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
