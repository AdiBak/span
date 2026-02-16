-- Bypass RLS for profile pic update: SECURITY DEFINER function
-- Call via supabase.rpc('update_own_member_image', { filename })

CREATE OR REPLACE FUNCTION public.update_own_member_image(filename text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.members
  SET image = filename
  WHERE user_id = auth.uid()
     OR email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_own_member_image(text) TO authenticated;

COMMENT ON FUNCTION public.update_own_member_image(text) IS 'Updates the current user''s profile image. Bypasses RLS.';
