-- Migration: Create HR Reports table for member complaints
-- This allows members to submit HR complaints that can be viewed by executive directors
-- Executive directors cannot view reports about themselves

-- Step 1: Create the hr_reports table
CREATE TABLE IF NOT EXISTS public.hr_reports (
  report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID NOT NULL REFERENCES public.members(member_id) ON DELETE CASCADE,
  nature_of_complaint TEXT NOT NULL,
  regarding_member_id UUID REFERENCES public.members(member_id) ON DELETE SET NULL,
  regarding_name TEXT, -- Store name in case member is deleted
  date_occurred DATE NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES public.members(member_id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Step 2: Enable RLS
ALTER TABLE public.hr_reports ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies

-- Policy: All authenticated members can submit reports
CREATE POLICY "Members can submit HR reports" ON public.hr_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.members WHERE member_id = submitted_by)
  );

-- Policy: Members can view their own reports
CREATE POLICY "Members can view their own reports" ON public.hr_reports
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM public.members WHERE member_id = submitted_by)
  );

-- Policy: Executive directors (members with registration permission) can view all reports
-- EXCEPT reports where they are the subject (regarding_member_id matches their member_id)
CREATE POLICY "Executive directors can view HR reports (except about themselves)" ON public.hr_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (registration = true OR registration = 'true')
      AND member_id != hr_reports.regarding_member_id
    )
  );

-- Step 4: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_hr_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to auto-update updated_at
CREATE TRIGGER update_hr_reports_updated_at
  BEFORE UPDATE ON public.hr_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_hr_reports_updated_at();

-- Step 6: Create index for performance
CREATE INDEX IF NOT EXISTS idx_hr_reports_submitted_by ON public.hr_reports(submitted_by);
CREATE INDEX IF NOT EXISTS idx_hr_reports_regarding_member ON public.hr_reports(regarding_member_id);
CREATE INDEX IF NOT EXISTS idx_hr_reports_status ON public.hr_reports(status);
CREATE INDEX IF NOT EXISTS idx_hr_reports_created_at ON public.hr_reports(created_at DESC);

