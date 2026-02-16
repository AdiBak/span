-- Add RLS policy for members table
-- This allows users to view their own member record by matching user_id

-- Enable RLS on members table if not already enabled
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (to allow re-running)
DROP POLICY IF EXISTS "Users can view their own member data" ON public.members;
DROP POLICY IF EXISTS "Members can view their own data" ON public.members;

-- Policy: Users can view their own member record
CREATE POLICY "Users can view their own member data" ON public.members
  FOR SELECT
  USING (
    -- Allow if user_id matches the authenticated user
    user_id = auth.uid()
    OR
    -- Allow if email matches (fallback for cases where user_id might not be set yet)
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Create a SECURITY DEFINER function to check registration permission
-- This bypasses RLS to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.has_registration_permission()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_permission BOOLEAN;
BEGIN
  SELECT (registration = true OR registration = 'true')
  INTO v_has_permission
  FROM public.members
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(v_has_permission, false);
END;
$$;

-- Policy: Members with registration permission can view all members (for member management)
DROP POLICY IF EXISTS "Members with registration permission can view all members" ON public.members;

CREATE POLICY "Members with registration permission can view all members" ON public.members
  FOR SELECT
  USING (public.has_registration_permission());

