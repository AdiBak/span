# Deployment (reference)

How production is **structured**: static frontend (e.g. GitHub Pages) plus Supabase (database, auth, storage, Edge Functions). Replace placeholders with your own project and domain.

---

## 1. Prerequisites

- Repository push access and GitHub Pages (or another static host) configured  
- Supabase project admin access  
- CLI: `npm`, optional `supabase` CLI for functions  

---

## 2. Supabase Edge Functions

1. Install CLI: `npm i -g supabase`  
2. `supabase login`  
3. `supabase link --project-ref <your-project-ref>`  

**Secrets** (Dashboard → Edge Functions → Secrets, or `supabase secrets set KEY=value`):

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or equivalents your functions read—check each `supabase/functions/*/index.ts`)
- `RESEND_API_KEY` for email-sending functions (invitation, rejection, onboarding schedule, volunteer verification, etc.)
- Optional: `INVITATION_FROM`, `INVITATION_CC`, `ONBOARDING_SCHEDULE_FROM`, `ONBOARDING_SCHEDULE_CC`, and any other names referenced in function code
- `SUPABASE_ANON_KEY` if a function needs it alongside the service role

Deploy a function:

```bash
supabase functions deploy <function-name>
```

**Database webhooks** (e.g. `members` → `members-provision`): point the HTTP URL at  
`https://<your-project-ref>.supabase.co/functions/v1/<function-name>`  
with the **service role** bearer token as required by your setup.

---

## 3. Frontend (Vite → static hosting)

```bash
npm ci
npm run build
```

Output: **`dist/`**. `vite.config.js` **`base`** must match hosting (often `'/'` for a custom domain on Pages).

**GitHub Pages (manual pattern):** publish `dist` contents (branch or workflow—see your repo’s existing workflow if any).

**GitHub Actions (typical):** build with secrets:

```yaml
env:
  VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

Optional: `VITE_LEGISCAN_API_KEY` if you use LegiScan on the public site.

---

## 4. Post-deploy checklist (generic)

- [ ] Static site loads; `base` and asset paths correct  
- [ ] Login and dashboard reach the intended Supabase project  
- [ ] RLS and storage bucket policies match migrations  
- [ ] Critical Edge Functions deployed; webhook URLs and secrets set  
- [ ] Transactional email sends succeed (Resend dashboard / logs)  

---

## 5. Troubleshooting

| Symptom | Check |
| :-- | :-- |
| Blank or auth errors | `VITE_*` at build time; correct Supabase project |
| Functions 401/403 | JWT verification settings, anon vs service role, caller permissions |
| Email not sent | `RESEND_API_KEY`, from-domain verification, function logs |
| PDFs / images 404 | Storage bucket names, public policies, path logic in app |

---

## 6. Rollback

- **Site:** revert commit or republish previous `dist`  
- **Function:** redeploy prior revision from git history  

---

*Older versions of this doc listed provider-specific IDs and keys; those belong only in private secrets stores, not in git.*
