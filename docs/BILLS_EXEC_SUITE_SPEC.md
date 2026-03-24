# Bills “all-in-one” dashboard — exec decisions (spec)

**Status:** **Assignments (slice 1)** implemented (`bill_assignments` + **Assigned work** / **Assigned to me**). **Research** tab: **SPAN** corpus (`get_bills_research()` RPC, doc/PDF embeds, by state), **Legislature (LegiScan)** lookup, and **Compare** (v1: two-pane SPAN + LegiScan with separate compare-side LegiScan state). **Outreach** still planned. This doc records exec decisions from the call (Joel’s replies + original vision).

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
| **Legislator auto-population** | Based on **committee(s)** and **state** from the bill submission. **Implementation direction:** use **LegiScan `getBill`** (already integrated for Research) — **sponsors** (names, party, role) and **history** (referrals, committee actions) are on the payload; extend mapping if the API exposes additional committee fields. |
| **When outreach list appears** | **Approved bills only** (Joel). Internal list with **checkmarks** / statuses (**Pending → Contacted → Responded**). UI: e.g. **Outreach** tab under Bill Management, scoped to **`status` approved** (and usual `hidden` rules as needed). |
| **Outreach tracking statuses** | **Yes** to a simple model such as **Pending → Contacted → Responded / Interacted** (exact labels can follow UI). |

---

## UI mockups (illustration only)

- **“Member view” / “Exec view” toggle** on shared mockups is **not** a real product control. In production, **members** see their dashboard bill block (e.g. Bill Submission + member tabs) and **execs** see Bill Management + exec tabs—same split as today, no toggle.
- **Phased build (agreed direction):** (1) **Assignments first** — separate from normal bill submission; expandable rows; exec assign modal (topic/concept, goal, additional info); members complete with **PDF or doc link** only for v1; status + filters (e.g. member: not started / in progress / completed; exec: those + in review / approved). (2) **Outreach** and **Research** tabs later; **legislator search** on outreach for execs; **members get an outreach tab** when that ships.

---

## Implementation notes (for when building)

- Current codebase already has: bill submit/review, LegiScan link + timeline popover, collaborators, PDF/Google Doc (internal), hidden bills, etc. This suite **extends** that rather than replacing it.  
- **Outreach v1 scope:** **`bills.status` = approved** (per Joel). Resolve **`legiscan_link`** → LegiScan bill id (existing URL parse + search pattern in `legiscan.js`), then **`getBill`** — reuse **`mapLegiscanBillForResearch`** fields (**sponsors**, **history**, state, title) to seed or refresh an outreach target list. Add DB table(s) for **per-target outreach status** + notes; optional cache of last LegiScan snapshot.  
- **Gaps to validate against live API:** whether **`getBill`** alone is enough for “who to contact” (sponsors are strong v1); full **committee membership** lists may require additional LegiScan endpoints or manual add — confirm in API docs / sample payloads.  
- **RLS:** exec-only writes; align with existing **`bills`** permission model. Email automation remains optional (like application invitation).

---

## Changelog

- **2026-01-23** — Outreach: **approved bills only** (Joel). Data: **LegiScan `getBill`** as primary source for sponsors/history; implementation notes updated.  
- **2025-01-24** — Doc created from Aditya’s call notes and Joel’s written replies; image brief summarized above.
