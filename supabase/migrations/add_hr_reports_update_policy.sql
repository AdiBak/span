-- Migration: Add UPDATE policy for HR reports
-- Allows only executive directors (members with all permissions) to update HR report status

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Executive directors can update HR reports" ON public.hr_reports;

-- Policy: Executive directors (members with all permissions: volunteer, applications, bills, registration) can update HR reports
CREATE POLICY "Executive directors can update HR reports" ON public.hr_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (volunteer = true OR volunteer = 'true')
      AND (applications = true OR applications = 'true')
      AND (bills = true OR bills = 'true')
      AND (registration = true OR registration = 'true')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (volunteer = true OR volunteer = 'true')
      AND (applications = true OR applications = 'true')
      AND (bills = true OR bills = 'true')
      AND (registration = true OR registration = 'true')
    )
  );

