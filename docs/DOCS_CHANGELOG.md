# Changelog — docs & onboarding guide

Updates to the documentation and onboarding guide (repo `docs/` and the Google Doc). Newest first.

---

## 2026-01-23

- **Bill assignments (exec suite, slice 1)** — Implemented dashboard UI: exec **Bill Management** sub-tab **Assigned work** (filters, accordion, assign modal, **delete** with confirmation); non-exec **Bill Submission** sub-tab **Assigned to me** (deliverable links, status actions). Assignee picker = members with **Bill** permission only. DB: `supabase/migrations/create_bill_assignments.sql` (`bill_assignments` + RLS). Docs: `DATABASE_ARCHITECTURE.md`, `COPILOT_CONTEXT.md`.

---

## 2025-01-24

- **Bills exec suite (planning)** — Added `docs/BILLS_EXEC_SUITE_SPEC.md`: integrated bills dashboard vision (assign → research → submit/approve → legislator outreach → tracking), exec vs bill-member access, research scope (SPAN + external bills), assignment vs outreach, committee/state for rep lists, outreach checkmarks and Pending/Contacted/Responded-style statuses. Not implemented yet; UI TBD.

- **Applications pipeline & review score** — Documented: status values **invited**, **met_with**, **onboard** (replacing under_review / contacted); optional **`numeric_grade`** for internal scoring. Updated DATABASE_ARCHITECTURE.md, DASHBOARD_FUNCTIONS.md, COPILOT_CONTEXT.md, APPLYING_AND_APPLICATION_REVIEW.md. Migration: `supabase/migrations/applications_invited_met_with_onboard_numeric_grade.sql`.

---

## 2025-01-23

- **LegiScan timeline spec → reference** — Reframed `LEGISCAN_TIMELINE_SPEC.md` as implemented reference docs (not a build spec): added “Status: Implemented” and “reference” in the title; updated §2/§3/§5 to describe current behavior; removed “what to build” / acceptance checklist wording so it doesn’t read as an assignment. COPILOT_CONTEXT link now says “(reference)”.

- **LegiScan timeline UI (House/Senate, popover behavior)** — Documented: (1) **House vs Senate** — `legiscan.js` returns `timelineHouse` and `timelineSenate` when chamber can be detected; `BillStatusTimeline` renders two labeled rows. (2) **Status popover** — fixed width `min(90vw, 560px)`, vertical scroll, horizontal scroll on timeline rows when stages don’t fit; z-index and `is-popover-open`. LEGISCAN_TIMELINE_SPEC.md (data shape, component props, §3b popover UI, reference files, current behavior summary).

- **Bill submission & visibility** — Documented: (1) **Google Doc link** — submitters can provide a link to the proposal document (e.g. Google Doc); either PDF or doc link required, plus collaborators required. Submitters can view their bill in **My Submitted Bills** (View PDF, open Google Doc, LegiScan link). (2) **Hidden bills** — execs can **Approve but hide** (approved but not on public site) or toggle **Hide from public site** in Edit; hidden bills remain in backend and visible in Bill Management and to the submitter; public Bills page and BillsPreview only show bills where `hidden = false`. (3) **Ideas & Suggestions** — default filter is **Pending**. Updated DASHBOARD_FUNCTIONS.md (Bills, Ideas, exec summary, actions table), DATABASE_ARCHITECTURE.md (bills: google_doc_link, hidden), COPILOT_CONTEXT.md (bills schema, workflow, Ideas default).

---

## 2025-02-22 (later)

- **Dashboard section order** — Documented the fixed section order for members vs execs (flex container + CSS `order`). Members: Your Info → Leave & Extension Requests → Bill Submission → Volunteer Hours → Ideas & Suggestions → HR Reports → Change Password. Execs: Your Info → Leave & Extension Requests → Bill Management → New Member Applications → Ideas & Suggestions → Volunteer Hours → HR Reports → Member Management → Schools & Partners → Change Password. Added implementation note in DASHBOARD_FUNCTIONS.md (`dashboardOrder`, `order: 99` for non-applicable sections). leave-and-extension-requests.md points to DASHBOARD_FUNCTIONS.md for full order.

---

## 2025-02-22

- **Ideas & suggestions feature** — Documented the Ideas & suggestions flow in the guide:
  - Members can submit ideas (bill idea, general interest, or web/feature suggestion) and see their own submissions and status.
  - Execs see all suggestions and can set status (pending / under review / approved / declined) and leave review notes in the Suggestion View modal.
  - Referenced in dashboard docs (DASHBOARD_FUNCTIONS.md), summary tables, and COPILOT_CONTEXT where relevant.

---

*Add new entries at the top under the date heading. Keep entries short: what changed and where (file or section).*
