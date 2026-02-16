-- Migration: Create partners table for partner organizations
-- Allows executive directors to manage partner organizations displayed on homepage

-- Step 1: Create the partners table
CREATE TABLE IF NOT EXISTS public.partners (
  partner_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name TEXT NOT NULL,
  partner_logo TEXT NOT NULL, -- Filename in storage bucket
  website_url TEXT,
  display_order INTEGER DEFAULT 999,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Step 2: Enable RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies

-- Policy: Anyone can view active partners (for homepage display)
CREATE POLICY "Public can view active partners" ON public.partners
  FOR SELECT
  TO public
  USING (active = true);

-- Policy: Executive directors (members with registration permission) can view all partners
CREATE POLICY "Executive directors can view all partners" ON public.partners
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (registration = true OR registration = 'true')
    )
  );

-- Policy: Executive directors can insert partners
CREATE POLICY "Executive directors can insert partners" ON public.partners
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (registration = true OR registration = 'true')
    )
  );

-- Policy: Executive directors can update partners
CREATE POLICY "Executive directors can update partners" ON public.partners
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

-- Policy: Executive directors can delete partners
CREATE POLICY "Executive directors can delete partners" ON public.partners
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (registration = true OR registration = 'true')
    )
  );

-- Step 4: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_partners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to auto-update updated_at
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_partners_updated_at();

-- Step 6: Create index for performance
CREATE INDEX IF NOT EXISTS idx_partners_active ON public.partners(active);
CREATE INDEX IF NOT EXISTS idx_partners_display_order ON public.partners(display_order);
