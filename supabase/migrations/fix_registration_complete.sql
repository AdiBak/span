-- Fix registration_complete issue
-- This migration ensures that:
-- 1. create_member function explicitly sets registration_complete = false
-- 2. Members who were added via the dashboard (not through registration form) are marked as incomplete

-- Step 1: Update create_member function to explicitly set registration_complete = false
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
  p_registration BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_id UUID;
  v_result JSONB;
BEGIN
  -- Insert new member with registration_complete explicitly set to false
  -- This ensures that even if all fields are filled, the member must still go through the registration form
  INSERT INTO public.members (
    first_name,
    last_name,
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
    registration_complete  -- Explicitly set to false
  ) VALUES (
    p_first_name,
    p_last_name,
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
    false  -- Always false for new members created via dashboard
  )
  RETURNING member_id INTO v_member_id;

  -- Return the created member
  SELECT row_to_json(m)::jsonb INTO v_result
  FROM public.members m
  WHERE m.member_id = v_member_id;

  RETURN v_result;
END;
$$;

-- Step 2: Fix members who were incorrectly marked as registration_complete = true
-- This targets members who:
-- - Have registration_complete = true
-- - Have a user_id (auth account created)
-- - But were likely added via dashboard (not through registration form)
-- 
-- We'll mark them as incomplete if they don't have an image (profile photo),
-- as the registration form requires image upload
UPDATE public.members
SET registration_complete = false
WHERE 
  registration_complete = true
  AND user_id IS NOT NULL  -- Has auth account (was added via dashboard)
  AND (image IS NULL OR image = '')  -- Missing profile photo (required by registration form)
  -- This catches members who were added with all fields but never went through registration
