# Automated Member Provisioning

This document describes how to enable the new automated onboarding flow that
provisions Supabase Auth users whenever a record is inserted into
`public.members`.

## Overview

1. A row is inserted into `public.members` (via the Table Editor, CSV import, or API).
2. Supabase fires a **database webhook** that calls the `members-provision` Edge Function.
3. The function:
   - Normalises the member’s email.
   - Ensures there is a matching Auth user (creating one if necessary with a random temporary secret).
   - Stores the Auth `user_id` back onto the row.
   - Sends the member an **invite email** so they can choose their own password.

All communication happens server-side using the Supabase Service Role key.

## Deploy the Edge Function

The function lives at `supabase/functions/members-provision/index.ts`.

1. Install the Supabase CLI and sign in:

   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   ```

2. Deploy the function:

   ```bash
   supabase functions deploy members-provision
   ```

3. Set the required environment variables for the function:

   ```bash
   supabase secrets set \
     SUPABASE_URL=https://<your-project-ref>.supabase.co \
     SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
     ONBOARDING_REDIRECT_URL=https://spanationwide.org/login.html \
     EMAILJS_SERVICE_ID=<emailjs-service-id> \
     EMAILJS_TEMPLATE_ID=<emailjs-template-id> \
     EMAILJS_PUBLIC_KEY=<emailjs-public-key> \
     EMAILJS_PRIVATE_KEY=<emailjs-private-key> \
     CLOUDFLARE_API_KEY=<cloudflare-global-api-key> \
     CLOUDFLARE_EMAIL=<cloudflare-account-email>
   ```

   - `ONBOARDING_REDIRECT_URL` controls where the invite email directs members after they set their password.
   - **EmailJS secrets**: Required for sending welcome emails. Get these from the EmailJS account owner (Ben).
   - **Cloudflare credentials**: Required for automatic email routing setup. See "Cloudflare Email Routing" section below.

## Configure the Database Webhook

1. In Supabase Studio go to **Database → Webhooks → Add webhook**.
2. Choose **INSERT** on the `public.members` table.
3. Set the target URL to the deployed function:

   ```
   https://<your-project-ref>.functions.supabase.co/members-provision
   ```

4. If you set `MEMBERS_WEBHOOK_SECRET`, add an HTTP header:

   ```
   Authorization: Bearer <MEMBERS_WEBHOOK_SECRET>
   ```

5. Save the webhook.

Whenever a member is added, the function now runs automatically.

## EmailJS Setup

The function uses EmailJS to send welcome emails. The email is sent to the member's `original_email` (or falls back to `email` if `original_email` is not set).

1. **Get EmailJS credentials from Ben** (or the account owner):
   - Service ID
   - Template ID
   - Public Key
   - Private Key

2. **Create the EmailJS template** with these variables:
   - `{{to_name}}` - Member's full name
   - `{{span_email}}` - The SPAN email address (for login)
   - `{{action_link}}` - The Supabase invite/recovery link
   - `{{otp}}` - 6-digit code (for invite emails)
   - `{{invite_type}}` - Either "invite" or "recovery"

3. Add the credentials to Supabase secrets (see above).

## Cloudflare Email Routing

The function automatically sets up email routing in Cloudflare to forward emails from the SPAN address (`members.email`) to the personal address (`members.original_email`).

### Getting Cloudflare Credentials

**Option 1 (Recommended)**: Use API Tokens with Bearer authentication:

You need two API tokens:
1. **Account Token** - For managing email routing addresses
   - Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
   - Create token with: **Account** → **Email Routing Addresses** → **Edit**
   - Account ID: `c01cbe5d0d56079ec448c3f92297d09c`

2. **Zone Token** - For managing email routing rules
   - Create token with: **Zone** → **Email Routing Rules** → **Edit**
   - Zone: `spanationwide.org` (or Zone ID: `d8283cfe50b0e9188183602f6361be34`)

Add both to Supabase secrets:
```bash
supabase secrets set \
  CLOUDFLARE_ACCOUNT_TOKEN=<account-token-for-addresses> \
  CLOUDFLARE_ZONE_TOKEN=<zone-token-for-rules>
