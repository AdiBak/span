# Bills “all-in-one” dashboard — exec decisions (spec)

**Status:** **Assignments**, **Research** (SPAN + LegiScan + Compare), and **Outreach** are implemented. This file is the agreed product direction (exec brief + follow-up). Behavior in production: [WORK_SUMMARY.md](../WORK_SUMMARY.md) §0 and [DASHBOARD_FUNCTIONS.md](./DASHBOARD_FUNCTIONS.md).

---

## Vision (from exec brief)

End-to-end flow on one bills surface:

1. **Assign** work items to people
2. **Research** — compare new bills to SPAN’s past bills and document **SPAN stance**
3. **Submission & approval** — keep current workflow
4. **Legislator outreach** — populate reps to call/email; track contact
5. **Tracking** — where each bill is in the legislature (LegiScan) and **whether we’ve contacted** relevant offices

---

## Product decisions (Q&A → Joel)

| Topic | Decision |
|--------|-----------|
| **Where it lives** | **Integrated into the existing Bill section** of the dashboard (not a totally separate nav area). |
| **Exec vs bill members** | **Execs:** full suite — assign, research tooling, outreach, **plus** submit/approve as today. **Bill members:** research, **see bills assigned to them**, submit bills as today (no full exec suite). |
| **Research comparisons** | **Yes to both:** (1) compare against **existing SPAN bills regardless of status**; (2) **also** compare / reference **external legislature bills** where useful. |
| **What “assignment” means** | Exec assigns work (topic/concept → member does research, writing, submission from there). **Not** primarily “delegate an approved bill for outreach.” **Legislator outreach is the last step**, not the main thing being delegated. |
| **Ideas & Suggestions** | Keep internal ideas on the dashboard Ideas section. Public suggestions use the Bills page form (`public_bill_recommendations`). Assignment is a bill-section flow, not required to start from Ideas. |
| **Legislator auto-population** | **LegiScan `getBill`** sponsors (and history). Not a separate legislator database. Open States was tried for extra contact fields; production stays on LegiScan (`fetch-legiscan-person-contact`, optional `openstates-proxy`). |
| **When outreach list appears** | **Approved bills only**. Internal list with statuses (**Pending → Contacted → Responded**). UI: **Outreach** tab under Bill Management. |
| **Outreach tracking statuses** | Simple model such as **Pending → Contacted → Responded / Interacted**. |

---

## What shipped

- **Assignments:** `bill_assignments` (+ `bill_assignment_assignees`). Exec **Assigned work**; members **Assigned to me** and open pool. Deliverable doc/PDF. Status + filters. Policy-team leads: **Team — Assigned work** (no publish-to-site). Publishing copies an approved assignment into `bills`.
- **Research:** SPAN corpus via `get_bills_research()` (no review notes). Legislature search/detail (LegiScan). **Compare** two-pane SPAN + LegiScan.
- **Outreach:** `bill_outreach_targets` on approved bills; refresh from LegiScan sponsors; status updates; contact modal can send via `outreach-send-email` (proposal PDF). Mentors can preview; send-via-SPAN-email is disabled for them.
- **Not a product toggle:** Member vs exec is permission-based. There is no “view as member/exec” control on the bills UI (exec **view-as** is a separate dashboard feature).

---

## Implementation notes

- Suite **extends** existing submit/review, LegiScan timeline, collaborators, PDF/Google Doc, hidden bills.
- **Outreach v1:** `bills.status` = approved. Parse `legiscan_link` → `getBill` → sponsors/history → `bill_outreach_targets`.
- Committee membership lists may still need extra APIs or manual add; sponsors are the v1 source.
- **RLS:** exec-only outreach writes; assignments follow exec / assignee / team-lead policies.
