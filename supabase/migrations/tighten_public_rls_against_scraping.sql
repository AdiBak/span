-- Tighten public/anon access against table+storage scraping.
-- Public UI should use the SECURITY DEFINER RPCs below (safe columns only).
-- Run in Supabase SQL Editor after reviewing; then deploy the matching frontend.

-- ---------------------------------------------------------------------------
-- 1) applications: stop anon full-table SELECT (PII)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow anonymous application select" ON public.applications;

-- Staff SELECT policies (applications permission / exec) remain unchanged.
-- Join form inserts without needing a follow-up SELECT (client supplies application_id).

-- ---------------------------------------------------------------------------
-- 2) applications-resumes: private reads (upload stays public for the form)
-- ---------------------------------------------------------------------------
UPDATE storage.buckets
SET public = false
WHERE id = 'applications-resumes';

DROP POLICY IF EXISTS "Public can view resumes" ON storage.objects;

-- Authenticated staff with applications permission (or full exec set) can read
DROP POLICY IF EXISTS "Executive directors can view resumes" ON storage.objects;
DROP POLICY IF EXISTS "Applications staff can view resumes" ON storage.objects;
CREATE POLICY "Applications staff can view resumes"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'applications-resumes'
  AND EXISTS (
    SELECT 1
    FROM public.members m
    WHERE m.user_id = auth.uid()
      AND (m.applications = true OR m.applications = 'true')
  )
);

DROP POLICY IF EXISTS "Executive directors can delete resumes" ON storage.objects;
DROP POLICY IF EXISTS "Applications staff can delete resumes" ON storage.objects;
CREATE POLICY "Applications staff can delete resumes"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'applications-resumes'
  AND EXISTS (
    SELECT 1
    FROM public.members m
    WHERE m.user_id = auth.uid()
      AND (m.applications = true OR m.applications = 'true')
  )
);

-- Keep public INSERT for the join form (filenames are timestamped + opaque)
-- "Public can upload resumes" from setup_applications_resumes_storage.sql

-- ---------------------------------------------------------------------------
-- 3) members: public reads only via RPC (drop common broad anon policies)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view members" ON public.members;
DROP POLICY IF EXISTS "Public can view active members" ON public.members;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.members;
DROP POLICY IF EXISTS "Allow anonymous read" ON public.members;
DROP POLICY IF EXISTS "Allow public read access" ON public.members;
DROP POLICY IF EXISTS "anon can select members" ON public.members;

