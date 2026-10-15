# Dashboard: member experience & exec actions

The dashboard is a single page (`src/pages/DashboardPage.jsx`) that shows or hides sections based on the logged-in person. Mentors are not `members` rows; they get a smaller dashboard (see **Mentors** below). For members, visibility follows permission flags. **Exec** = `volunteer`, `applications`, `bills`, and `registration` all true. `blog` is a fifth flag for Medium / policy briefs.

**Section order** — Main dashboard sections are in a flex container with CSS `order`. Sections that don’t apply use `order: 99`. Canonical ids/labels: `src/pages/dashboard/dashboardSectionAnchors.js`.

- **Members** (no extra flags): Your Info → Leave & Extension Requests → Volunteer Hours → Ideas & Suggestions → HR Reports → Change Password → Resign from SPAN. **Bill Submission** appears if they have bills permission (or assigned work). **Medium** appears if they have blog permission.
- **Team leads** (not exec): same as members, plus **Team — Assigned work** (bills permission) in the Bill Management slot. Publishing to the public site stays with execs. See [MIGRATION_POLICY_TEAMS.md](./MIGRATION_POLICY_TEAMS.md).
- **Execs:** Your Info → Leave & Extension Requests → Bill Management → New Member Applications → Ideas & Suggestions → Volunteer Hours → HR Reports → Executive Conduct → Member Management → Schools, Partners & Mentors → Classroom → Analytics → Medium (if blog) → Change Password → Resign from SPAN.
- **Mentors:** Policy tools (research + outreach) → Change Password.

---

## 1. What every regular member sees

After registration is complete, every member sees these sections (in the order above).

- **Profile header** — Photo (or initials), name, role, LinkedIn/Instagram links, "Change profile picture", and "Download My SPANCard." **Preferred public name** (if used) can be edited inline next to the heading via the pencil control.
- **Your Info** — Contact and profile info from their `members` row (legal and contact fields; display naming follows **`memberDisplayName`** helpers). Self-serve school/grade/location edits where enabled.
- **Leave & extension requests** — Submit a leave/break or extension request; view their own requests (View opens a modal with details and, for execs, approve/decline and comments). The Leave section also hosts a **unified calendar** (birthdays, SPAN events, team-lead deadlines) — see `dashboard_calendar_events`.
- **Ideas & suggestions** — Submit an idea (bill idea, general interest, or web/feature suggestion) with title and optional description; view their own suggestions and status. Execs also see public bill suggestions from `bills.html`. The list defaults to the **Pending** filter for execs.
- **Volunteer Hours** — Add their own entries (date/time or hours, job title, description); view their own entries with status (waiting / approved / denied) and supervisor comment.
- **HR Reports** — Submit an HR report; view their own reports.
- **Change Password.**
- **Resign from SPAN** — Submit a resignation, see status, withdraw before a letter is sent.

So by default: your profile, your volunteer entries, your requests, your reports, resign. No bills section, no applications section, no member list — those appear only with the right permission.

---

## 2. What each permission adds

### Volunteer

- **See:** All members' volunteer entries, grouped by member.
- **Do:** Approve or deny any entry and add a supervisor comment (except for self).
- **Note:** Generate verification letter / send PDF to a member's email is **exec-only** (`send-volunteer-verification`).

### Applications

- **See:** The Applications section — full list with filters (All, Pending, Invited, Met with, Onboard, Accepted, Rejected), school grade and internal **review score** column, and per-application review score in the detail modal.
- **Do:** Open an application, **Mark Invited** (preview + send interview email via Resend), **Mark Met with** (date), **Mark Onboard** (preview + send onboarding scheduling email), add notes, Accept (opens Add Member with data pre-filled), or Reject (optional rejection email). AI screening on application text is advisory (`check-ai-text`).
- Detail: [APPLYING_AND_APPLICATION_REVIEW.md](./APPLYING_AND_APPLICATION_REVIEW.md).

### Bills

- **See:** A Bills section.
- **Do:**
  - If you are **not** an exec: submit bills (`under_review`); provide **either** a proposal PDF **or** a Google Doc–style link, and **at least one collaborator**. **My Submitted Bills** plus **Assigned to me** / open pool where enabled. Research (SPAN corpus, LegiScan, Compare).
  - If you **are** an exec: all bills, approve/reject/modify, edit/delete, upload PDFs. **Approve** vs **Approve but hide**. Assigned work, research, outreach on approved bills. See [BILLS_EXEC_SUITE_SPEC.md](./BILLS_EXEC_SUITE_SPEC.md).

### Registration

- **See:** Member Management (active and inactive member list). Exec view also includes **Policy teams** (roster, co-leads, team kind) per [MIGRATION_POLICY_TEAMS.md](./MIGRATION_POLICY_TEAMS.md).
- **Do:** Add a new member, edit any member, set active/inactive; optional middle name and preferred public name. Resend welcome, or Create login & welcome if Auth never attached.
- **Note:** Only execs can edit member perms (volunteer, applications, bills, registration, blog).

