-- Migration: Setup applications-resumes storage bucket and policies
-- This allows public users to upload resumes with their applications

-- Note: The bucket must be created manually in Supabase Dashboard first:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create a new bucket named "applications-resumes"
-- 3. Make it public (or set policies below)

-- Step 1: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public can upload resumes" ON storage.objects;
DROP POLICY IF EXISTS "Public can view resumes" ON storage.objects;
DROP POLICY IF EXISTS "Executive directors can view resumes" ON storage.objects;
DROP POLICY IF EXISTS "Executive directors can delete resumes" ON storage.objects;

-- Step 2: Create policy for public users to upload resumes (for application submissions)
CREATE POLICY "Public can upload resumes"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'applications-resumes'
  AND (storage.foldername(name))[1] IS NOT NULL -- Ensure file is in a folder (e.g., by date)
);

-- Step 3: Create policy for public read access (so resumes can be viewed)
CREATE POLICY "Public can view resumes"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'applications-resumes');

-- Step 4: Create policy for executive directors to view resumes
CREATE POLICY "Executive directors can view resumes"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'applications-resumes'
  AND (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (registration = true OR registration = 'true')
    )
  )
);

-- Step 5: Create policy for executive directors to delete resumes
CREATE POLICY "Executive directors can delete resumes"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'applications-resumes'
  AND (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() 
      AND (registration = true OR registration = 'true')
    )
  )
);
