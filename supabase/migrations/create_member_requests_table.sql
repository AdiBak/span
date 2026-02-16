-- Migration: Create member_requests table for leave/break and project extension requests
-- Members submit with a reason; execs approve or decline (optional review notes).

-- Step 1: Create the member_requests table
CREATE TABLE IF NOT EXISTS public.member_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(member_id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('leave', 'extension')),
  reason TEXT NOT NULL,
  -- Leave-only (optional)
  leave_start DATE,
  leave_end DATE,
  -- Extension-only (optional)
  project_name TEXT,
  requested_by_date DATE,
  -- Review
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'declined')),
  reviewed_by UUID REFERENCES public.members(member_id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Step 2: Enable RLS
ALTER TABLE public.member_requests ENABLE ROW LEVEL SECURITY;

-- Step 3: RLS policies

-- Members can insert their own requests (member_id in inserted row must match current user)
CREATE POLICY "Members can submit own requests" ON public.member_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE user_id = auth.uid() AND member_id = member_requests.member_id
    )
  );

-- Members can view their own requests
CREATE POLICY "Members can view own requests" ON public.member_requests
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM public.members WHERE member_id = member_requests.member_id)
  );

-- Execs can view all requests
CREATE POLICY "Executive directors can view all member requests" ON public.member_requests
  FOR SELECT
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
  );

-- Execs can update (approve/decline, set review notes)
CREATE POLICY "Executive directors can update member requests" ON public.member_requests
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

-- Step 4: Indexes
CREATE INDEX IF NOT EXISTS idx_member_requests_member_id ON public.member_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_member_requests_status ON public.member_requests(status);
CREATE INDEX IF NOT EXISTS idx_member_requests_type ON public.member_requests(type);
CREATE INDEX IF NOT EXISTS idx_member_requests_created_at ON public.member_requests(created_at DESC);

COMMENT ON TABLE public.member_requests IS 'Leave/break and project extension requests; members submit, execs approve or decline.';
