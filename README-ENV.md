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

Vanilla JS files (login, dashboard) read from `window.__ENV__` which is injected by Vite:
- Files: `assets/scripts/script.js`, `assets/scripts/auth.js`
- Uses: `window.__ENV__.VITE_SUPABASE_URL` and `window.__ENV__.VITE_SUPABASE_ANON_KEY`
- Falls back to hardcoded values if env vars are not set (for backwards compatibility)

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

2. **Option B: Public environment variables**
   - Since these are public anon keys (safe to expose in client-side code)
   - You can keep the fallback values in the code for backwards compatibility
   - Note: The anon key is already public and safe to expose in client code

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

