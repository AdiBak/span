-- Allow deleting leave/extension requests in dashboard cleanup/testing workflows.
-- Execs: can delete any request.
-- Team leads: can delete requests for members on teams they lead.

DROP POLICY IF EXISTS "Executive directors can delete member requests" ON public.member_requests;
CREATE POLICY "Executive directors can delete member requests"
  ON public.member_requests
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE user_id = auth.uid()
        AND (volunteer = true OR volunteer = 'true')
        AND (applications = true OR applications = 'true')
        AND (bills = true OR bills = 'true')
        AND (registration = true OR registration = 'true')
    )
  );

DROP POLICY IF EXISTS "Team leads can delete team member requests" ON public.member_requests;
CREATE POLICY "Team leads can delete team member requests"
  ON public.member_requests
  FOR DELETE
  TO authenticated
  USING (
    public.member_in_any_team_led_by_current_user(member_requests.member_id)
  );
