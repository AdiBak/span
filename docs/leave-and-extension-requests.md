# Leave/Break & Project Extension Requests

**Status:** Live. Table `member_requests`. Dashboard section **Leave & Extension Requests** (directly under Your Info). Section order: [DASHBOARD_FUNCTIONS.md](./DASHBOARD_FUNCTIONS.md).

---

## Behavior

- **Leave/break:** Member submits time off with a reason and optional start/end dates; execs approve or decline.
- **Project extension:** Member submits an extension with reason and optional project name / date; execs approve or decline.
- **Calendar:** The same dashboard section also shows a **unified calendar** (birthdays, SPAN events, team-lead deadlines) from `dashboard_calendar_events`, separate from `member_requests`.
- **Team leads:** RLS limits leave visibility/updates to their policy team. Execs see all rows.

Same review pattern as other member-submitted items: submit → exec review → approve or decline (optional exec notes).

---

## Data model

One table for both types (`type` = `'leave'` or `'extension'`).

**Table: `member_requests`**

| Column         | Type        | Notes |
|----------------|-------------|--------|
| `request_id`   | UUID        | PK, default `gen_random_uuid()` |
| `member_id`    | UUID        | FK → `members(member_id)`, NOT NULL |
| `type`         | TEXT        | `'leave'` or `'extension'`, NOT NULL |
| `reason`       | TEXT        | Member’s reason, NOT NULL |
| `leave_start`  | DATE        | Optional (leave) |
| `leave_end`    | DATE        | Optional (leave) |
| `project_name`| TEXT        | Optional (extension) |
| `requested_by` | DATE        | Optional (extension “requested by” date) |
| `status`       | TEXT        | `'pending'` \| `'approved'` \| `'declined'`, default `'pending'` |
| `reviewed_by`  | UUID        | FK → `members(member_id)`, nullable |
| `reviewed_at`  | TIMESTAMPTZ | nullable |
| `review_notes` | TEXT        | Exec comment |
| `created_at`   | TIMESTAMPTZ | default NOW() |

Migration: `supabase/migrations/create_member_requests_table.sql` (plus later policy-team scope if applied).

---

## RLS

- **INSERT:** Authenticated user can insert only if `member_id` is their own (`members.user_id = auth.uid()`).
- **SELECT:** Members: own rows. Execs: all rows. Team leads: their team (see policy-team migrations).
- **UPDATE:** Execs (and scoped team leads): `status`, `reviewed_by`, `reviewed_at`, `review_notes`.

---

## Data loading and reviewer display

- The app sets `reviewed_by`, `reviewed_at`, `review_notes` when an exec (or team lead) approves or declines.
- `loadMyRequests` and `loadAllMemberRequests` attach **`reviewed_by_member`** for the Request View modal.
- **View-as:** view-member-dashboard enriches `leave_requests` with `reviewed_by_member`.

---

## Dashboard UI

**Member view**

- Submit leave vs extension. Leave: reason (required), optional start/end. Extension: reason (required), optional project name, optional “requested by” date. Insert with `status = 'pending'`.
- List of own requests. Columns: Type, Reason, Details, Status, Submitted, **View**. Reviewed-by / notes only in the modal.

**Exec / team-lead view**

- Filters: All | Pending | Approved | Declined.
- Table adds **Member**. Approve/decline only inside the **Request View** modal (optional review notes).

**Request View modal**

- Member (name, email), Type, Reason, Details, Status, Submitted, **Reviewed by** if set, **Review notes** if set.
- Reviewer controls on pending rows for execs / scoped team leads.
