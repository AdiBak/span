# Deployment Guide for spanationwide.org

## Overview

The SPAN website is hosted on **GitHub Pages** at `spanationwide.org`. This guide covers deploying the React application and Supabase Edge Function to production.

## Prerequisites

1. **GitHub Repository Access** - Push access to `Joelblessan123/span`
2. **Supabase Project Access** - Admin access to deploy Edge Functions
3. **Environment Variables** - Production credentials configured

---

## Part 1: Deploy Supabase Edge Function

The automated member provisioning system requires the Edge Function to be deployed to Supabase.

### Step 1: Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

### Step 3: Link to Your Project

```bash
supabase link --project-ref qujzohvrbfsouakzocps
```

### Step 4: Set Environment Variables (Secrets)

Set all required secrets in Supabase Dashboard or via CLI:

```bash
# Supabase credentials
supabase secrets set SUPABASE_URL=https://qujzohvrbfsouakzocps.supabase.co
supabase secrets set SERVICE_ROLE_KEY=your_service_role_key_here
supabase secrets set ONBOARDING_REDIRECT_URL=https://spanationwide.org/login.html

# EmailJS credentials
supabase secrets set EMAILJS_SERVICE_ID=your_service_id
supabase secrets set EMAILJS_TEMPLATE_ID=your_template_id
supabase secrets set EMAILJS_PUBLIC_KEY=your_public_key
supabase secrets set EMAILJS_PRIVATE_KEY=your_private_key

# Cloudflare credentials
supabase secrets set CLOUDFLARE_ACCOUNT_TOKEN=your_account_token
supabase secrets set CLOUDFLARE_ZONE_TOKEN=your_zone_token
supabase secrets set CLOUDFLARE_ZONE_ID=d8283cfe50b0e9188183602f6361be34
supabase secrets set CLOUDFLARE_ACCOUNT_ID=c01cbe5d0d56079ec448c3f92297d09c
```

**Or set via Supabase Dashboard:**
1. Go to Project Settings → Edge Functions → Secrets
2. Add each secret key-value pair

### Step 5: Deploy the Edge Function

```bash
supabase functions deploy members-provision
```

### Step 6: Set Up Database Webhook

1. Go to Supabase Dashboard → Database → Webhooks
2. Click "Create a new webhook"
3. Configure:
   - **Name**: `members-provision-webhook`
   - **Table**: `members`
   - **Events**: `INSERT`
   - **Type**: `HTTP Request`
   - **HTTP Request**:
     - **URL**: `https://qujzohvrbfsouakzocps.supabase.co/functions/v1/members-provision`
     - **HTTP Method**: `POST`
     - **HTTP Headers**:
       - `Authorization`: `Bearer YOUR_SERVICE_ROLE_KEY`
       - `Content-Type`: `application/json`
4. Save the webhook

### Step 7: Verify Deployment

1. Test by adding a new member to the `members` table
2. Check Edge Function logs in Supabase Dashboard
3. Verify email is sent and Cloudflare routing is set up

---

## Part 2: Deploy React Application to GitHub Pages

### Option A: Manual Deployment (Recommended for First Time)

#### Step 1: Build the React App

```bash
# Make sure you're in the project root
cd /path/to/span

# Install dependencies (if not already done)
npm install

# Build for production
npm run build
```

This creates a `dist/` folder with all the built files.

#### Step 2: Configure Vite for GitHub Pages

The `vite.config.js` should already be configured, but verify it has:

```javascript
export default defineConfig({
  base: '/',  // For custom domain, use '/'
  // ... rest of config
})
```

#### Step 3: Copy Built Files to Root (or gh-pages branch)

**Option 3a: Deploy to main branch root** (if GitHub Pages is set to serve from `/`)

```bash
# Backup current files (optional)
git checkout -b backup-before-deploy

# Copy dist contents to root
cp -r dist/* .

# Commit and push
git add .
git commit -m "Deploy React app to production"
git push origin main
```

**Option 3b: Deploy to gh-pages branch** (if GitHub Pages is set to serve from `/docs` or `gh-pages` branch)

