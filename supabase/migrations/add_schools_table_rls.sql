-- Migration: Add RLS policies for schools table
-- This allows executive directors to manage schools (INSERT, UPDATE, DELETE)
-- Public can view schools (SELECT)

-- Step 1: Enable RLS on schools table (if not already enabled)
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public can view schools" ON public.schools;
DROP POLICY IF EXISTS "Executive directors can manage schools" ON public.schools;

-- Step 3: Create policy for public read access
CREATE POLICY "Public can view schools"
ON public.schools
FOR SELECT
TO public
USING (true);

-- Step 4: Create policy for executive directors to insert/update/delete schools
CREATE POLICY "Executive directors can manage schools"
ON public.schools
FOR ALL
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
