# Bills “all-in-one” dashboard — exec decisions (spec)

**Status:** **Assignments (slice 1)** implemented (`bill_assignments` + dashboard **Assigned work** / **Assigned to me**). **Research** and **Outreach** tabs still planned. This doc records exec decisions from the call (Joel’s replies + original vision).

---

## Vision (from exec brief)

End-to-end flow on one bills surface:

1. **Assign** bills (or work items) to people  
2. **Research** — compare new bills to SPAN’s past bills and document **SPAN stance**  
3. **Submission & approval** — keep current workflow (already exists)  
4. **Legislator outreach** — auto-populate reps to call/email with correct info; optional “automatic sending” / population of lists  
5. **Tracking** — where each bill is in the legislature (LegiScan-style tracking fits here) and **whether we’ve contacted** relevant offices  

---

## Product decisions (Q&A → Joel)

| Topic | Decision |
|--------|-----------|
| **Where it lives** | **Integrated into the existing Bill section** of the dashboard (not a totally separate nav area). |
| **Exec vs bill members** | **Execs:** full suite — assign, research tooling, outreach, **plus** submit/approve as today. **Bill members:** research, **see bills assigned to them**, submit bills as today (no full exec suite). |
| **Research comparisons** | **Yes to both:** (1) compare against **existing SPAN bills regardless of status**; (2) **also** compare / reference **external legislature bills** where useful. |
| **What “assignment” means** | Exec assigns work (topic/concept → member does research, writing, submission from there). **Not** primarily “delegate an approved bill for outreach.” **Legislator outreach is the last step**, not the main thing being delegated. |
| **Ideas & Suggestions** | Keep workflow **in the bill section**; **not** required to tie assignment into Ideas & Suggestions (pure bill-section flow). |
| **Legislator auto-population** | Based on **committee(s)** and **state** from the bill submission. |
| **When outreach list appears** | Treat as a **backend / internal feature** with something like **checkmarks** for who has been contacted (not only “after approve” as the only gate — confirm in UI phase if any visibility rule is needed). |
| **Outreach tracking statuses** | **Yes** to a simple model such as **Pending → Contacted → Responded / Interacted** (exact labels can follow UI). |

---

## UI mockups (illustration only)

- **“Member view” / “Exec view” toggle** on shared mockups is **not** a real product control. In production, **members** see their dashboard bill block (e.g. Bill Submission + member tabs) and **execs** see Bill Management + exec tabs—same split as today, no toggle.
- **Phased build (agreed direction):** (1) **Assignments first** — separate from normal bill submission; expandable rows; exec assign modal (topic/concept, goal, additional info); members complete with **PDF or doc link** only for v1; status + filters (e.g. member: not started / in progress / completed; exec: those + in review / approved). (2) **Outreach** and **Research** tabs later; **legislator search** on outreach for execs; **members get an outreach tab** when that ships.

---

## Implementation notes (for when building)

- Current codebase already has: bill submit/review, LegiScan link + timeline popover, collaborators, PDF/Google Doc (internal), hidden bills, etc. This suite **extends** that rather than replacing it.  
- New work will likely need: **data model** (assignments, research notes, stance, outreach targets, per-target status), **RLS** aligned with `bills` permission vs exec (all four perms), and possibly **Edge Functions** or integrations for legislator data / email.  
- **Committee + state** drive rep lists — may need a data source (LegiScan, Open States, manual CSV, etc.); decide per implementation phase.

---

## Changelog

- **2025-01-24** — Doc created from Aditya’s call notes and Joel’s written replies; image brief summarized above.
