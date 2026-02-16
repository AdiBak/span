-- Allow execs to upload/update/delete any profile image in members-images
-- So they can change members' profile pictures from Member Management

DROP POLICY IF EXISTS "Execs can upload member profile images" ON storage.objects;
DROP POLICY IF EXISTS "Execs can update member profile images" ON storage.objects;
DROP POLICY IF EXISTS "Execs can delete member profile images" ON storage.objects;

CREATE POLICY "Execs can upload member profile images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'members-images'
  AND public.has_registration_permission()
);

CREATE POLICY "Execs can update member profile images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'members-images'
  AND public.has_registration_permission()
)
WITH CHECK (
  bucket_id = 'members-images'
  AND public.has_registration_permission()
);

CREATE POLICY "Execs can delete member profile images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'members-images'
  AND public.has_registration_permission()
);
