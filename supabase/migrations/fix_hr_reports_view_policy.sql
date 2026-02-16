-- Migration: Fix HR Reports view policy for executive directors
-- Problem: Execs couldn't see reports filed against other execs
-- Solution: Use SECURITY DEFINER function to avoid RLS recursion and fix logic

-- Step 1: Drop the existing problematic policy
DROP POLICY IF EXISTS "Executive directors can view HR reports (except about themselves)" ON public.hr_reports;

-- Step 2: Create a SECURITY DEFINER function to check if user is an exec
-- This avoids RLS recursion issues when querying the members table
CREATE OR REPLACE FUNCTION public.is_executive_director(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.members 
    WHERE user_id = check_user_id 
    AND (registration = true OR registration = 'true')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create a SECURITY DEFINER function to get the current user's member_id
-- This avoids RLS recursion when checking if user is the subject of a report
CREATE OR REPLACE FUNCTION public.get_current_user_member_id(check_user_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT member_id FROM public.members 
    WHERE user_id = check_user_id 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create the fixed policy
-- Execs can view all reports EXCEPT reports where they are the subject (regarding_member_id)
CREATE POLICY "Executive directors can view HR reports (except about themselves)" ON public.hr_reports
  FOR SELECT
  TO authenticated
  USING (
    -- User must be an executive director
    public.is_executive_director(auth.uid())
    AND (
      -- Either the report is not about anyone (regarding_member_id is NULL)
      hr_reports.regarding_member_id IS NULL
      OR
      -- Or the report is about someone else (not the current user)
      hr_reports.regarding_member_id != public.get_current_user_member_id(auth.uid())
    )
  );
