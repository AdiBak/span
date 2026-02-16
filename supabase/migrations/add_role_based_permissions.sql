-- Migration: Replace tiering system with role-based permissions
-- This migration:
-- 1. Adds new role columns (volunteer, applications, bills, registration)
-- 2. Migrates existing executive directors to have all roles
-- 3. Removes is_executive_director and tier columns
-- 4. Updates create_member function
-- 5. Creates update_member function

-- Step 1: Add new role columns
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS volunteer BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS applications BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS bills BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS registration BOOLEAN DEFAULT false NOT NULL;

-- Step 2: Migrate existing executive directors to have all roles
UPDATE public.members
SET 
  volunteer = true,
  applications = true,
  bills = true,
  registration = true
WHERE is_executive_director = true OR is_executive_director = 'true';

-- Step 3: Drop and recreate RLS policies that reference is_executive_director
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view volunteer entries" ON public.volunteers;
DROP POLICY IF EXISTS "Executive directors can update volunteer entries" ON public.volunteers;
DROP POLICY IF EXISTS "Executive directors can insert bills" ON public.bills;
DROP POLICY IF EXISTS "Executive directors can upload proposals" ON storage.objects;
DROP POLICY IF EXISTS "Executive directors can update proposals" ON storage.objects;
DROP POLICY IF EXISTS "Executive directors can delete bills" ON public.bills;
DROP POLICY IF EXISTS "Executive directors can update bills" ON public.bills;
DROP POLICY IF EXISTS "Executive directors can view applications" ON public.applications;
DROP POLICY IF EXISTS "Executive directors can update applications" ON public.applications;
DROP POLICY IF EXISTS "Executive directors can delete applications" ON public.applications;

-- Recreate policies with new permission checks
-- Volunteers: Users can view their own entries, members with volunteer permission can view all
CREATE POLICY "Users can view volunteer entries" ON public.volunteers
  FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM public.members WHERE member_id = volunteers.member_id)
    OR
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (volunteer = true OR volunteer = 'true')
    )
  );

-- Volunteers: Members with volunteer permission can update entries
CREATE POLICY "Members with volunteer permission can update volunteer entries" ON public.volunteers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (volunteer = true OR volunteer = 'true')
    )
  );

-- Bills: Members with bills permission can insert
CREATE POLICY "Members with bills permission can insert bills" ON public.bills
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (bills = true OR bills = 'true')
    )
  );

-- Bills: Members with bills permission can update
CREATE POLICY "Members with bills permission can update bills" ON public.bills
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (bills = true OR bills = 'true')
    )
  );

-- Bills: Members with bills permission can delete
CREATE POLICY "Members with bills permission can delete bills" ON public.bills
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (bills = true OR bills = 'true')
    )
  );

-- Storage (proposals): Members with bills permission can upload
CREATE POLICY "Members with bills permission can upload proposals" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'proposals' AND
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (bills = true OR bills = 'true')
    )
  );

-- Storage (proposals): Members with bills permission can update
CREATE POLICY "Members with bills permission can update proposals" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'proposals' AND
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (bills = true OR bills = 'true')
    )
  );

-- Applications: Members with applications permission can view
CREATE POLICY "Members with applications permission can view applications" ON public.applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (applications = true OR applications = 'true')
    )
  );

-- Applications: Members with applications permission can update
CREATE POLICY "Members with applications permission can update applications" ON public.applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (applications = true OR applications = 'true')
    )
  );

-- Applications: Members with applications permission can delete
CREATE POLICY "Members with applications permission can delete applications" ON public.applications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (applications = true OR applications = 'true')
    )
  );

-- Step 4: Drop the is_executive_director column (now safe since policies are updated)
ALTER TABLE public.members
  DROP COLUMN IF EXISTS is_executive_director;

-- Step 5: Drop the tier column (replacing tiering system)
ALTER TABLE public.members
  DROP COLUMN IF EXISTS tier;

