-- When a member is deactivated (fired / directory hidden), remove them from
-- policy/staff team rosters and lead assignments so they no longer appear
-- under their old team.

CREATE OR REPLACE FUNCTION public.clear_team_membership_on_member_deactivate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NEW.active IS FALSE AND (OLD.active IS DISTINCT FROM FALSE) THEN
    DELETE FROM public.member_policy_teams WHERE member_id = NEW.member_id;
    DELETE FROM public.policy_team_leads WHERE member_id = NEW.member_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_team_membership_on_member_deactivate ON public.members;
CREATE TRIGGER trg_clear_team_membership_on_member_deactivate
  AFTER UPDATE OF active ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_team_membership_on_member_deactivate();

-- Backfill: anyone already inactive should not remain on a team.
DELETE FROM public.member_policy_teams mpt
USING public.members m
WHERE m.member_id = mpt.member_id
  AND m.active IS FALSE;

DELETE FROM public.policy_team_leads ptl
USING public.members m
WHERE m.member_id = ptl.member_id
  AND m.active IS FALSE;
