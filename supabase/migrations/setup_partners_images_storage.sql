-- Migration: Setup partners-images storage bucket and policies
-- This allows executive directors to upload partner logos

-- Note: The bucket must be created manually in Supabase Dashboard first:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create a new bucket named "partners-images"
-- 3. Make it public (or set policies below)

-- Step 1: Enable RLS on storage.objects (if not already enabled)
-- This is usually enabled by default, but we'll ensure it

-- Step 2: Create policy for public read access (so logos can be displayed on homepage)
CREATE POLICY IF NOT EXISTS "Public can view partner logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'partners-images');

-- Step 3: Create policy for executive directors to upload logos
CREATE POLICY IF NOT EXISTS "Executive directors can upload partner logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'partners-images'
  AND (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (registration = true OR registration = 'true')
    )
  )
);

-- Step 4: Create policy for executive directors to update/delete logos
CREATE POLICY IF NOT EXISTS "Executive directors can update partner logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'partners-images'
  AND (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (registration = true OR registration = 'true')
    )
  )
)
WITH CHECK (
  bucket_id = 'partners-images'
  AND (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (registration = true OR registration = 'true')
    )
  )
);

CREATE POLICY IF NOT EXISTS "Executive directors can delete partner logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'partners-images'
  AND (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (registration = true OR registration = 'true')
    )
  )
);
