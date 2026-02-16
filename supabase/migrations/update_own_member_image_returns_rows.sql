-- Return number of rows updated so frontend can detect when no row matched
-- Must DROP first because return type is changing (void -> integer)
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
     OR email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1);
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_own_member_image(text) TO authenticated;

COMMENT ON FUNCTION public.update_own_member_image(text) IS 'Updates the current user profile image. Returns number of rows updated. Bypasses RLS.';
