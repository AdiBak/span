-- Members can insert their own volunteer hour requests.
-- Full execs (all four perms) can insert entries for any member (issue hours).
-- Volunteer-permission-only users approve/deny existing rows; they do not issue for others.

DROP POLICY IF EXISTS "Members can insert own volunteer entries" ON public.volunteers;
CREATE POLICY "Members can insert own volunteer entries"
  ON public.volunteers
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.members WHERE member_id = volunteers.member_id
    )
  );

DROP POLICY IF EXISTS "Volunteer supervisors can insert entries for any member" ON public.volunteers;
DROP POLICY IF EXISTS "Execs can insert volunteer entries for any member" ON public.volunteers;
CREATE POLICY "Execs can insert volunteer entries for any member"
  ON public.volunteers
  FOR INSERT
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
