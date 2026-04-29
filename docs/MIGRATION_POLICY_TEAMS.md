# Policy teams & team-lead scope migration

## Applying on Supabase

1. Run the SQL migration against your project (CLI or SQL Editor):
   - File: `supabase/migrations/policy_teams_and_team_lead_scope.sql`
2. Confirm tables exist: `policy_teams`, `member_policy_teams`.
3. No app deploy is required beyond merging this repo; ensure env points at the updated DB.

## Behavior summary

- **Executives** (all four permission flags): unchanged global access; **Member Management** includes **Policy teams** to create teams, set leads (member must have Bill permission and `"team lead"` in role), and assign Bill-permission members to exactly one team.
- **Team leads** (`policy_teams.lead_member_id`): RLS limits leave-request visibility/updates and bill-assignment operations to their team; dashboard shows team-scoped leave queue and **Team — Assigned work** (no publish-to-site actions).
- **Members**: unchanged unless given team membership.

## Manual QA checklist

| Role | Leave requests | Bill assignments |
|------|----------------|------------------|
| Exec | All rows; approve/decline | Full exec Bill Management |
| Team lead | Team members only | Assign/edit/delete own-created assignments per RLS; assignees only from team roster in UI |
| Bill member (non-lead) | Own requests only | Claim/completion flows unchanged |

## Rollback

Drop policies/tables only after confirming no FK references are needed; prefer restoring from backup before destructive rollback.
