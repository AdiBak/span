-- Resolve ambiguous public.update_member overloads left by successive migrations.
-- CREATE OR REPLACE with different signatures creates multiple candidates; PostgREST
-- then fails on partial calls (e.g. only p_member_id + p_active).

DROP FUNCTION IF EXISTS public.update_member(
  uuid, text, text, text, text, text, boolean, date, date, text, text, text, text, text, text, text, text,
  boolean, boolean, boolean, boolean
);

DROP FUNCTION IF EXISTS public.update_member(
  uuid, text, text, text, text, text, boolean, date, date, text, text, text, text, text, text, text, text,
  boolean, boolean, boolean, boolean, boolean
);

DROP FUNCTION IF EXISTS public.update_member(
  uuid, text, text, text, text, text, boolean, date, date, text, text, text, text, text, text, text, text,
  boolean, boolean, boolean, boolean, boolean, text, text
);

DROP FUNCTION IF EXISTS public.update_member(
  uuid, text, text, text, text, text, boolean, date, date, text, text, text, text, text, text, text, text,
  boolean, boolean, boolean, boolean, boolean, text, text, text
);

CREATE OR REPLACE FUNCTION public.update_member(
  p_member_id UUID,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_original_email TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL,
  p_active BOOLEAN DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_dob DATE DEFAULT NULL,
  p_school_name TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_linkedin TEXT DEFAULT NULL,
  p_instagram TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_volunteer BOOLEAN DEFAULT NULL,
  p_applications BOOLEAN DEFAULT NULL,
  p_bills BOOLEAN DEFAULT NULL,
  p_registration BOOLEAN DEFAULT NULL,
  p_blog BOOLEAN DEFAULT NULL,
  p_middle_name TEXT DEFAULT NULL,
  p_preferred_name TEXT DEFAULT NULL,
  p_grade TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE public.members
  SET
    first_name = COALESCE(p_first_name, first_name),
    last_name = COALESCE(p_last_name, last_name),
    middle_name = CASE
      WHEN p_middle_name IS NULL THEN middle_name
      ELSE NULLIF(BTRIM(p_middle_name), '')
    END,
    preferred_name = CASE
      WHEN p_preferred_name IS NULL THEN preferred_name
      ELSE NULLIF(BTRIM(p_preferred_name), '')
    END,
    email = COALESCE(p_email, email),
    original_email = COALESCE(p_original_email, original_email),
    role = COALESCE(p_role, role),
    active = COALESCE(p_active, active),
    start_date = COALESCE(p_start_date, start_date),
    dob = COALESCE(p_dob, dob),
    school_name = COALESCE(p_school_name, school_name),
    city = COALESCE(p_city, city),
    state = COALESCE(p_state, state),
    phone = CASE
      WHEN p_phone IS NULL THEN phone
      WHEN p_phone = '' THEN NULL
      ELSE p_phone::bigint
    END,
    linkedin = COALESCE(p_linkedin, linkedin),
    instagram = COALESCE(p_instagram, instagram),
    notes = COALESCE(p_notes, notes),
    bio = COALESCE(p_bio, bio),
    grade = CASE
      WHEN p_grade IS NULL THEN grade
      ELSE NULLIF(BTRIM(p_grade), '')
    END,
    volunteer = COALESCE(p_volunteer, volunteer),
    applications = COALESCE(p_applications, applications),
    bills = COALESCE(p_bills, bills),
    registration = COALESCE(p_registration, registration),
    blog = COALESCE(p_blog, blog)
  WHERE member_id = p_member_id;

  SELECT row_to_json(m)::jsonb INTO v_result
  FROM public.members m
  WHERE m.member_id = p_member_id;

  RETURN v_result;
END;
$$;
