-- Policies that used (SELECT email FROM auth.users ...) cause "permission denied for table users"
-- when evaluated under RLS for role authenticated — that role cannot SELECT auth.users.
-- Match session identity via JWT email claim instead (same fallback intent as before).

DROP POLICY IF EXISTS "Users can view their own member data" ON public.members;

CREATE POLICY "Users can view their own member data" ON public.members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      (auth.jwt() ->> 'email') IS NOT NULL
      AND lower(trim(COALESCE(email, ''))) = lower(trim(COALESCE(auth.jwt() ->> 'email', '')))
    )
  );

DROP POLICY IF EXISTS "Users can update their own member profile" ON public.members;

CREATE POLICY "Users can update their own member profile" ON public.members
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      (auth.jwt() ->> 'email') IS NOT NULL
      AND lower(trim(COALESCE(email, ''))) = lower(trim(COALESCE(auth.jwt() ->> 'email', '')))
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (
      (auth.jwt() ->> 'email') IS NOT NULL
      AND lower(trim(COALESCE(email, ''))) = lower(trim(COALESCE(auth.jwt() ->> 'email', '')))
    )
  );

GRANT UPDATE ON public.members TO authenticated;

-- Keep profile image RPC aligned (avoid auth.users subquery).
DROP FUNCTION IF EXISTS public.update_own_member_image(text);

CREATE OR REPLACE FUNCTION public.update_own_member_image(filename text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_updated integer;
BEGIN
  UPDATE public.members
  SET image = filename
  WHERE user_id = auth.uid()
     OR (
       (auth.jwt() ->> 'email') IS NOT NULL
       AND lower(trim(COALESCE(email, ''))) = lower(trim(COALESCE(auth.jwt() ->> 'email', '')))
     );
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_own_member_image(text) TO authenticated;

COMMENT ON FUNCTION public.update_own_member_image(text) IS 'Updates the current user profile image. Returns number of rows updated. Bypasses RLS.';
