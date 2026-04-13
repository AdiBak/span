-- Public bill/issue idea submissions (no login required). Execs review in Ideas & Suggestions.

CREATE TABLE IF NOT EXISTS public.public_bill_recommendations (
  recommendation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  state TEXT,
  submitter_name TEXT NOT NULL,
  submitter_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'under_review', 'approved', 'declined')),
  reviewed_by UUID REFERENCES public.members (member_id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.public_bill_recommendations ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous site visitors) can submit
CREATE POLICY "Anyone can insert public bill recommendations"
  ON public.public_bill_recommendations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Executive directors can read all
CREATE POLICY "Executive directors can select public bill recommendations"
  ON public.public_bill_recommendations
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

-- Executive directors can update (review workflow)
CREATE POLICY "Executive directors can update public bill recommendations"
  ON public.public_bill_recommendations
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

CREATE INDEX IF NOT EXISTS idx_public_bill_recommendations_created_at
  ON public.public_bill_recommendations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_bill_recommendations_status
  ON public.public_bill_recommendations (status);

COMMENT ON TABLE public.public_bill_recommendations IS 'Anonymous public submissions: bill/issue ideas from the website; reviewed by execs.';
