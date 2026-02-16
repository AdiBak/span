-- Migration: Setup schools-images storage bucket and policies
-- This allows executive directors to upload school logos

-- Note: The bucket must be created manually in Supabase Dashboard first:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create a new bucket named "schools-images"
-- 3. Make it public (or set policies below)

-- Step 1: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public can view school logos" ON storage.objects;
DROP POLICY IF EXISTS "Executive directors can upload school logos" ON storage.objects;
DROP POLICY IF EXISTS "Executive directors can update school logos" ON storage.objects;
DROP POLICY IF EXISTS "Executive directors can delete school logos" ON storage.objects;

-- Step 2: Create policy for public read access (so logos can be displayed on homepage)
CREATE POLICY "Public can view school logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'schools-images');

-- Step 3: Create policy for executive directors to upload logos
CREATE POLICY "Executive directors can upload school logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'schools-images'
  AND (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (registration = true OR registration = 'true')
    )
  )
);

-- Step 4: Create policy for executive directors to update/delete logos
CREATE POLICY "Executive directors can update school logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'schools-images'
  AND (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (registration = true OR registration = 'true')
    )
  )
)
WITH CHECK (
  bucket_id = 'schools-images'
  AND (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (registration = true OR registration = 'true')
    )
  )
);

CREATE POLICY "Executive directors can delete school logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'schools-images'
  AND (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (registration = true OR registration = 'true')
    )
  )
);

-- Verification: Check if policies were created (run this separately to verify)
-- SELECT policyname, cmd, roles FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%school%';