-- Drop any leftover SELECT policies that grant anon (or PUBLIC role) table-wide reads.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'members'
      AND cmd = 'SELECT'
      AND (
        roles = '{public}'
        OR roles = '{anon}'
        OR (roles @> ARRAY['anon']::name[] AND NOT roles @> ARRAY['authenticated']::name[])
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.members', r.policyname);
  END LOOP;
END $$;

-- Bills editors need member names for collaborators (authenticated only).
-- Use SECURITY DEFINER helper to avoid RLS recursion on members.
CREATE OR REPLACE FUNCTION public.has_bills_permission()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_permission BOOLEAN;
BEGIN
  SELECT (bills = true OR bills = 'true')
  INTO v_has_permission
  FROM public.members
  WHERE user_id = auth.uid()
  LIMIT 1;

  RETURN COALESCE(v_has_permission, false);
END;
$$;

REVOKE ALL ON FUNCTION public.has_bills_permission() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_bills_permission() TO authenticated;

DROP POLICY IF EXISTS "Members with bills permission can view members" ON public.members;
CREATE POLICY "Members with bills permission can view members"
ON public.members
FOR SELECT
TO authenticated
USING (public.has_bills_permission());

CREATE OR REPLACE FUNCTION public.get_public_directory_members(
  p_require_registration boolean DEFAULT true,
  p_role text DEFAULT NULL
)
RETURNS TABLE (
  member_id uuid,
  first_name text,
  last_name text,
  middle_name text,
  preferred_name text,
  school_name text,
  city text,
  state text,
  email text,
  role text,
  image text,
  bio text,
  linkedin text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    m.member_id,
    m.first_name,
    m.last_name,
    m.middle_name,
    m.preferred_name,
    m.school_name,
    m.city,
    m.state,
    m.email,
    m.role,
    m.image,
    m.bio,
    m.linkedin
  FROM public.members m
  WHERE COALESCE(m.active, true)
    AND (
      NOT p_require_registration
      OR COALESCE(m.registration_complete, false)
    )
    AND (
      p_role IS NULL
      OR trim(COALESCE(m.role, '')) = trim(p_role)
    )
  ORDER BY m.last_name ASC NULLS LAST, m.first_name ASC NULLS LAST;
$$;

COMMENT ON FUNCTION public.get_public_directory_members(boolean, text) IS
  'Public site: directory / team / blog / bill collaborator display fields only (no phones, notes, permission flags).';

REVOKE ALL ON FUNCTION public.get_public_directory_members(boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_directory_members(boolean, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_directory_members(boolean, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) bills: public reads only via RPC; staff keep table SELECT
-- ---------------------------------------------------------------------------
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view bills" ON public.bills;
DROP POLICY IF EXISTS "Public can view approved bills" ON public.bills;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.bills;
DROP POLICY IF EXISTS "Allow anonymous read" ON public.bills;
DROP POLICY IF EXISTS "Allow public read access" ON public.bills;
DROP POLICY IF EXISTS "anon can select bills" ON public.bills;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bills'
      AND cmd = 'SELECT'
      AND (
        roles = '{public}'
        OR roles = '{anon}'
        OR (roles @> ARRAY['anon']::name[] AND NOT roles @> ARRAY['authenticated']::name[])
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bills', r.policyname);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Members with bills permission can select bills" ON public.bills;
CREATE POLICY "Members with bills permission can select bills"
ON public.bills
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.members m
    WHERE m.user_id = auth.uid()
      AND (m.bills = true OR m.bills = 'true')
  )
);

DROP POLICY IF EXISTS "Submitters can select own bills" ON public.bills;
CREATE POLICY "Submitters can select own bills"
ON public.bills
FOR SELECT
TO authenticated
USING (
  submitted_by IS NOT NULL
  AND submitted_by = (
    SELECT m.member_id
    FROM public.members m
    WHERE m.user_id = auth.uid()
    LIMIT 1
  )
);

CREATE OR REPLACE FUNCTION public.get_public_bills()
RETURNS TABLE (
  bill_id integer,
  state text,
  name text,
  "position" text,
  description text,
  bill_date date,
  legiscan_link text,
  bill_collaborators jsonb,
  status text,
  proposal_pdf_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    b.bill_id,
    b.state,
    b.name,
    b.position,
    b.description,
    b.bill_date,
    b.legiscan_link,
    b.bill_collaborators,
    b.status,
    b.proposal_pdf_url
  FROM public.bills b
  WHERE COALESCE(b.hidden, false) = false
    AND (
      b.status IS NULL
      OR b.status IN ('approved', 'modified')
    )
    AND b.status IS DISTINCT FROM 'outreach_only'
  ORDER BY b.bill_date DESC NULLS LAST, b.bill_id DESC;
$$;

COMMENT ON FUNCTION public.get_public_bills() IS
  'Public Bills page / homepage preview / stats: approved visible bills, no internal review fields.';

REVOKE ALL ON FUNCTION public.get_public_bills() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_bills() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_bills() TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) proposals storage: no public list/select via API (CDN public URLs unchanged)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view proposals" ON storage.objects;
DROP POLICY IF EXISTS "Public can select proposals" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view proposals" ON storage.objects;

DROP POLICY IF EXISTS "Members with bills permission can select proposals" ON storage.objects;
CREATE POLICY "Members with bills permission can select proposals"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'proposals'
  AND EXISTS (
    SELECT 1
    FROM public.members m
    WHERE m.user_id = auth.uid()
      AND (m.bills = true OR m.bills = 'true')
  )
);

-- Note: if proposals bucket stays public=true, direct object URLs still work (CDN).
-- Listing via storage.list() as anon should fail after this migration.

-- ---------------------------------------------------------------------------
-- Post-apply checks (run manually in SQL editor)
-- ---------------------------------------------------------------------------
-- SELECT schemaname, tablename, policyname, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('members', 'bills', 'applications')
-- ORDER BY tablename, policyname;
--
-- SELECT name, public FROM storage.buckets
-- WHERE id IN ('applications-resumes', 'proposals');
--
-- If directory still works via table SELECT for anon, find and drop the leftover
-- public/anon SELECT policy on members (name may differ from the DROP list above).
