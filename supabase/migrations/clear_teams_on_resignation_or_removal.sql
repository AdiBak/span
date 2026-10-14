-- When membership ends (honorable resignation letter or removal/firing letter),
-- deactivate the member and clear policy/staff team roster + lead links.
-- Extends clear_team_membership_on_member_deactivate (trigger on active → false).

-- One-off: Shreekar Addula resigned but remained on Short Term Policy team.
UPDATE public.members
SET active = false
WHERE lower(trim(first_name)) = 'shreekar'
  AND lower(trim(last_name)) = 'addula'
  AND active IS DISTINCT FROM false;

-- Backfill: anyone with a terminal exit letter who is still active.
UPDATE public.members m
SET active = false
WHERE m.active IS DISTINCT FROM false
  AND (
    EXISTS (
      SELECT 1
      FROM public.member_resignations r
      WHERE r.member_id = m.member_id
        AND r.status = 'honorable_letter_sent'
    )
    OR EXISTS (
      SELECT 1
      FROM public.member_removal_proposals p
      WHERE p.member_id = m.member_id
        AND p.status = 'removal_letter_sent'
    )
  );

-- Backfill: drop team rows for inactive members (covers envs missing prior migration).
DELETE FROM public.member_policy_teams mpt
USING public.members m
WHERE m.member_id = mpt.member_id
  AND m.active IS FALSE;

DELETE FROM public.policy_team_leads ptl
USING public.members m
WHERE m.member_id = ptl.member_id
  AND m.active IS FALSE;
