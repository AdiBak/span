-- Multiple team leads per policy team (replaces single policy_teams.lead_member_id).

-- ---------------------------------------------------------------------------
-- 1) Junction table + backfill
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.policy_team_leads (
  team_id UUID NOT NULL REFERENCES public.policy_teams (team_id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members (member_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_policy_team_leads_member ON public.policy_team_leads (member_id);

INSERT INTO public.policy_team_leads (team_id, member_id)
SELECT pt.team_id, pt.lead_member_id
FROM public.policy_teams pt
WHERE pt.lead_member_id IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE public.policy_team_leads ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.policy_team_leads IS 'Co-leads for a policy team; exec-managed.';

DROP POLICY IF EXISTS "policy_team_leads_exec_all" ON public.policy_team_leads;
CREATE POLICY "policy_team_leads_exec_all"
  ON public.policy_team_leads
  FOR ALL
  TO authenticated
  USING (public.auth_is_policy_exec())
  WITH CHECK (public.auth_is_policy_exec());

DROP POLICY IF EXISTS "policy_team_leads_lead_select_team" ON public.policy_team_leads;
CREATE POLICY "policy_team_leads_lead_select_team"
  ON public.policy_team_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.policy_team_leads ptl_self
      WHERE ptl_self.team_id = policy_team_leads.team_id
        AND ptl_self.member_id = public.current_member_id()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.policy_team_leads TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) Helper functions (multi-lead)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.member_in_team_led_by(p_member_id uuid, p_lead_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.member_policy_teams mpt
    JOIN public.policy_teams pt ON pt.team_id = mpt.team_id AND COALESCE(pt.active, true)
    JOIN public.policy_team_leads ptl ON ptl.team_id = mpt.team_id AND ptl.member_id = p_lead_member_id
    WHERE mpt.member_id = p_member_id
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_leads_a_policy_team()
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
    JOIN public.policy_teams pt ON pt.team_id = ptl.team_id AND COALESCE(pt.active, true)
    WHERE ptl.member_id = public.current_member_id()
  );
$$;

-- ---------------------------------------------------------------------------
-- 3) policy_teams: lead SELECT policy + drop legacy column
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "policy_teams_lead_select_own" ON public.policy_teams;
CREATE POLICY "policy_teams_lead_select_own"
  ON public.policy_teams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.policy_team_leads ptl
      WHERE ptl.team_id = policy_teams.team_id
        AND ptl.member_id = public.current_member_id()
    )
    AND COALESCE(policy_teams.active, true)
  );

DROP INDEX IF EXISTS idx_policy_teams_lead;

ALTER TABLE public.policy_teams DROP COLUMN IF EXISTS lead_member_id;

-- ---------------------------------------------------------------------------
-- 4) bill_assignments team-lead INSERT / SELECT creator (multi-lead join)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "bill_assignments_team_lead_insert" ON public.bill_assignments;

CREATE POLICY "bill_assignments_team_lead_insert"
  ON public.bill_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.policy_team_leads ptl
      INNER JOIN public.members lead ON lead.member_id = ptl.member_id AND lead.user_id = auth.uid()
      INNER JOIN public.policy_teams pt ON pt.team_id = ptl.team_id AND COALESCE(pt.active, true)
    )
    AND assigned_by_member_id IN (SELECT m.member_id FROM public.members m WHERE m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "bill_assignments_team_lead_select_creator" ON public.bill_assignments;

CREATE POLICY "bill_assignments_team_lead_select_creator"
  ON public.bill_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.policy_team_leads ptl
      INNER JOIN public.members lead ON lead.member_id = ptl.member_id AND lead.user_id = auth.uid()
      INNER JOIN public.policy_teams pt ON pt.team_id = ptl.team_id AND COALESCE(pt.active, true)
    )
    AND assigned_by_member_id IN (SELECT m.member_id FROM public.members m WHERE m.user_id = auth.uid())
  );
