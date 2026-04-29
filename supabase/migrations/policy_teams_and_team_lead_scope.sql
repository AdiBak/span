-- Policy teams (bill/policy analysts) + team-scoped access for team leads.
-- Execs retain full oversight (existing all-four-flags policies unchanged).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.policy_teams (
  team_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lead_member_id UUID REFERENCES public.members (member_id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_policy_teams_name_lower ON public.policy_teams (lower(trim(name)));

CREATE TABLE IF NOT EXISTS public.member_policy_teams (
  member_id UUID NOT NULL REFERENCES public.members (member_id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.policy_teams (team_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, team_id)
);

-- One policy team per member (four teams partition bill-team members).
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_policy_teams_one_team ON public.member_policy_teams (member_id);

CREATE INDEX IF NOT EXISTS idx_member_policy_teams_team ON public.member_policy_teams (team_id);
CREATE INDEX IF NOT EXISTS idx_policy_teams_lead ON public.policy_teams (lead_member_id) WHERE lead_member_id IS NOT NULL;

COMMENT ON TABLE public.policy_teams IS 'Bill/policy analyst teams; exec-managed; team lead has scoped dashboard powers.';
COMMENT ON TABLE public.member_policy_teams IS 'Membership linking members (typically bills=true) to exactly one policy team.';

ALTER TABLE public.policy_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_policy_teams ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER; avoid RLS recursion)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_member_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT member_id FROM public.members WHERE user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_member_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_policy_exec_member(p_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.member_id = p_member_id
      AND (m.volunteer = true OR m.volunteer = 'true')
      AND (m.applications = true OR m.applications = 'true')
      AND (m.bills = true OR m.bills = 'true')
      AND (m.registration = true OR m.registration = 'true')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_policy_exec_member(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.auth_is_policy_exec()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public.is_policy_exec_member(public.current_member_id());
$$;

GRANT EXECUTE ON FUNCTION public.auth_is_policy_exec() TO authenticated;

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
    WHERE mpt.member_id = p_member_id
      AND pt.lead_member_id IS NOT NULL
      AND pt.lead_member_id = p_lead_member_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.member_in_team_led_by(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.member_in_any_team_led_by_current_user(p_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public.member_in_team_led_by(p_member_id, public.current_member_id());
$$;

GRANT EXECUTE ON FUNCTION public.member_in_any_team_led_by_current_user(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.current_user_leads_a_policy_team()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.policy_teams pt
    WHERE pt.lead_member_id = public.current_member_id()
      AND COALESCE(pt.active, true)
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_leads_a_policy_team() TO authenticated;

-- All assignees are in at least one team led by the current user (same lead).
CREATE OR REPLACE FUNCTION public.bill_assignment_team_lead_access(p_assignment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_me uuid;
  v_n int;
BEGIN
  v_me := public.current_member_id();
  IF v_me IS NULL THEN
    RETURN false;
  END IF;
  IF NOT public.current_user_leads_a_policy_team() THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.bill_assignments ba WHERE ba.assignment_id = p_assignment_id) THEN
    RETURN false;
  END IF;

  SELECT COUNT(*) INTO v_n FROM public.bill_assignment_assignees WHERE assignment_id = p_assignment_id;

  -- Open pool / no assignees yet: only the creator can manage if they are a team lead (scoped listing).
  IF v_n = 0 THEN
    RETURN EXISTS (
      SELECT 1 FROM public.bill_assignments ba
      WHERE ba.assignment_id = p_assignment_id
        AND ba.assigned_by_member_id = v_me
    );
  END IF;

  RETURN NOT EXISTS (
    SELECT 1
    FROM public.bill_assignment_assignees baa
    WHERE baa.assignment_id = p_assignment_id
      AND NOT public.member_in_any_team_led_by_current_user(baa.member_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.bill_assignment_team_lead_access(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS: policy_teams
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "policy_teams_exec_all" ON public.policy_teams;
CREATE POLICY "policy_teams_exec_all"
  ON public.policy_teams
  FOR ALL
  TO authenticated
  USING (public.auth_is_policy_exec())
  WITH CHECK (public.auth_is_policy_exec());

DROP POLICY IF EXISTS "policy_teams_lead_select_own" ON public.policy_teams;
CREATE POLICY "policy_teams_lead_select_own"
  ON public.policy_teams
  FOR SELECT
  TO authenticated
  USING (
    lead_member_id = public.current_member_id()
    AND COALESCE(active, true)
  );

-- ---------------------------------------------------------------------------
-- RLS: member_policy_teams
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "member_policy_teams_exec_all" ON public.member_policy_teams;
CREATE POLICY "member_policy_teams_exec_all"
  ON public.member_policy_teams
  FOR ALL
  TO authenticated
  USING (public.auth_is_policy_exec())
  WITH CHECK (public.auth_is_policy_exec());

DROP POLICY IF EXISTS "member_policy_teams_member_select_own" ON public.member_policy_teams;
CREATE POLICY "member_policy_teams_member_select_own"
  ON public.member_policy_teams
  FOR SELECT
  TO authenticated
  USING (member_id = public.current_member_id());

DROP POLICY IF EXISTS "member_policy_teams_lead_select_scope" ON public.member_policy_teams;
CREATE POLICY "member_policy_teams_lead_select_scope"
  ON public.member_policy_teams
  FOR SELECT
  TO authenticated
  USING (
    public.member_in_team_led_by(member_id, public.current_member_id())
  );

-- ---------------------------------------------------------------------------
-- RLS: members — team leads can view roster members on teams they lead
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Team leads can view members on their teams" ON public.members;
CREATE POLICY "Team leads can view members on their teams"
  ON public.members
  FOR SELECT
  TO authenticated
  USING (
    public.member_in_team_led_by(members.member_id, public.current_member_id())
  );

-- ---------------------------------------------------------------------------
-- RLS: member_requests — team leads review own team's requests
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Team leads can view team member requests" ON public.member_requests;
CREATE POLICY "Team leads can view team member requests"
  ON public.member_requests
  FOR SELECT
  TO authenticated
  USING (
    public.member_in_any_team_led_by_current_user(member_requests.member_id)
  );

DROP POLICY IF EXISTS "Team leads can update team member requests" ON public.member_requests;
CREATE POLICY "Team leads can update team member requests"
  ON public.member_requests
  FOR UPDATE
  TO authenticated
  USING (
    public.member_in_any_team_led_by_current_user(member_requests.member_id)
  )
  WITH CHECK (
    public.member_in_any_team_led_by_current_user(member_requests.member_id)
  );

-- ---------------------------------------------------------------------------
-- RLS: bill_assignments — team leads scoped to assignments for their team
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "bill_assignments_team_lead_select" ON public.bill_assignments;
CREATE POLICY "bill_assignments_team_lead_select"
  ON public.bill_assignments
  FOR SELECT
  TO authenticated
  USING (public.bill_assignment_team_lead_access(assignment_id));

DROP POLICY IF EXISTS "bill_assignments_team_lead_insert" ON public.bill_assignments;
CREATE POLICY "bill_assignments_team_lead_insert"
  ON public.bill_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_leads_a_policy_team()
    AND assigned_by_member_id = public.current_member_id()
    AND EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.member_id = public.current_member_id()
        AND (m.bills = true OR m.bills = 'true')
    )
  );

DROP POLICY IF EXISTS "bill_assignments_team_lead_update" ON public.bill_assignments;
CREATE POLICY "bill_assignments_team_lead_update"
  ON public.bill_assignments
  FOR UPDATE
  TO authenticated
  USING (public.bill_assignment_team_lead_access(assignment_id))
  WITH CHECK (public.bill_assignment_team_lead_access(assignment_id));

DROP POLICY IF EXISTS "bill_assignments_team_lead_delete" ON public.bill_assignments;
CREATE POLICY "bill_assignments_team_lead_delete"
  ON public.bill_assignments
  FOR DELETE
  TO authenticated
  USING (
    public.bill_assignment_team_lead_access(assignment_id)
    AND assigned_by_member_id = public.current_member_id()
  );

-- ---------------------------------------------------------------------------
-- RLS: bill_assignment_assignees — team leads manage assignees on scoped rows
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "bill_assignment_assignees_team_lead_all" ON public.bill_assignment_assignees;
CREATE POLICY "bill_assignment_assignees_team_lead_all"
  ON public.bill_assignment_assignees
  FOR ALL
  TO authenticated
  USING (
    public.bill_assignment_team_lead_access(assignment_id)
    AND public.member_in_any_team_led_by_current_user(member_id)
  )
  WITH CHECK (
    public.bill_assignment_team_lead_access(assignment_id)
    AND public.member_in_any_team_led_by_current_user(member_id)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.policy_teams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_policy_teams TO authenticated;
