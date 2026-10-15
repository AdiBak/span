# Master Context Prompt for GitHub Copilot / Cursor

**You can tell Copilot to reference the Copilot Context file in the codebase; this is just  here in case.**

Project Overview  
**SPAN (Students for Patient Advocacy Nationwide)** is a React-based website for managing members, bills, applications, volunteer hours, HR, classroom, and mentors. The site uses **Supabase** (PostgreSQL \+ Auth \+ Storage) as the backend, deployed on **GitHub Pages**.

**Tech Stack:**

- **Frontend:** React 18 \+ Vite 5, Bootstrap 5, Bootstrap Icons. **No React Router** — one HTML file per URL (`src/main.jsx` / `App.jsx` `page` prop).
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)  
- **Deployment:** GitHub Pages (static build)  
- **Build Tool:** Vite 5

---

## Database Schema (Supabase PostgreSQL)

**Key Tables:**

- **`members`** \- Member profiles with role-based permissions (`volunteer`, `applications`, `bills`, `registration`, `blog` booleans). Links to `auth.users` via `user_id`. Fields: `member_id` (UUID), `first_name`, optional `middle_name`, `last_name`, optional `preferred_name` (public display when set — directory, team cards, etc.), `email`, `original_email`, `role`, `active`, `image` (filename in storage), `registration_complete`, etc. Display helpers: `src/lib/memberDisplayName.js`.  
    
