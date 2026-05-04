# Policy teams & team-lead scope migration

## Applying on Supabase

1. Run the SQL migrations against your project (CLI or SQL Editor), in order:
   - `supabase/migrations/policy_teams_and_team_lead_scope.sql`
   - `supabase/migrations/bill_assignments_team_lead_insert_scope_fix.sql` (if not already applied)
   - `supabase/migrations/policy_team_leads_multiple.sql` (multiple co-leads per team; drops `policy_teams.lead_member_id` after backfill). If dropping that column failed with **dependent objects** (`bill_assignments_team_lead_*` policies), update this repo and re-run the migration file: it now drops those policies *before* dropping the column.
   - `supabase/migrations/policy_team_leads_rls_recursion_fix.sql` — fixes **42P17** infinite RLS recursion on `policy_team_leads` (lead SELECT policy must not subquery the same table without `SECURITY DEFINER` / `row_security off`).
   - `supabase/migrations/policy_teams_team_kind.sql` — adds `team_kind` (`policy` | `marketing` | `blog` | `general`) so staff teams can include any member; existing rows default to `policy`.
2. Confirm tables exist: `policy_teams`, `member_policy_teams`, `policy_team_leads`.
3. No app deploy is required beyond merging this repo; ensure env points at the updated DB.

## Behavior summary

- **Executives** (all four permission flags): unchanged global access; **Member Management** includes **Policy teams** to create teams, set one or more co-leads per team in `policy_team_leads` (member must have Bill permission and `"team lead"` in role), and assign Bill-permission members to exactly one team.
- **Team leads** (`policy_team_leads`): RLS limits leave-request visibility/updates and bill-assignment operations to their team; dashboard shows team-scoped leave queue and **Team — Assigned work** (no publish-to-site actions).
- **Members**: unchanged unless given team membership.

## Manual QA checklist

| Role | Leave requests | Bill assignments |
|------|----------------|------------------|
| Exec | All rows; approve/decline | Full exec Bill Management |
| Team lead | Team members only | Assign/edit/delete own-created assignments per RLS; assignees only from team roster in UI |
| Bill member (non-lead) | Own requests only | Claim/completion flows unchanged |

## Rollback

Drop policies/tables only after confirming no FK references are needed; prefer restoring from backup before destructive rollback.
