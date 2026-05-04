-- Staff teams (marketing, blog, etc.) share policy_teams/member_policy_teams/policy_team_leads
-- but allow any active member on roster; assignments use existing bill_assignments flow.

ALTER TABLE public.policy_teams
  ADD COLUMN IF NOT EXISTS team_kind TEXT NOT NULL DEFAULT 'policy';

ALTER TABLE public.policy_teams DROP CONSTRAINT IF EXISTS policy_teams_team_kind_check;
ALTER TABLE public.policy_teams ADD CONSTRAINT policy_teams_team_kind_check
  CHECK (team_kind IN ('policy', 'marketing', 'blog', 'general'));

COMMENT ON COLUMN public.policy_teams.team_kind IS
  'policy = bill-policy analysts (Bill permission); marketing/blog/general = staff teams with assignments; roster may include any member.';
