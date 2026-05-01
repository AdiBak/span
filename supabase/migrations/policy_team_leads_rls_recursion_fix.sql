-- Fix 42P17 infinite recursion on policy_team_leads: the lead SELECT policy queried
-- policy_team_leads inside its own USING clause, re-entering RLS. Use SECURITY DEFINER
-- + row_security off for the membership check (same pattern as current_member_id()).

CREATE OR REPLACE FUNCTION public.policy_team_lead_can_view_team_leads(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.policy_team_leads ptl
    WHERE ptl.team_id = p_team_id
      AND ptl.member_id = public.current_member_id()
  );
$$;

GRANT EXECUTE ON FUNCTION public.policy_team_lead_can_view_team_leads(uuid) TO authenticated;

DROP POLICY IF EXISTS "policy_team_leads_lead_select_team" ON public.policy_team_leads;

CREATE POLICY "policy_team_leads_lead_select_team"
  ON public.policy_team_leads
  FOR SELECT
  TO authenticated
  USING (public.policy_team_lead_can_view_team_leads(team_id));

-- Same helper avoids scanning policy_team_leads under policy_teams RLS (simpler + consistent).
DROP POLICY IF EXISTS "policy_teams_lead_select_own" ON public.policy_teams;
CREATE POLICY "policy_teams_lead_select_own"
  ON public.policy_teams
  FOR SELECT
  TO authenticated
  USING (
    public.policy_team_lead_can_view_team_leads(policy_teams.team_id)
    AND COALESCE(policy_teams.active, true)
  );