### Blog

- **See / do:** Medium (Policy Briefs) OTP section so editors can receive Medium login codes at their SPAN email (`medium-otp-arm`).

---

## 3. Execs: all four permissions + extra surfaces

**Exec** = volunteer + applications + bills + registration. They see every permission section above and can do everything each flag allows.

On top of that (all four required):

- **View as** — Open `/dashboard.html?viewAs=<member_id>` (from "View dashboard" in Member Management). Calls **view-member-dashboard** and shows that member's data read-only.
- **Volunteer verification email** — PDF letter via `send-volunteer-verification`.
- **HR reports** — all reports except those where they are the `regarding_member_id`; status and review notes.
- **Leave/extension** — all requests; approve/decline in the Request View modal. Team leads see their team’s queue only.
- **Ideas & suggestions** — all rows (member + public bill recommendations); set status and review notes. Defaults to Pending.
- **Executive Conduct** — strike log (from an HR report or manual), removal proposals, resignation queue. Honorable-exit / removal / policy-violation letters via `send-member-letter-email`. Directory deactivation after confirmed exit.
- **Schools, Partners & Mentors** — CRUD for homepage schools/partners and Board of Mentors (`advisors`). Mentor invite links, provision/reset login. [MENTOR_LOGIN.md](./MENTOR_LOGIN.md).
- **Classroom** — exec admin: schools, teachers, provision teacher login. Teachers/students use `classroom/` pages, not this section.
- **Analytics** — site page-view summary (`web-analytics-summary`).

---

## 4. Mentors

Not members. Login at `/login.html?mode=mentor`. Dashboard: research + outreach + change password. Send-via-SPAN-email is disabled. [MENTOR_LOGIN.md](./MENTOR_LOGIN.md).

---

## 5. Views and actions summary

| Action | Who | Notes |
|--------|-----|-------|
| View another member's dashboard | Exec only | `?viewAs=<member_id>`, view-member-dashboard |
| Member Management | Registration permission | Add/edit members, active/inactive; only execs edit flags |
| Review Applications | Applications permission | Pipeline + Resend emails |
| Bill Management (all bills, approve/edit, outreach) | Exec | Non-exec with bills perm submits and does assigned work / research |
| Team — Assigned work | Policy team lead | RLS-scoped; no publish-to-site |
| Volunteer: approve/deny | Volunteer permission | Not on own entries |
| Volunteer: send verification PDF | Exec | send-volunteer-verification |
| Leave/extension: approve or decline | Exec (team leads: their team) | Request View modal |
| HR Reports: view all, update status | Exec | Except reports regarding yourself |
| Ideas & suggestions: view all, set status | Exec | Includes public bill suggestions |
| Executive Conduct | Exec | Strikes, removal, resignations, letters |
| Schools / partners / mentors | Exec | Homepage + directory Leadership |
| Classroom admin | Exec | Teacher/student UI is `classroom/` |
| Analytics | Exec | web-analytics-summary |
| Medium OTP | Blog permission | medium-otp-arm |
| Resign from SPAN | Any member | Not mentors |

---

## 6. Where it lives and reference

Dashboard UI: `src/pages/DashboardPage.jsx` plus `src/pages/dashboard/*`. `hasPermission(<perm>)`; exec is the four flags above. RLS on the backend is the real boundary.

**Section order:** `dashboardOrder` from `isExec` / team-lead / mentor, applied as `style={{ order }}`.

| Area | Table(s) / storage | Key RPCs / functions |
|------|--------------------|------------------------|
| Profile | members | update_own_member_image |
| Volunteer hours | volunteers | send-volunteer-verification |
| Bills / assignments / outreach | bills, bill_assignments, bill_outreach_targets | get_bills_research, outreach-send-email, fetch-legiscan-person-contact |
| Leave/extension | member_requests | — |
| Calendar | dashboard_calendar_events | — |
| Ideas & suggestions | member_suggestions, public_bill_recommendations | — |
| HR / conduct | hr_reports, member_strikes, member_removal_proposals, member_resignations | notify-hr-report, notify-resignation-request, send-member-letter-email |
| Applications | applications | send-invitation-email, send-onboarding-schedule-email, send-rejection-email, check-ai-text, notify-new-application |
| Member mgmt | members | create_member, update_member, members-provision |
| Policy teams | policy_teams, member_policy_teams, policy_team_leads | — |
| Mentors | advisors, mentor_accounts, mentor_invites | mentors-invite, mentors-join, mentors-provision |
| Classroom | classroom_* | classroom-provision-teacher, classroom-join-student |
| Analytics | — | web-analytics-summary |
| View as | — | view-member-dashboard |
| Medium | — | medium-otp-arm |
