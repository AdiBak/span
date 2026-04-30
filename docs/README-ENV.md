# Environment Variables Setup

This project uses environment variables to securely store Supabase credentials.

## Setup Instructions

### 1. Create `.env.local` file

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

### 2. Add your Supabase credentials

Edit `.env.local` and add your actual Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Optional (for bill status on the public Bills page):

```env
VITE_LEGISCAN_API_KEY=your-legiscan-api-key
```

Get a free API key at [LegiScan](https://legiscan.com/legiscan) (free tier: 30,000 queries/month). When set, the small info icon on bill cards will show live LegiScan status and last action.

**Directory “Email” button (Cloudflare Turnstile):** To require a captcha before visitors open their mail app from the public member directory, create a [Turnstile](https://developers.cloudflare.com/turnstile/) widget in the Cloudflare dashboard and set:

```env
VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key
```

If this variable is unset, the directory keeps the previous behavior (direct `mailto` with no challenge). The site key is public. For stronger abuse resistance, validate Turnstile tokens in a server or Edge Function before revealing or proxying contact actions.

**GitHub Pages:** Add the same variable as a repository secret `VITE_TURNSTILE_SITE_KEY` so the deploy workflow can embed it at build time (see `.github/workflows/pages.yml`).

**Turnstile “Unable to connect” / HTTP 400 on `challenges.cloudflare.com`:** In the Cloudflare dashboard → Turnstile → your widget → **Hostnames**, include every origin where the site runs, for example:

- `localhost` (and try `127.0.0.1` if needed) for local dev  
- Your GitHub Pages host, e.g. `youruser.github.io`  
- Any custom domain (apex and `www` if you use both)

If the page’s hostname is not listed, Turnstile rejects the challenge and the widget shows an error. Create a separate widget for production vs dev if you prefer different hostname lists.

**LegiScan API Notes:**
- Free tier: 30,000 queries/month (resets on the 1st of each month)
- Caching with `change_hash` and 24-hour `sessionStorage` to minimize queries
- Queries only when users click the info icon (on-demand)

**Important:** Never commit `.env.local` to git! It's already in `.gitignore`.

### 3. Restart the development server

After creating or modifying `.env.local`, restart your dev server:

```bash
npm run dev
```

## How It Works

### React Components

React components use `import.meta.env` to access environment variables:
- File: `src/lib/supabase.js`
- Uses: `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`

### Vanilla JavaScript

Some legacy scripts read `window.__ENV__` when injected at build time. Prefer always supplying real `VITE_*` values in `.env.local` (or the build environment) so the client does not rely on baked-in defaults.

## Production Deployment

For production (GitHub Pages, etc.):

1. **Option A: Build-time environment variables**
   - Set environment variables in your CI/CD pipeline or build process
   - Vite will embed them in the build output
   - Example for GitHub Actions:
     ```yaml
     env:
       VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
       VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
     ```

2. **Public anon key**
   - The Supabase anon key is designed to be public; protection is via RLS
   - Still set it via env at build time rather than duplicating it in source when possible

## Security Notes

- The Supabase **anon key** is safe to expose in client-side code
- It's restricted by Row Level Security (RLS) policies in Supabase
- Never commit your **service role key** (if you have one) - that should only be used server-side
- The `.env.local` file is already in `.gitignore` and will never be committed

## Troubleshooting

### "Missing Supabase environment variables" error

- Make sure `.env.local` exists in the project root
- Check that variable names start with `VITE_`
- Restart the dev server after creating/modifying `.env.local`

### Environment variables not working in production

- Make sure your build process has access to the environment variables
- Check that variables are prefixed with `VITE_`
- For GitHub Pages, you may need to use GitHub Actions secrets