```bash
# Build first
npm run build

# Deploy to gh-pages branch
npm install -g gh-pages
gh-pages -d dist
```

#### Step 4: Verify GitHub Pages Settings

1. Go to GitHub Repository → Settings → Pages
2. Verify:
   - **Source**: `Deploy from a branch` → `main` → `/ (root)`
   - **Custom domain**: `spanationwide.org` (should be set automatically from CNAME)
3. Wait a few minutes for GitHub Pages to rebuild

#### Step 5: Test the Live Site

1. Visit `https://spanationwide.org`
2. Test key features:
   - Homepage loads correctly
   - Bills page works
   - Login page works
   - Dashboard works (if logged in)
   - PDFs load correctly

---

### Option B: Automated Deployment with GitHub Actions (Recommended for Future)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          cname: spanationwide.org
```

**Setup:**
1. Create the workflow file above
2. Go to Repository Settings → Secrets and variables → Actions
3. Add secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Push to main branch - deployment will happen automatically

---

## Part 3: Environment Variables for Production

### Frontend Environment Variables

The React app needs these at build time. Set them in GitHub Actions secrets (for automated) or in `.env.production` (for manual):

```env
VITE_SUPABASE_URL=https://qujzohvrbfsouakzocps.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Note:** These are public and safe to include in the built bundle.

### Backend Environment Variables (Edge Function)

Already set in Part 1, Step 4 above.

---

## Part 4: Post-Deployment Checklist

### ✅ Supabase Setup
- [ ] Edge Function deployed and working
- [ ] Database webhook configured
- [ ] RLS policies created (volunteers, bills tables)
- [ ] Storage bucket policies configured (proposals bucket)

### ✅ Frontend Deployment
- [ ] React app built successfully
- [ ] Built files deployed to GitHub Pages
- [ ] Custom domain (spanationwide.org) working
- [ ] All pages load correctly
- [ ] PDFs load correctly
- [ ] State flags display correctly

### ✅ Testing
- [ ] Homepage loads
- [ ] Bills page works
- [ ] Blog page works
- [ ] Directory page works
- [ ] Login page works
- [ ] Dashboard works (if logged in)
- [ ] Member provisioning test (add new member → verify email/routing)

### ✅ EmailJS Setup
- [ ] EmailJS template configured with correct variables
- [ ] Test email sent successfully
- [ ] Welcome email format matches Ben's template

### ✅ Cloudflare Setup
- [ ] Email routing API credentials configured
- [ ] Test email routing (send to SPAN email → verify forwarding)

---

## Troubleshooting

### Issue: Pages not loading after deployment

**Solution:**
- Check GitHub Pages build logs
- Verify `base` path in `vite.config.js` is `/`
- Clear browser cache
- Check browser console for errors

### Issue: PDFs not loading

**Solution:**
- Verify PDF paths in Supabase Storage
- Check CORS settings on `proposals` bucket
- Verify bucket is public

### Issue: Edge Function not triggering

**Solution:**
- Check webhook configuration in Supabase Dashboard
- Verify webhook URL and headers
- Check Edge Function logs
- Test webhook manually with curl

### Issue: Environment variables not working

**Solution:**
- For frontend: Rebuild after setting variables
- For Edge Function: Redeploy after setting secrets
- Verify variable names match exactly (case-sensitive)

---

## Rollback Procedure

If something goes wrong:

1. **Frontend Rollback:**
   ```bash
   git revert HEAD
   git push origin main
   # Or manually restore from backup branch
   ```

2. **Edge Function Rollback:**
   ```bash
   # Redeploy previous version
   supabase functions deploy members-provision --version previous
   ```

---

## Future Updates

For future updates:

1. **Make changes locally**
2. **Test thoroughly** (`npm run dev`)
3. **Build** (`npm run build`)
4. **Deploy** (push to main or use GitHub Actions)
5. **Verify** on live site

---

## Support

If you encounter issues:
1. Check Supabase Dashboard logs
2. Check GitHub Pages build logs
3. Check browser console for errors
4. Review this deployment guide

For questions, contact the development team.

