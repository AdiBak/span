# LegiScan bill status timeline — reference

**Status: Implemented.** This doc describes how the LegiScan timeline works in the app (data, components, popover behavior). Use it as reference for onboarding or when changing the timeline or popover.

The timeline shows bill status as a **horizontal progression** (Introduced → In Committee → Crossed Over → Passed → Dead), with separate **House** and **Senate** rows when the API provides chamber-specific data.

---

## 1. Data (already wired)

- **Source:** When a user opens the LegiScan status popover on a bill card, the app calls `fetchBillStatus(bill)` from `src/lib/legiscan.js`. That returns (among other fields):
  - **`timeline`** — single array (legacy / when chamber is not split).
  - **`timelineHouse`** and **`timelineSenate`** — when the API provides enough info to split by chamber, so the UI can show **separate House and Senate** progress (e.g. “Passed” in one chamber doesn’t imply the bill is done).
- **No DB:** All data comes from the LegiScan API; no new tables or migrations.
- **Shape of timeline item:** Each item has:
  - **`label`** (string) — e.g. `"Introduced"`, `"In Committee"`, `"Crossed Over"`, `"Passed"`, `"Dead"`.
  - **`date`** (string | null) — Date when that stage happened (e.g. `"2024-11-12"`), or `null` if not yet / unknown.
  - **`state`** (string) — One of: `'completed'`, `'current'`, `'pending'`, `'dead'`.
    - **completed** — Stage is in the past (show as done, e.g. dark blue).
    - **current** — We’re at this stage (can also use dark blue or accent).
    - **pending** — Not reached yet (e.g. grey).
    - **dead** — Terminal failure (e.g. red); only the last stage (“Dead”) should use this when the bill failed/died.

So in the popover you’ll have `legiscanInfo.timeline` and, when available, `legiscanInfo.timelineHouse` and `legiscanInfo.timelineSenate`, each as an array of `{ label, date, state }`.

---

## 2. Where it renders

- **Component:** `src/components/BillCard.jsx`.
- **Place:** Inside the **LegiScan status popover** (info icon next to the bill title). The popover shows “Bill status”, SPAN position, bill date, “View on LegiScan”, and the timeline when LegiScan data has loaded.
- **When:** Only when `bill.legiscan_link` is set and LegiScan data is loaded (`legiscanInfo` has a `timeline` or `timelineHouse`/`timelineSenate`). Loading and error states (“Status unavailable from LegiScan”) are shown when the API fails or is unavailable.

---

## 3. Timeline component

- **Component:** `src/components/BillStatusTimeline.jsx`.
- **Input (props):**
  - **`stages`** — single array of `{ label, date, state }` (used when chamber split is not available).
  - **`houseStages`** and **`senateStages`** — when both are present and non-empty, the component renders **two rows** (“House” and “Senate”), each with the same stage shape. This makes it clear which chamber has passed and which is still in progress.
- **Shape of each stage:** `{ label: string, date: string | null, state: 'completed' | 'current' | 'pending' | 'dead' }`.
- **Layout:** Horizontal timeline: left to right, one segment per stage. Labels can wrap; dates shown below when present.
- **Per segment:**
  - **label** (e.g. “Introduced”, “In Committee”).
  - **date** under the label when present; otherwise “—”.
  - **Colors by `state`:** completed/current = filled (e.g. blue), pending = muted (grey), dead = red when the bill died.

---

## 3b. Status popover UI (BillCard)

- **Placement:** The status popover is absolutely positioned below the bill title/info area; it uses a high z-index and an `is-popover-open` class on the parent so it stacks above the rest of the card (e.g. collaborator avatars).
- **Size & scrolling:**
  - **Width:** The popover wrapper has a fixed width: `min(90vw, 560px)`. The popover fills the wrapper so the content is constrained; no inline width overrides.
  - **Height:** The popover has `max-height: min(70vh, 320px)` and `overflow-y: auto`, so long content (e.g. House + Senate timelines plus text) scrolls **vertically** inside the popover.
  - **Timeline rows:** Each House/Senate row has fixed-width stage blocks (`flex: 0 0 80px`). When the combined stage width exceeds the popover width, the row scrolls **horizontally** (`overflow-x: auto`). The timeline container uses `min-width: 0` so the flex layout allows overflow and scrollbars to appear.
- **Styling:** `src/components/BillCard.css` — `.bill-status-popover-wrapper`, `.bill-status-popover`, `.bill-status-timeline`, `.bill-status-timeline-row`, `.bill-status-timeline-block`, etc.

---

## 4. Reference

- **Visual reference:** The image Joel shared: horizontal segments, arrows between them, dates under labels, dark blue for done/current, grey for upcoming, red for “Dead” when applicable.
- **Existing code:**  
  - `src/lib/legiscan.js` — `fetchBillStatus`, `getBill`, `buildBillTimeline`, `buildBillTimelineByChamber`; returns `timeline`, `timelineHouse`, `timelineSenate` when available.  
  - `src/components/BillCard.jsx` — status popover, `legiscanInfo`, `setLegiscanInfo` (from `fetchBillStatus`); uses `houseStages` / `senateStages` when present, else `stages`.  
  - `src/components/BillStatusTimeline.jsx` — renders one or two timeline rows.  
  - `src/components/BillCard.css` — popover and timeline styles (width, scroll, z-index).  
- **Styling:** Use existing Bootstrap + Bootstrap Icons; no new design system. Prefer simple CSS (flexbox/grid) for the horizontal layout.

---

## 5. Current behavior (summary)

- Timeline appears in the LegiScan popover when a bill has `legiscan_link` and LegiScan data loads successfully.
- When `timelineHouse` and `timelineSenate` are present, two labeled rows (House, Senate) are shown; otherwise a single `timeline` row is shown.
- Five stages in order: Introduced, In Committee, Crossed Over, Passed, Dead; dates shown where available.
- Colors: completed/current = blue, pending = grey, dead = red when the bill died.
- Popover has a fixed max width and scrolls vertically when content is tall; timeline rows scroll horizontally when stages don’t fit.
- “View on LegiScan” link and loading/error states are present. No backend or DB; all data from LegiScan API via `legiscan.js`.
