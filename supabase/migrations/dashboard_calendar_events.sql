-- Dashboard calendar: org SPAN events + team-lead deadlines.
-- Birthdays stay derived from members.dob (see list_active_member_birthdays).

CREATE TABLE IF NOT EXISTS public.dashboard_calendar_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('span_event', 'deadline')),
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  team_id UUID REFERENCES public.policy_teams (team_id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.members (member_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dashboard_calendar_events_kind_team_chk CHECK (
    (kind = 'span_event' AND team_id IS NULL)
    OR (kind = 'deadline' AND team_id IS NOT NULL)
  ),
  CONSTRAINT dashboard_calendar_events_dates_chk CHECK (
    end_date IS NULL OR end_date >= start_date
  )
);

CREATE INDEX IF NOT EXISTS idx_dashboard_calendar_events_start
  ON public.dashboard_calendar_events (start_date);
CREATE INDEX IF NOT EXISTS idx_dashboard_calendar_events_kind
  ON public.dashboard_calendar_events (kind);
CREATE INDEX IF NOT EXISTS idx_dashboard_calendar_events_team
  ON public.dashboard_calendar_events (team_id);

COMMENT ON TABLE public.dashboard_calendar_events IS
  'Org SPAN events (exec-managed) and team deadlines (team-lead managed) for the leave/extension calendar.';

ALTER TABLE public.dashboard_calendar_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_calendar_events TO authenticated;

-- Current user leads a specific team (multi-lead table).
CREATE OR REPLACE FUNCTION public.current_user_leads_team(p_team_id uuid)
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
    WHERE ptl.team_id = p_team_id
      AND ptl.member_id = public.current_member_id()
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_leads_team(uuid) TO authenticated;

-- Current user is rostered on a specific team.
CREATE OR REPLACE FUNCTION public.current_user_on_team(p_team_id uuid)
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
    WHERE mpt.team_id = p_team_id
      AND mpt.member_id = public.current_member_id()
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_on_team(uuid) TO authenticated;

-- Birthdays for calendar (bypass members SELECT RLS for authenticated dashboard users).
CREATE OR REPLACE FUNCTION public.list_active_member_birthdays()
RETURNS TABLE (
  member_id uuid,
  first_name text,
  last_name text,
  dob date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT m.member_id, m.first_name, m.last_name, m.dob
  FROM public.members m
  WHERE COALESCE(m.active, true)
    AND m.dob IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.list_active_member_birthdays() TO authenticated;

-- SELECT: all authenticated can read SPAN events; deadlines if on/lead team or exec.
DROP POLICY IF EXISTS "dashboard_calendar_events_select" ON public.dashboard_calendar_events;
CREATE POLICY "dashboard_calendar_events_select"
  ON public.dashboard_calendar_events
  FOR SELECT
  TO authenticated
  USING (
    kind = 'span_event'
    OR public.auth_is_policy_exec()
    OR public.current_user_leads_team(team_id)
    OR public.current_user_on_team(team_id)
  );

-- INSERT
DROP POLICY IF EXISTS "dashboard_calendar_events_insert" ON public.dashboard_calendar_events;
CREATE POLICY "dashboard_calendar_events_insert"
  ON public.dashboard_calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      kind = 'span_event'
      AND team_id IS NULL
      AND public.auth_is_policy_exec()
    )
    OR (
      kind = 'deadline'
      AND team_id IS NOT NULL
      AND (
        public.auth_is_policy_exec()
        OR public.current_user_leads_team(team_id)
      )
    )
  );

-- UPDATE
DROP POLICY IF EXISTS "dashboard_calendar_events_update" ON public.dashboard_calendar_events;
CREATE POLICY "dashboard_calendar_events_update"
  ON public.dashboard_calendar_events
  FOR UPDATE
  TO authenticated
  USING (
    (
      kind = 'span_event'
      AND public.auth_is_policy_exec()
    )
    OR (
      kind = 'deadline'
      AND (
        public.auth_is_policy_exec()
        OR public.current_user_leads_team(team_id)
      )
    )
  )
  WITH CHECK (
    (
      kind = 'span_event'
      AND team_id IS NULL
      AND public.auth_is_policy_exec()
    )
    OR (
      kind = 'deadline'
      AND team_id IS NOT NULL
      AND (
        public.auth_is_policy_exec()
        OR public.current_user_leads_team(team_id)
      )
    )
  );

-- DELETE
DROP POLICY IF EXISTS "dashboard_calendar_events_delete" ON public.dashboard_calendar_events;
CREATE POLICY "dashboard_calendar_events_delete"
  ON public.dashboard_calendar_events
  FOR DELETE
  TO authenticated
  USING (
    (
      kind = 'span_event'
      AND public.auth_is_policy_exec()
    )
    OR (
      kind = 'deadline'
      AND (
        public.auth_is_policy_exec()
        OR public.current_user_leads_team(team_id)
      )
    )
  );
