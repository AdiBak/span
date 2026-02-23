-- Migration: Create member_suggestions table for ideas, bill ideas, and feature suggestions
-- Members submit; execs can view all, set status (pending/under_review/approved/declined), and leave comments.

-- Step 1: Create the member_suggestions table
CREATE TABLE IF NOT EXISTS public.member_suggestions (
  suggestion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(member_id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bill_idea', 'general_interest', 'web_dev_feature')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'under_review', 'approved', 'declined')),
  reviewed_by UUID REFERENCES public.members(member_id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Step 2: Enable RLS
ALTER TABLE public.member_suggestions ENABLE ROW LEVEL SECURITY;

-- Step 3: RLS policies

-- Members can insert their own suggestions
CREATE POLICY "Members can submit own suggestions" ON public.member_suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE user_id = auth.uid() AND member_id = member_suggestions.member_id
    )
  );

-- Members can view their own suggestions
CREATE POLICY "Members can view own suggestions" ON public.member_suggestions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM public.members WHERE member_id = member_suggestions.member_id)
  );

-- Execs can view all suggestions
CREATE POLICY "Executive directors can view all suggestions" ON public.member_suggestions
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

-- Execs can update (status, review notes)
CREATE POLICY "Executive directors can update suggestions" ON public.member_suggestions
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
CREATE INDEX IF NOT EXISTS idx_member_suggestions_member_id ON public.member_suggestions(member_id);
CREATE INDEX IF NOT EXISTS idx_member_suggestions_status ON public.member_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_member_suggestions_type ON public.member_suggestions(type);
CREATE INDEX IF NOT EXISTS idx_member_suggestions_created_at ON public.member_suggestions(created_at DESC);

COMMENT ON TABLE public.member_suggestions IS 'Member ideas: bill ideas, general interests, web/feature suggestions. Execs review and set status.';
