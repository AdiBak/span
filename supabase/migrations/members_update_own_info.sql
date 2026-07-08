-- Members can update school, location, and grade on their own dashboard profile.

CREATE OR REPLACE FUNCTION public.update_own_member_info(
  p_school_name TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_grade TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_result JSONB;
  v_state TEXT;
BEGIN
  SELECT member_id INTO v_member_id
  FROM public.members
  WHERE user_id = auth.uid()
     OR (
       (auth.jwt() ->> 'email') IS NOT NULL
       AND lower(trim(COALESCE(email, ''))) = lower(trim(COALESCE(auth.jwt() ->> 'email', '')))
     )
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'Member record not found for current user';
  END IF;

  v_state := NULLIF(BTRIM(COALESCE(p_state, '')), '');
  IF v_state IS NOT NULL AND length(v_state) <> 2 THEN
    RAISE EXCEPTION 'State must be a 2-letter abbreviation';
  END IF;

  UPDATE public.members
  SET
    school_name = CASE
      WHEN p_school_name IS NULL THEN school_name
      ELSE NULLIF(BTRIM(p_school_name), '')
    END,
    city = CASE
      WHEN p_city IS NULL THEN city
      ELSE NULLIF(BTRIM(p_city), '')
    END,
    state = CASE
      WHEN p_state IS NULL THEN state
      ELSE upper(v_state)
    END,
    grade = CASE
      WHEN p_grade IS NULL THEN grade
      ELSE NULLIF(BTRIM(p_grade), '')
    END
  WHERE member_id = v_member_id;

  SELECT row_to_json(m)::jsonb INTO v_result
  FROM public.members m
  WHERE m.member_id = v_member_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_own_member_info(text, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.update_own_member_info(text, text, text, text) IS
  'Updates school_name, city, state, and grade for the authenticated member only.';
