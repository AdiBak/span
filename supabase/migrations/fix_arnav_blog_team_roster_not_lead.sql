-- Correct Arnav on Blog Team: roster membership only, not co-lead.
-- Applies cleanly after member_policy_teams_allow_multi_team_blog_oneoff.sql when Arnav was wrongly added as Blog Team lead.

DO $$
DECLARE
  v_blog_team_id uuid;
  v_arnav_id uuid;
BEGIN
  SELECT pt.team_id
    INTO v_blog_team_id
  FROM public.policy_teams pt
  WHERE lower(trim(pt.name)) = lower(trim('Blog Team'))
  LIMIT 1;

  SELECT m.member_id
    INTO v_arnav_id
  FROM public.members m
  WHERE lower(trim(m.first_name)) = lower(trim('Arnav'))
    AND lower(trim(m.last_name)) = lower(trim('Goyal'))
  LIMIT 1;

  IF v_blog_team_id IS NOT NULL AND v_arnav_id IS NOT NULL THEN
    DELETE FROM public.policy_team_leads ptl
    WHERE ptl.team_id = v_blog_team_id
      AND ptl.member_id = v_arnav_id;

    INSERT INTO public.member_policy_teams (member_id, team_id)
    VALUES (v_arnav_id, v_blog_team_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