```

**Option 2 (Fallback)**: Use a single API Token with both permissions:
```bash
supabase secrets set \
  CLOUDFLARE_API_TOKEN=<token-with-both-account-and-zone-permissions>
```

**Option 3 (Legacy)**: Use Global API Key (if tokens don't work):
```bash
supabase secrets set \
  CLOUDFLARE_API_KEY=<global-api-key> \
  CLOUDFLARE_EMAIL=Theinspiredmediasolutions@gmail.com
```

**Note**: The Account ID (`c01cbe5d0d56079ec448c3f92297d09c`) and Zone ID (`d8283cfe50b0e9188183602f6361be34`) are hardcoded in the function.

**Troubleshooting 403 "Authentication error"**:

1. **Verify credentials are from the correct account**:
   - The API key and email must be from the account that owns `spanationwide.org`
   - Switch to the SPAN account in Cloudflare dashboard before getting the key

2. **Check the API key**:
   - No extra spaces or characters
   - Copy directly from Cloudflare (don't type it)
   - Make sure it's the Global API Key, not an API Token

3. **Verify the email**:
   - Must match the account email exactly (case-sensitive)
   - Check the email shown in Cloudflare dashboard (Profile section)

4. **Test credentials manually**:
   ```bash
   curl -X GET "https://api.cloudflare.com/client/v4/zones/d8283cfe50b0e9188183602f6361be34/email/routing/addresses" \
     -H "X-Auth-Email: Theinspiredmediasolutions@gmail.com" \
     -H "X-Auth-Key: <your-global-api-key>" \
     -H "Content-Type: application/json"
   ```
   If this returns 403, the credentials are incorrect. If it returns 200, the credentials work and the issue is elsewhere.

**Note**: The Zone ID is hardcoded in the function (`d8283cfe50b0e9188183602f6361be34`). If the zone changes, update it in `supabase/functions/members-provision/index.ts`.

**Security Note**: Global API Keys have full account access. Ensure these secrets are stored securely and never committed to version control.

### How It Works

1. When a member is inserted, the function:
   - Creates a Cloudflare destination address (if it doesn't exist) pointing to `original_email`
   - Creates a routing rule: `{span_email}` → `{original_email}`
2. Cloudflare automatically sends a verification email to `original_email`
3. The member must click the verification link in that email to activate forwarding
4. Once verified, emails sent to the SPAN address will forward to their personal inbox

**Important**: Email routing setup is non-blocking. If Cloudflare API fails, member provisioning still succeeds (the welcome email will still be sent, but routing must be set up manually).

## Testing

1. Insert a test member into the `members` table:
   - Set `email` to a unique SPAN address (e.g., `test.user@spanationwide.org`)
   - Set `original_email` to your personal email (where you want to receive the welcome email)
   - Ensure no existing Auth user has the SPAN email

2. Verify in the Auth "Users" list that a new user appears with the SPAN email.

3. Confirm that `members.user_id` is populated for that row.

4. Check your personal inbox (`original_email`) for:
   - **Welcome email from EmailJS** with the "Set your password" button
   - **Cloudflare verification email** (if routing was set up) - click to verify forwarding

5. Click the "Set your password" link in the welcome email and complete the password setup.

6. Log in at `https://spanationwide.org/login.html` using the SPAN email and your new password.

7. Verify Cloudflare email routing (if set up):
   - Send a test email to the SPAN address
   - It should forward to your personal inbox (after verification)

## Migrating Existing Members

For existing rows without a `user_id`, run a one-off script that:

1. Fetches each `members` row with `user_id IS NULL`.
2. Calls the deployed function via `curl` or the Supabase client, OR temporarily
   reuses the legacy `sync-members.js` script (after updating it to remove `welcome`).

Once all members are linked, retire the legacy script.

## QR Login Considerations

The QR card flow currently embeds the member’s password. After the new invite
process is live, consider switching to single-use tokens or magic links so QR
logins do not depend on static secrets. This can be layered on top of the new
provisioning pipeline.

