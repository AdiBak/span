# LegiScan bill status timeline — spec for frontend

Joel asked to show LegiScan bill status as a **horizontal timeline** (like the reference: Introduced → In Committee → Crossed Over → Passed → Dead), with minimal extra info. This doc is the spec for building that UI.

---

## 1. Data (already wired)

- **Source:** When a user opens the LegiScan status popover on a bill card, the app calls `fetchBillStatus(bill)` from `src/lib/legiscan.js`. That now returns (among other fields) a **`timeline`** array.
- **No DB:** All data comes from the LegiScan API; no new tables or migrations.
- **Shape of `timeline`:** Each item has:
  - **`label`** (string) — e.g. `"Introduced"`, `"In Committee"`, `"Crossed Over"`, `"Passed"`, `"Dead"`.
  - **`date`** (string | null) — Date when that stage happened (e.g. `"2024-11-12"`), or `null` if not yet / unknown.
  - **`state`** (string) — One of: `'completed'`, `'current'`, `'pending'`, `'dead'`.
    - **completed** — Stage is in the past (show as done, e.g. dark blue).
    - **current** — We’re at this stage (can also use dark blue or accent).
    - **pending** — Not reached yet (e.g. grey).
    - **dead** — Terminal failure (e.g. red); only the last stage (“Dead”) should use this when the bill failed/died.

So in the popover you’ll have `legiscanInfo.timeline` as an array of `{ label, date, state }`.

---

## 2. Where to render

- **Component:** `src/components/BillCard.jsx`.
- **Place:** Inside the **LegiScan status popover** (the same area where we currently show “LegiScan status”, “Last action”, “Date”). Replace or supplement that text with the **timeline** when `legiscanInfo.timeline` exists and has length.
- **When:** Only when `bill.legiscan_link` is set and LegiScan data is loaded (`legiscanInfo` is an object with a `timeline` array). Keep existing “View on LegiScan” link; keep loading/error states as they are.

---

## 3. Timeline component (what to build)

- **Input (props):** A single prop, e.g. **`stages`**, which is an array of `{ label: string, date: string | null, state: 'completed' | 'current' | 'pending' | 'dead' }`. This is exactly what `legiscanInfo.timeline` provides.
- **Layout:** Horizontal timeline: left to right, one segment per stage, with arrows or connectors between segments (as in the reference image).
- **Per segment:**
  - Show **label** (e.g. “Introduced”, “In Committee”).
  - Show **date** under the label when `date` is not null; otherwise leave blank or “—”.
  - **Colors by `state`:**
    - **completed** / **current** — e.g. dark blue (filled).
    - **pending** — e.g. light grey (unfilled or muted).
    - **dead** — e.g. red (only “Dead” stage when the bill died).
- **Scope:** Just the timeline. No extra summary text or extra LegiScan info is required; keep the block minimal.

You can implement the timeline as:

- A **small reusable component** (e.g. `BillStatusTimeline.jsx` in `src/components/`) that takes `stages` and renders the horizontal bar, or
- Inline markup in `BillCard.jsx` if you prefer to keep it in one place first.

Using a separate component is easier to test and reuse (e.g. if we add the same timeline elsewhere later).

---

## 4. Reference

- **Visual reference:** The image Joel shared: horizontal segments, arrows between them, dates under labels, dark blue for done/current, grey for upcoming, red for “Dead” when applicable.
- **Existing code:**  
  - `src/lib/legiscan.js` — `fetchBillStatus`, `getBill`, `buildBillTimeline`.  
  - `src/components/BillCard.jsx` — status popover, `legiscanInfo`, `setLegiscanInfo` (from `fetchBillStatus`).  
- **Styling:** Use existing Bootstrap + Bootstrap Icons; no new design system. Prefer simple CSS (flexbox/grid) for the horizontal layout.

---

## 5. Acceptance checklist

- [ ] Timeline appears in the LegiScan popover when a bill has `legiscan_link` and LegiScan data loads successfully.
- [ ] Timeline shows the five stages (Introduced, In Committee, Crossed Over, Passed, Dead) in order, with dates where available.
- [ ] Colors/styling match intent: completed/current = filled (e.g. blue), pending = muted (e.g. grey), dead = red when the bill is dead.
- [ ] Loading and error states for LegiScan are unchanged (no regression).
- [ ] “View on LegiScan” link remains.
- [ ] No new backend or DB changes; all data from existing `legiscan.js` and `legiscanInfo.timeline`.
