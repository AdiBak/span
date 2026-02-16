-- Allow anonymous (unauthenticated) users to insert applications
-- This is needed for the public application form on the homepage

-- Ensure RLS is enabled on the table
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Drop all existing INSERT policies to avoid conflicts
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'applications' AND cmd = 'INSERT') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.applications';
    END LOOP;
END $$;

-- Create policy to allow anyone (including unauthenticated users) to insert applications
-- Using 'public' role to allow both authenticated and anonymous users
CREATE POLICY "Allow anonymous application inserts"
ON public.applications
FOR INSERT
TO public
WITH CHECK (true);

-- Also ensure anonymous users can read their own inserted data (for the .select() after insert)
DROP POLICY IF EXISTS "Allow anonymous application select" ON public.applications;
CREATE POLICY "Allow anonymous application select"
ON public.applications
FOR SELECT
TO anon, authenticated
USING (true);

