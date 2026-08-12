-- Migration: Create advisors table for Advisory Board (public Directory listing)
-- No Auth accounts — exec-managed content, same pattern as partners/schools.

CREATE TABLE IF NOT EXISTS public.advisors (
  advisor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  title TEXT,
  company TEXT,
  photo TEXT, -- Filename in advisors-images bucket
  linkedin_url TEXT,
  display_order INTEGER DEFAULT 999,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.advisors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active advisors" ON public.advisors
  FOR SELECT
  TO public
  USING (active = true);

CREATE POLICY "Executive directors can view all advisors" ON public.advisors
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE user_id = auth.uid()
      AND (registration = true OR registration = 'true')
    )
  );

CREATE POLICY "Executive directors can insert advisors" ON public.advisors
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE user_id = auth.uid()
      AND (registration = true OR registration = 'true')
    )
  );

CREATE POLICY "Executive directors can update advisors" ON public.advisors
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE user_id = auth.uid()
      AND (registration = true OR registration = 'true')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE user_id = auth.uid()
      AND (registration = true OR registration = 'true')
    )
  );

CREATE POLICY "Executive directors can delete advisors" ON public.advisors
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE user_id = auth.uid()
      AND (registration = true OR registration = 'true')
    )
  );

CREATE OR REPLACE FUNCTION public.update_advisors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_advisors_updated_at
  BEFORE UPDATE ON public.advisors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_advisors_updated_at();

CREATE INDEX IF NOT EXISTS idx_advisors_active ON public.advisors(active);
CREATE INDEX IF NOT EXISTS idx_advisors_display_order ON public.advisors(display_order);