-- Step 6: Update create_member function to use new role system
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
  -- Insert new member
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
    registration
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
    p_registration
  )
  RETURNING member_id INTO v_member_id;

  -- Return the created member
  SELECT row_to_json(m)::jsonb INTO v_result
  FROM public.members m
  WHERE m.member_id = v_member_id;

  RETURN v_result;
END;
$$;

-- Step 7: Create update_member function for editing member info and roles
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
  p_registration BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_update_data JSONB := '{}'::jsonb;
BEGIN
  -- Build update object dynamically (only update provided fields)
  IF p_first_name IS NOT NULL THEN
    v_update_data := v_update_data || jsonb_build_object('first_name', p_first_name);
  END IF;
  IF p_last_name IS NOT NULL THEN
    v_update_data := v_update_data || jsonb_build_object('last_name', p_last_name);
  END IF;
  IF p_email IS NOT NULL THEN
    v_update_data := v_update_data || jsonb_build_object('email', p_email);
  END IF;
  IF p_original_email IS NOT NULL THEN
    v_update_data := v_update_data || jsonb_build_object('original_email', p_original_email);
  END IF;
  IF p_role IS NOT NULL THEN
    v_update_data := v_update_data || jsonb_build_object('role', p_role);
  END IF;
  IF p_active IS NOT NULL THEN
    v_update_data := v_update_data || jsonb_build_object('active', p_active);
  END IF;
  IF p_start_date IS NOT NULL THEN
    v_update_data := v_update_data || jsonb_build_object('start_date', p_start_date);
  END IF;
  IF p_dob IS NOT NULL THEN
    v_update_data := v_update_data || jsonb_build_object('dob', p_dob);
  END IF;
  IF p_school_name IS NOT NULL THEN
    v_update_data := v_update_data || jsonb_build_object('school_name', p_school_name);
  END IF;
  IF p_city IS NOT NULL THEN
    v_update_data := v_update_data || jsonb_build_object('city', p_city);
  END IF;
  IF p_state IS NOT NULL THEN
    v_update_data := v_update_data || jsonb_build_object('state', p_state);
  END IF;
  IF p_phone IS NOT NULL THEN
    v_update_data := v_update_data || jsonb_build_object('phone', CASE WHEN p_phone = '' THEN NULL ELSE p_phone::bigint END);
  END IF;
  IF p_linkedin IS NOT NULL THEN
    v_update_data := v_update_data || jsonb_build_object('linkedin', p_linkedin);
  END IF;
  IF p_instagram IS NOT NULL THEN
    v_update_data := v_update_data || jsonb_build_object('instagram', p_instagram);
  END IF;
  IF p_notes IS NOT NULL THEN
    v_update_data := v_update_data || jsonb_build_object('notes', p_notes);
  END IF;
  IF p_bio IS NOT NULL THEN
    v_update_data := v_update_data || jsonb_build_object('bio', p_bio);
  END IF;
  IF p_volunteer IS NOT NULL THEN
    v_update_data := v_update_data || jsonb_build_object('volunteer', p_volunteer);
  END IF;
  IF p_applications IS NOT NULL THEN
    v_update_data := v_update_data || jsonb_build_object('applications', p_applications);
  END IF;
  IF p_bills IS NOT NULL THEN
    v_update_data := v_update_data || jsonb_build_object('bills', p_bills);
  END IF;
  IF p_registration IS NOT NULL THEN
    v_update_data := v_update_data || jsonb_build_object('registration', p_registration);
  END IF;

  -- Perform update
  UPDATE public.members
  SET 
    first_name = COALESCE(p_first_name, first_name),
    last_name = COALESCE(p_last_name, last_name),
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
    registration = COALESCE(p_registration, registration)
  WHERE member_id = p_member_id;

  -- Return updated member
  SELECT row_to_json(m)::jsonb INTO v_result
  FROM public.members m
  WHERE m.member_id = p_member_id;

  RETURN v_result;
END;
$$;

