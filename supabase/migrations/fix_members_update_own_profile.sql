-- Fix: Allow members to update their own profile (e.g. profile picture)
-- Use user_id match, or email match if user_id is null (so profile pic update works)

-- Ensure authenticated role can update (RLS will still restrict which rows)
GRANT UPDATE ON public.members TO authenticated;

DROP POLICY IF EXISTS "Users can update their own member profile" ON public.members;

CREATE POLICY "Users can update their own member profile" ON public.members
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1))
  );