- **`bills`** \- Legislation tracking. Fields: `bill_id`, `state`, `name`, `position` ('Support', 'Oppose', 'Support If Amended', 'Propose'), `description`, `bill_date`, `legiscan_link`, **`google_doc_link`** (optional link to proposal doc, e.g. Google Doc), `bill_collaborators` (JSONB), `status` ('under\_review', 'approved', 'modified', 'rejected'), **`hidden`** (boolean: when true, approved but not shown on public Bills page; still in Bill Management and submitter's list), `submitted_by`, `reviewed_by`, etc. Either PDF (in storage) or `google_doc_link` required; collaborators required.
- **`get_bills_research()`** \- Supabase RPC: returns **all** `bills` rows with **no** `review_notes` / `reviewed_by` / `reviewed_at` for anyone with **`members.bills`**. Powers **Research → SPAN proposals** (`BillResearchPanel`: separate filters for bill **state**, **number**, **keywords**).
- **LegiScan (Research → Legislature)** \- `fetchLegiscanBillsByFilters` + `fetchLegiscanBillDetailById` in `src/lib/legiscan.js`: separate **State**, **Bill number**, **Keywords** → `getSearch` (results list) + `getBill` for detail; `fetchLegiscanBillBySearch` still used elsewhere. Bill text: `LegislatureBillTextPane` — **`doc_id` first** (`getBillText`), then URL fallback. Requires **`VITE_LEGISCAN_API_KEY`**; CORS may require a proxy.
- **Research → Compare (v1)** \- `BillResearchPanel`: side-by-side **SPAN** (dropdown from current filters) and **LegiScan** (independent search/detail state). Reuses **`SpanResearchBillDetail`** (metadata + proposal PDF/doc) and **`LegislatureResearchBillDetail`** (same blocks as Legislature tab; pass **`idSuffix`** when two version selects can exist).
- **`bill_assignments`** \- Exec-assigned **work items** (not the same as `bills` rows). `title`, `goal`, `additional_info`, `assignee_member_id`, `assigned_by_member_id`, optional `due_date`, `status` (`not_started` \| `in_progress` \| `completed` \| `in_review` \| `approved`), `deliverable_doc_link`, `deliverable_pdf_url`. RLS: execs (all four `members` permission flags) full CRUD including delete; assignee SELECT + UPDATE own rows. **Assignees** are chosen only from members with **`bills`** permission. Dashboard: **Bill Management → Assigned work** (exec); **Bill Submission → Assigned to me** (non-exec with `bills`). Policy-team co-leads and roster rules apply per **`policy_teams`** / **`member_policy_teams`** (see `docs/MIGRATION_POLICY_TEAMS.md`); bill-detail prefill in assign flows is limited to policy-team contexts where the UI provides it.  
    
- **`applications`** \- New member applications. Fields: `application_id`, `email`, `phone_number`, `full_name`, `grade` (applicant school grade text), `school`, `state`, `hours_per_week`, `status` ('pending', 'invited', 'met\_with', 'onboard', 'accepted', 'rejected'), **`numeric_grade`** (optional internal score, decimals OK), `reviewed_by`, `linkedin_url`, `instagram_url`, `resume_file`, etc.  
    
- **`volunteers`** \- Volunteer hour entries. Fields: `id`, `member_id`, `start_timestamp`, `end_timestamp`, `volunteering_job_title`, `volunteering_job_desc`, `approved` ('approved', 'denied', 'waiting'), `supervisor_comment`.  
    
- **`hr_reports`** \- HR complaint reports. Fields: `report_id`, `submitted_by`, `nature_of_complaint`, `regarding_member_id`, `date_occurred`, `details`, `status` ('pending', 'reviewed', 'resolved', 'dismissed'), `reviewed_by`, `review_notes`.  
    
- **`member_requests`** \- Leave/break and project extension requests. Fields: `request_id`, `member_id`, `type` ('leave' | 'extension'), `reason`, `leave_start`, `leave_end`, `project_name`, `requested_by_date`, `status` ('pending', 'approved', 'declined'), `reviewed_by`, `reviewed_at`, `review_notes`, `created_at`. Members submit; execs approve or decline.  
    
- **`member_suggestions`** \- Ideas and suggestions (bill ideas, general interests, web/feature suggestions). Members submit; execs view all, set status, and leave comments. Public bill form uses **`public_bill_recommendations`**. Dashboard: `docs/DASHBOARD_FUNCTIONS.md`.
    
- **`schools`** / **`partners`** \- Homepage carousels (`active` only).
- **`advisors`** / **`mentor_accounts`** / **`mentor_invites`** \- Board of Mentors + mentor login. Not `members`. `docs/MENTOR_LOGIN.md`.
- **`policy_teams`** / **`member_policy_teams`** / **`policy_team_leads`** \- Teams and co-leads. `docs/MIGRATION_POLICY_TEAMS.md`.
- **`bill_outreach_targets`** \- Outreach on approved bills.
- **`member_strikes`**, **`member_removal_proposals`**, **`member_resignations`** \- Executive Conduct.
- **`classroom_*`** \- SPAN Classroom (pilot). Separate from homepage `schools`.
- **`dashboard_calendar_events`** \- Leave-section calendar.

**Legacy tables** (e.g. `projects`, `legislators`, `tasks`, `contact_log`) are not the current bills/outreach/classroom model.

**Storage Buckets:**

- `members-images` \- Profile photos (filename format: `{member_id}.{ext}`)  
- `proposals` \- Bill PDFs (organized by state: `{state}/{bill_name}.pdf`)  
- `schools-images` \- School logos  
- `partners-images` \- Partner logos  
- `applications-resumes` \- Resume files from applications

**Row Level Security (RLS):**

- All tables have RLS enabled  
- Permission checks use role-based columns (`volunteer`, `applications`, `bills`, `registration`) on `members` table  
- "Executive director" \= member with ALL 4 permissions (`volunteer = true AND applications = true AND bills = true AND registration = true`)  
- Many policies use `SECURITY DEFINER` functions to avoid RLS recursion  
- See `supabase/migrations/` for all RLS policies

---

## Code Structure

**Frontend (`src/`):**

- `pages/` \- Page components (DashboardPage, BillsPage, BlogPage / policy briefs, DirectoryPage, LoginPage, HomePage, OurStoryPage, Classroom*, MentorJoinPage)  
- `components/` \- Reusable UI (BillCard, Navbar, ApplicationForm, BillResearchPanel, BillOutreachPanel, etc.)  
- `lib/` \- `supabase.js`, `legiscan.js`, `generateVolunteerPDF.js`, `memberDisplayName.js`, classroom helpers

**Backend (`supabase/`):**

- `migrations/` \- SQL (run in order)  
- `functions/` \- Edge Functions (Deno/TypeScript). Full list: `docs/DEPLOYMENT.md` and `WORK_SUMMARY.md` §0. Includes members-provision, password-reset (**hyper-endpoint**), dashboard-view (**view-member-dashboard**), application/HR/resignation notify and send-* mail, check-ai-text, medium-otp-arm, outreach-send-email, fetch-legiscan-person-contact, classroom-*, mentors-*, web-analytics-summary.

**Exec (executive director):**

- Exactly **all 4 permissions**: `volunteer`, `applications`, `bills`, `registration`. Used for bill approval, member management, and the “View dashboard” action.  
- **View-member-dashboard API:** `GET /functions/v1/view-member-dashboard?member_id=<uuid>` with `Authorization: Bearer <session JWT>`. Returns `{ member, volunteer_entries, leave_requests, bills, applications }` for that member. Caller must be an exec (all 4 perms); otherwise 403\.
- **Dashboard section order:** CSS `order` in `DashboardPage.jsx`. Full current order (members, team leads, execs, mentors): `docs/DASHBOARD_FUNCTIONS.md`.

**Email service (Resend):**

- All emails are sent via **Resend**. API key stored as `RESEND_API_KEY` Supabase secret. Sending domain: `spanationwide.org`, from address: `contact@spanationwide.org`.  
- **Onboarding email** \- Sent automatically by `members-provision` Edge Function when a new member is created. Includes welcome message, temporary password, onboarding steps, and login link. HTML template inlined in the function.  
- **Password reset email** \- Sent by `password-reset` (live URL **`/functions/v1/hyper-endpoint`**). Resolves `members` by SPAN `email` or `original_email`; prefers Auth user for SPAN email; alphanumeric temp password; delivery to personal email when set; email body states the SPAN address required at login. See `docs/FIRST_LOGIN_AND_REGISTRATION.md` §1b.  
- **Send rejection email API:** `POST /functions/v1/send-rejection-email` with `Authorization: Bearer <session JWT>` and body `{ applicant_name, applicant_email }`. Caller must be an exec; otherwise 403\.  
- **Send application invitation email API:** `POST /functions/v1/send-invitation-email` with `Authorization: Bearer <session JWT>` and body `{ applicant_name, applicant_email, dry_run?: boolean }`. If `dry_run: true`, returns `{ from, to, cc, subject, html }` for UI preview (no send). If omitted/false, sends via Resend and returns `{ ok, email_id }`. Default **from** `Joel Blessan <joel.blessan@spanationwide.org>`, **cc** `vishank.panchbhavi@spanationwide.org` (override with secrets `INVITATION_FROM`, `INVITATION_CC`).  
- **Send onboarding scheduling email API:** `POST /functions/v1/send-onboarding-schedule-email` — same pattern (`dry_run` preview); used when marking an application **Onboard** (congrats + ask for two weeks’ availability for the onboarding call). Optional secrets `ONBOARDING_SCHEDULE_FROM` / `ONBOARDING_SCHEDULE_CC`; falls back to invitation from/cc.  
- **Send volunteer verification API:** `POST /functions/v1/send-volunteer-verification` with `Authorization: Bearer <session JWT>` and body `{ member_name, member_email, pdf_base64 }`. Caller must be an exec; otherwise 403\.

**PDF generation (client-side):**

- `jspdf` \+ `jspdf-autotable` for client-side PDF generation  
- `src/lib/generateVolunteerPDF.js` exports `generateVolunteerPDF(member, approvedEntries)` returning `{ pdfBlob, pdfBase64 }`  
- PDF matches the official SPAN volunteer hours verification letter template

**Key Patterns:**

- **Environment variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (in `.env.local`, never committed)  
- **Supabase client:** Import from `src/lib/supabase.js` \- exports `supabase` client  
- **Auth:** Uses Supabase Auth (`supabase.auth.getSession()`, `supabase.auth.signInWithPassword()`, etc.). Login identity is **`members.email`** (`@spanationwide.org`); `original_email` is personal/contact only.  
- **Queries:** Use Supabase JS client (`supabase.from('table').select()`, `.insert()`, `.update()`, `.delete()`)  
- **RPC calls:** `supabase.rpc('function_name', { params })`  
- **Storage:** `supabase.storage.from('bucket').upload()`, `.download()`, `.getPublicUrl()`

---

## Common Tasks & Patterns

**Checking permissions:**

```javascript
// Check if user has specific permission
const hasPermission = (permission) => {
  return member?.[permission] === true || member?.[permission] === 'true'
}

// Check if user is executive director (all 4 permissions)
const isExec = hasPermission('volunteer') && hasPermission('applications') &&
               hasPermission('bills') && hasPermission('registration')
```

**Member data loading:**

```javascript
// Load current user's member data
const { data: { session } } = await supabase.auth.getSession()
const email = session?.user?.email

const { data: memberData } = await supabase
  .from('members')
  .select('*')
  .eq('email', email)
  .maybeSingle()
```

**File uploads (Storage):**

```javascript
// Upload profile image
const filename = `${memberId}.${ext}`
const { error } = await supabase.storage
  .from('members-images')
  .upload(filename, file, { cacheControl: '3600', upsert: true })

// Get public URL
const { data } = supabase.storage.from('members-images').getPublicUrl(filename)
```

**RLS-aware queries:**

- Most queries work automatically with RLS (user can only see their own data unless they have permission)  
- For admin operations (create/update members), use RPC functions (`create_member`, `update_member`) which bypass RLS with `SECURITY DEFINER`

**Bill status workflow:**

- Non-exec members submit bills with `status = 'under_review'`  
- Execs can approve (`status = 'approved'`), reject (`status = 'rejected'`), or modify (`status = 'modified'`)  
- Public Bills page only shows `status = 'approved'` or `status = 'modified'`

---

## Key Features & Workflows

### Member Onboarding Flow

1. **Application submission** \- Public submits application via homepage form → stored in `applications` table with `status = 'pending'`  
2. **Application review** \- Execs (with `applications` permission) review in dashboard: status pipeline (invited → met with → onboard), optional **numeric_grade** review score, notes, accept/reject  
3. **Member creation** \- When accepted, a member with **registration** permission (or an exec) opens Add Member (data pre-filled) and submits → calls `create_member` RPC → creates `members` row \+ Supabase Auth user → triggers Edge Function (`members-provision`) → sends welcome email with temp password \+ sets up Cloudflare email routing. Only **execs** can set the new member's permissions when adding or editing.  
4. **Registration form** \- New member logs in → sees registration form if `registration_complete = false` → fills required fields (name, email, phone, DOB, school, city, state, profile photo) → uploads photo to `members-images` bucket → sets `registration_complete = true`  
5. **Dashboard access** \- Once `registration_complete = true`, member can access full dashboard

### Bill Submission & Approval Workflow

1. **Submission** \- Members with `bills` permission can submit bills:  
   - **Execs** (all 4 permissions): Bills auto-approved (`status = 'approved'`) → appear on public Bills page immediately (unless hidden)  
   - **Non-execs** (only `bills` permission): Bills submitted with `status = 'under_review'` → hidden from public until approved. Must provide **either** a proposal PDF **or** `google_doc_link`, and at least one collaborator. They can view their submissions in **My Submitted Bills** (View PDF, open Google Doc, LegiScan).  
2. **Review** \- Execs see "Under Review" bills in dashboard → can **Approve** (live), **Approve but hide** (approved but not on public site), reject, or modify-and-approve. In Edit, execs can toggle **Hide from public site**.  
3. **Public display** \- Only bills with `status` in ('approved', 'modified') and **`hidden = false`** appear on public Bills page. Hidden bills stay in backend; execs and submitters still see them in their dashboards.  
4. **Bill management** \- Execs can edit/delete bills, upload PDFs to `proposals` bucket (organized by state).

### Volunteer Hours Management

1. **Submission** \- Members submit volunteer hours (datetime range or direct hours input) → stored in `volunteers` table with `approved = 'waiting'`  
2. **Approval** \- Members with `volunteer` permission can view all entries → approve (`approved = 'approved'`) or deny (`approved = 'denied'`) → can add supervisor comments  
3. **Viewing** \- Members see their own entries; execs see all entries  
4. **Verification Letter** \- Execs can generate a PDF verification letter (matching official SPAN template) for any member with approved entries → preview in modal → send to member's personal email via Resend with PDF attached

### HR Reports System

1. **Submission** \- Any authenticated member can submit HR report → stored in `hr_reports` with `status = 'pending'`  
2. **Viewing** \- Members see their own reports; **execs** (all 4 permissions) see all reports **except** reports about themselves (`regarding_member_id` \!= their `member_id`)  
3. **Status updates** \- Only **execs** can update report status (pending → reviewed → resolved/dismissed)

### Leave & Extension Requests

1. **Submission** \- Any member can submit a leave/break or project extension request → stored in `member_requests` with `type` ('leave' | 'extension'), `reason` (required), optional `leave_start`/`leave_end` or `project_name`/`requested_by_date`, `status = 'pending'`  
2. **Viewing** \- Members see their own requests; **execs** see all requests. Section sits **right under “Your Info”** on the dashboard. Table columns: Member (exec only), Type, Reason, Details, Status, Submitted, Actions (View). **Reviewed by** and **Review notes** are **not** in the table — only in the **Request View** modal.  
3. **Request View modal** \- Every request has a **View** button (members and execs). Modal shows: Member (name, email), Type, Reason, Details, Status, Submitted, **Reviewed by** (name + date) if set, **Review notes** if set. For **execs on pending requests**, the same modal has optional “Review notes” textarea and **Approve** / **Decline** buttons; submit updates `status`, `reviewed_by`, `reviewed_at`, `review_notes`. Execs approve/decline only from the modal, not inline in the table.  
4. **Reviewer data** \- `loadMyRequests` and `loadAllMemberRequests` load reviewer and attach `reviewed_by_member` (first_name, last_name). The **view-member-dashboard** Edge Function enriches `leave_requests` with `reviewed_by_member` so “view as” also has reviewer info.

### Ideas & suggestions

1. **Submission** \- Any member can submit from the dashboard: **Type** (Bill idea | General interest | Web / feature suggestion), **Title** (required), **Description** (optional) → stored in `member_suggestions` with `status = 'pending'`.
2. **Viewing** \- Members see their own suggestions; **execs** see all with filters (All, Pending, Under review, Approved, Declined). The list **defaults to Pending**. Section sits after Leave & extension, before Volunteer hours.
3. **Suggestion View modal** \- View button opens modal with full details. **Execs** can set status (Pending, Under review, Approved, Declined) and optional **Review notes** (comments for the member). Updates set or clear `reviewed_by`, `reviewed_at`, `review_notes`.  
4. **Table:** `member_suggestions` (internal) and `public_bill_recommendations` (Bills page form). Migration: `supabase/migrations/create_member_suggestions_table.sql`. Dashboard: `docs/DASHBOARD_FUNCTIONS.md`.

### Profile Picture Management

1. **Own profile** \- Members can update their own profile picture:  
   - Upload file to `members-images` bucket (filename: `{member_id}.{ext}`)  
   - Call `update_own_member_image(filename)` RPC → updates `members.image` column (bypasses RLS)  
   - Frontend uses cache-busting query param (`?v={timestamp}`) to force browser reload  
2. **Exec management** \- Members with **registration** permission can upload/update/delete any member's profile picture from Member Management dashboard

### Member Management (Registration Permission)

- **Who sees it** \- Members with **registration** permission see the Member Management section: member list, Add New Member, edit member, active/inactive, view-as link, change any member's profile photo.  
- **Create member** \- Anyone with registration can add a member (name, email, role, details). The four **permission checkboxes** (volunteer, applications, bills, registration) are only visible to **execs** when adding or editing; only execs can set or change a member's permissions.  
- **Edit member** \- Anyone with registration can edit a member's details and active status → calls `update_member` RPC. Only **execs** can see or edit the permission checkboxes.  
- **Active/Inactive** \- Members with `active = false` are hidden from directory and moved to "Inactive Members" section in dashboard  
- **Import from application** \- When creating member, can import data from accepted application

### Schools, Partners & Mentors

- **Schools / partners** \- Execs manage homepage carousels (`schools-images`, `partners-images`).  
- **Mentors** \- `advisors` + `mentor_accounts`. Invite link or Add Mentor. Login `login.html?mode=mentor`. `docs/MENTOR_LOGIN.md`.

### Policy briefs (Medium)

- Public pages: `policy-briefs.html` / `policy-brief.html` (Medium RSS). `blog.html` redirects.  
- Dashboard Medium OTP for members with **blog** permission.

### Classroom (pilot)

- Exec dashboard **Classroom** section provisions schools/teachers. Teachers/students use `classroom/join.html` and `classroom/dashboard.html`. Tables `classroom_*`. Functions `classroom-provision-teacher`, `classroom-join-student`.

### Executive Conduct / resign

- Strikes, removal proposals, resignation queue. Letters: `send-member-letter-email`. Members can **Resign from SPAN**.

### Bills Page Features

- **PDF viewer** \- Inline PDF viewer (react-pdf) with page navigation  
- **Keyword extraction** \- Extracts keywords from PDF text → searchable in search bar  
- **LegiScan integration** \- Optional LegiScan API integration for live bill status (info icon on bill cards)  
- **Filtering** \- By position (Support/Oppose/Support If Amended/Propose), by state, search by name/description/keywords/collaborators  
- **Pagination** \- 6 bills per page

---

## Important Notes

- **Never commit `.env.local`** \- it's in `.gitignore`  
- **All SQL migrations are in `supabase/migrations/`** \- reference these for current schema/RLS  
- **Role-based permissions replaced tiering system** \- use `volunteer`, `applications`, `bills`, `registration`, and **`blog`** booleans, not `is_executive_director` or `tier`  
- **Bill position values:** 'Support', 'Oppose', 'Support If Amended', 'Propose' (not 'Proposed')  
- **Profile images:** Stored as `{member_id}.{ext}` in `members-images` bucket  
- **Bill PDFs:** Stored as `{state}/{bill_name}.pdf` in `proposals` bucket (sanitized filenames)

---

## File Locations Reference

- **Database schema:** `supabase/migrations/full_db_schema_for_ref.sql` (reference only, not meant to run)  
- **Setup guide:** `docs/SETUP.md`  
- **React / Vite dev:** `docs/README-REACT.md`, env vars for frontend: `docs/README-ENV.md`  
- **Deployment (Pages + functions):** `docs/DEPLOYMENT.md`  
- **Email HTML references (not runtime):** `docs/email-templates/`  
- **Member onboarding / provisioning (high level):** `docs/ADDING_A_NEW_MEMBER.md`, `docs/FIRST_LOGIN_AND_REGISTRATION.md`, Edge Function `supabase/functions/members-provision/`; secrets and CLI in `docs/SETUP.md`  
- **Ideas & suggestions:** `docs/DASHBOARD_FUNCTIONS.md`  
- **LegiScan bill status timeline (UI):** `src/components/BillStatusTimeline.jsx` and timeline fields from `src/lib/legiscan.js` (used on public bill cards)
- **Bills exec suite:** `docs/BILLS_EXEC_SUITE_SPEC.md` — assignments, research, outreach implemented.  
- **Mentors:** `docs/MENTOR_LOGIN.md`  
- **Policy teams:** `docs/MIGRATION_POLICY_TEAMS.md`  
- **Shipped features:** `WORK_SUMMARY.md` §0  
- **Docs changelog:** `docs/DOCS_CHANGELOG.md`  
- **Supabase client:** `src/lib/supabase.js`  
- **Page switch (not React Router):** `src/App.jsx`  
- **Entry point:** `src/main.jsx`

---

**When writing code:**

- Follow existing patterns (check similar components/pages)  
- Use Supabase client from `src/lib/supabase.js`  
- Respect RLS policies (use RPC functions for admin operations)  
- Check permission booleans before showing admin UI  
- Use Bootstrap classes for styling (already included)  
- Environment variables must start with `VITE_` to be exposed to frontend
