-- Optional middle name (exec/member record). Optional preferred public name (directory, blog, etc.).
-- SPAN email generation in the app remains first.last only.

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS middle_name TEXT,
  ADD COLUMN IF NOT EXISTS preferred_name TEXT;

COMMENT ON COLUMN public.members.middle_name IS 'Optional middle name; not used for SPAN email (first.last).';
COMMENT ON COLUMN public.members.preferred_name IS 'Optional name shown on public site (directory, blog). Empty uses first [middle] last.';

-- Recreate create_member / update_member with new optional params (body aligned with members_add_blog_permission).

CREATE OR REPLACE FUNCTION public.create_member(
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_original_email TEXT,
  p_role TEXT,
  p_active BOOLEAN DEFAULT true,
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
  p_volunteer BOOLEAN DEFAULT false,
  p_applications BOOLEAN DEFAULT false,
  p_bills BOOLEAN DEFAULT false,
  p_registration BOOLEAN DEFAULT false,
  p_blog BOOLEAN DEFAULT false,
  p_middle_name TEXT DEFAULT NULL,
  p_preferred_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_id UUID;
  v_result JSONB;
BEGIN
  INSERT INTO public.members (
    first_name,
    last_name,
    middle_name,
    preferred_name,
    email,
    original_email,
    role,
    active,
    start_date,
    dob,
    school_name,
    city,
    state,
    phone,
    linkedin,
    instagram,
    notes,
    bio,
    volunteer,
    applications,
    bills,
    registration,
    blog,
    registration_complete
  ) VALUES (
    p_first_name,
    p_last_name,
    NULLIF(BTRIM(COALESCE(p_middle_name, '')), ''),
    NULLIF(BTRIM(COALESCE(p_preferred_name, '')), ''),
    p_email,
    p_original_email,
    p_role,
    p_active,
    p_start_date,
    p_dob,
    p_school_name,
    p_city,
    p_state,
    CASE WHEN p_phone IS NULL OR p_phone = '' THEN NULL ELSE p_phone::bigint END,
    p_linkedin,
    p_instagram,
    p_notes,
    p_bio,
    p_volunteer,
    p_applications,
    p_bills,
    p_registration,
    p_blog,
    false
  )
  RETURNING member_id INTO v_member_id;

  SELECT row_to_json(m)::jsonb INTO v_result
  FROM public.members m
  WHERE m.member_id = v_member_id;

  RETURN v_result;
END;
$$;

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
  p_preferred_name TEXT DEFAULT NULL
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
