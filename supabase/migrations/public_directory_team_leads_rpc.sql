-- Public Directory Leadership: expose active team/division leads (safe fields only).
-- Source of truth = policy_team_leads on active teams; excludes Executive Directors
-- (they already have their own Leadership section).

CREATE OR REPLACE FUNCTION public.get_public_directory_team_leads()
RETURNS TABLE (
  member_id uuid,
  first_name text,
  last_name text,
  middle_name text,
  preferred_name text,
  role text,
  image text,
  linkedin text,
  team_names text
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
    m.role,
    m.image,
    m.linkedin,
    string_agg(pt.name, ', ' ORDER BY pt.name) AS team_names
  FROM public.policy_team_leads ptl
  INNER JOIN public.policy_teams pt
    ON pt.team_id = ptl.team_id
   AND COALESCE(pt.active, true)
  INNER JOIN public.members m
    ON m.member_id = ptl.member_id
   AND COALESCE(m.active, true)
   AND COALESCE(m.registration_complete, false)
  WHERE trim(COALESCE(m.role, '')) <> 'Executive Director'
  GROUP BY
    m.member_id,
    m.first_name,
    m.last_name,
    m.middle_name,
    m.preferred_name,
    m.role,
    m.image,
    m.linkedin
  ORDER BY m.last_name ASC NULLS LAST, m.first_name ASC NULLS LAST;
$$;

COMMENT ON FUNCTION public.get_public_directory_team_leads() IS
  'Public Directory Leadership tab: team/division leads with display-safe fields only.';

GRANT EXECUTE ON FUNCTION public.get_public_directory_team_leads() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_directory_team_leads() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_directory_team_leads() TO public;
