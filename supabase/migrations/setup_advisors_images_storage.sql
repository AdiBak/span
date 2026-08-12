-- Migration: Setup advisors-images storage bucket and policies
--
-- Creates the public bucket if missing, then applies RLS policies.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('advisors-images', 'advisors-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view advisor photos" ON storage.objects;
CREATE POLICY "Public can view advisor photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'advisors-images');

DROP POLICY IF EXISTS "Executive directors can upload advisor photos" ON storage.objects;
CREATE POLICY "Executive directors can upload advisor photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'advisors-images'
  AND (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE user_id = auth.uid()
      AND (registration = true OR registration = 'true')
    )
  )
);

DROP POLICY IF EXISTS "Executive directors can update advisor photos" ON storage.objects;
CREATE POLICY "Executive directors can update advisor photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'advisors-images'
  AND (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE user_id = auth.uid()
      AND (registration = true OR registration = 'true')
    )
  )
)
WITH CHECK (
  bucket_id = 'advisors-images'
  AND (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE user_id = auth.uid()
      AND (registration = true OR registration = 'true')
    )
  )
);

DROP POLICY IF EXISTS "Executive directors can delete advisor photos" ON storage.objects;
CREATE POLICY "Executive directors can delete advisor photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'advisors-images'
  AND (
    EXISTS (
      SELECT 1 FROM public.members
      WHERE user_id = auth.uid()
      AND (registration = true OR registration = 'true')
    )
  )
);
