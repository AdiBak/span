-- Allow members to update their own profile (e.g. profile picture)
-- Allow execs to update any member (e.g. change member's profile picture from Member Management)

DROP POLICY IF EXISTS "Users can update their own member profile" ON public.members;
DROP POLICY IF EXISTS "Execs can update any member" ON public.members;

CREATE POLICY "Users can update their own member profile" ON public.members
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Execs can update any member" ON public.members
  FOR UPDATE
  TO authenticated
  USING (public.has_registration_permission())
  WITH CHECK (public.has_registration_permission());
