# Local development (reference)

Short notes for anyone running the app from source. Operational credentials are not documented here.

---

## Run locally

1. `npm install`
2. Create **`.env.local`** with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see **[SETUP.md](./SETUP.md)**)
3. `npm run dev`
4. After env changes, restart the dev server

---

## Sanity checks

- Hard refresh the browser after frontend changes (`Cmd+Shift+R` / `Ctrl+Shift+R`).
- **Dashboard** behavior depends on the logged-in member’s permission flags (volunteer, applications, bills, registration, blog). Useful flows often need more than one test account—those accounts are created in your Supabase project, not in this doc.

---

## AI-assisted editing

If you use Cursor, Copilot, or similar, pointing the model at **`docs/COPILOT_CONTEXT.md`** and **`docs/CODEBASE_ARCHITECTURE.md`** usually gives better answers than pasting large chunks of `DashboardPage.jsx` without context.

---

## Git & branches

Use whatever branching model your maintainers prefer; the repo does not enforce a specific contributor workflow in documentation.
