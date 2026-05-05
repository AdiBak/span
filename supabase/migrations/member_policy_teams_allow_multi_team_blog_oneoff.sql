-- One-time provisioning:
-- - Allow members to belong to multiple teams in member_policy_teams
-- - Add Arnav Goyal as a lead on Blog Team (while keeping existing Team 2 lead role)
-- - Add Kaulini Chakraborty as a member of Blog Team (while keeping existing Team 2 membership)

-- Remove single-team-per-member constraint so one member can be in multiple teams.
DROP INDEX IF EXISTS public.idx_member_policy_teams_one_team;

DO $$
DECLARE
  v_team2_id uuid;
  v_blog_team_id uuid;
  v_arnav_id uuid;
  v_kaulini_id uuid;
BEGIN
  SELECT pt.team_id
    INTO v_team2_id
  FROM public.policy_teams pt
  WHERE lower(trim(pt.name)) = lower(trim('Team 2'))
  LIMIT 1;

  IF v_team2_id IS NULL THEN
    RAISE EXCEPTION 'Provisioning failed: policy team "%" not found.', 'Team 2';
  END IF;

  SELECT pt.team_id
    INTO v_blog_team_id
  FROM public.policy_teams pt
  WHERE lower(trim(pt.name)) = lower(trim('Blog Team'))
  LIMIT 1;

  IF v_blog_team_id IS NULL THEN
    RAISE EXCEPTION 'Provisioning failed: policy team "%" not found.', 'Blog Team';
  END IF;

  SELECT m.member_id
    INTO v_arnav_id
  FROM public.members m
  WHERE lower(trim(m.first_name)) = lower(trim('Arnav'))
    AND lower(trim(m.last_name)) = lower(trim('Goyal'))
  LIMIT 1;

  IF v_arnav_id IS NULL THEN
    RAISE EXCEPTION 'Provisioning failed: member "%" "%" not found.', 'Arnav', 'Goyal';
  END IF;

  SELECT m.member_id
    INTO v_kaulini_id
  FROM public.members m
  WHERE lower(trim(m.first_name)) = lower(trim('Kaulini'))
    AND lower(trim(m.last_name)) = lower(trim('Chakraborty'))
  LIMIT 1;

  IF v_kaulini_id IS NULL THEN
    RAISE EXCEPTION 'Provisioning failed: member "%" "%" not found.', 'Kaulini', 'Chakraborty';
  END IF;

  -- Ensure Arnav remains/exists on Team 2 as a lead and is also a lead on Blog Team.
  INSERT INTO public.policy_team_leads (team_id, member_id)
  VALUES
    (v_team2_id, v_arnav_id),
    (v_blog_team_id, v_arnav_id)
  ON CONFLICT DO NOTHING;

  -- Ensure Kaulini remains/exists on Team 2 roster and is also on Blog Team roster.
  INSERT INTO public.member_policy_teams (member_id, team_id)
  VALUES
    (v_kaulini_id, v_team2_id),
    (v_kaulini_id, v_blog_team_id)
  ON CONFLICT DO NOTHING;
END $$;
