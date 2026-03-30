# Environment & local run (reference)

This file describes **how the project expects configuration to work**: which variables exist, where they live, and how the frontend connects to Supabase. It does **not** contain real project credentials.

---

## What the frontend needs

- **Node.js** 18+ and **npm**
- A **`.env.local`** file in the **repository root** (same level as `package.json`), **never committed** (see `.gitignore`)

Minimum variables:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Optional (LegiScan-powered bill status on public Bills page):

```env
VITE_LEGISCAN_API_KEY=<your-legiscan-api-key>
```

Copy from Supabase **Project Settings → API** (URL + `anon` `public` key). Restart `npm run dev` after any change to `.env.local`.

Details and troubleshooting: **[README-ENV.md](./README-ENV.md)**.

---

## Running the app locally

```bash
npm install
npm run dev
```

Vite prints a local URL (commonly port **5173**). The browser client talks to the **hosted** Supabase project configured in `.env.local`; a local Supabase instance is not required for typical UI work.

---

## Backend & Edge Functions

Server-side behavior (member provisioning, transactional email, etc.) lives in **`supabase/functions/`**. Those functions use **Supabase secrets** (dashboard or CLI), not `VITE_*` vars. Categories you will see in code and dashboards include:

- Supabase URL + **service role** key (function runtime only—never in the frontend)
- **Resend** API key and optional from/cc overrides for application and system emails
- Redirect URLs, and any other provider-specific secrets named in each function’s source

Exact names are defined per function; see **`docs/DEPLOYMENT.md`** for a generic deploy outline and **`docs/COPILOT_CONTEXT.md`** for a function list.

---

## Who needs Supabase dashboard access

Only people operating or debugging the live backend need to be invited to the Supabase project. Reading this repo does not grant access.

---

## Related docs

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** — minimal local workflow notes  
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — build, Pages, functions (placeholders)  
- **[CODEBASE_ARCHITECTURE.md](./CODEBASE_ARCHITECTURE.md)** — how the app is structured  
