# Master Context Prompt for GitHub Copilot / Cursor

**You can tell Copilot to reference the Copilot Context file in the codebase; this is just  here in case.**

Project Overview  
**SPAN (Students for Patient Advocacy Nationwide)** is a React-based website for managing members, bills, applications, volunteer hours, and HR reports. The site uses **Supabase** (PostgreSQL \+ Auth \+ Storage) as the backend, deployed on **GitHub Pages**.

**Tech Stack:**

- **Frontend:** React 18 \+ Vite, React Router, Bootstrap 5, Bootstrap Icons  
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)  
- **Deployment:** GitHub Pages (static build)  
- **Build Tool:** Vite 5

---

## Database Schema (Supabase PostgreSQL)

**Key Tables:**

- **`members`** \- Member profiles with role-based permissions (`volunteer`, `applications`, `bills`, `registration` booleans). Links to `auth.users` via `user_id`. Fields: `member_id` (UUID), `first_name`, `last_name`, `email`, `original_email`, `role`, `active`, `image` (filename in storage), `registration_complete`, etc.  
    
- **`bills`** \- Legislation tracking. Fields: `bill_id`, `state`, `name`, `position` ('Support', 'Oppose', 'Support If Amended', 'Propose'), `description`, `bill_date`, `legiscan_link`, `bill_collaborators` (JSONB), `status` ('under\_review', 'approved', 'modified', 'rejected'), `submitted_by`, `reviewed_by`, etc.  
    
- **`applications`** \- New member applications. Fields: `application_id`, `email`, `phone_number`, `full_name`, `grade`, `school`, `state`, `hours_per_week`, `status` ('pending', 'under\_review', 'contacted', 'accepted', 'rejected'), `reviewed_by`, `linkedin_url`, `instagram_url`, `resume_file`, etc.  
    
- **`volunteers`** \- Volunteer hour entries. Fields: `id`, `member_id`, `start_timestamp`, `end_timestamp`, `volunteering_job_title`, `volunteering_job_desc`, `approved` ('approved', 'denied', 'waiting'), `supervisor_comment`.  
    
- **`hr_reports`** \- HR complaint reports. Fields: `report_id`, `submitted_by`, `nature_of_complaint`, `regarding_member_id`, `date_occurred`, `details`, `status` ('pending', 'reviewed', 'resolved', 'dismissed'), `reviewed_by`, `review_notes`.  
    
- **`member_requests`** \- Leave/break and project extension requests. Fields: `request_id`, `member_id`, `type` ('leave' | 'extension'), `reason`, `leave_start`, `leave_end`, `project_name`, `requested_by_date`, `status` ('pending', 'approved', 'declined'), `reviewed_by`, `reviewed_at`, `review_notes`, `created_at`. Members submit; execs approve or decline.  
    
- **`schools`** \- School partners. Fields: `school_id`, `school_name`, `school_image` (filename), `display_order`, `active`.  
    
- **`partners`** \- Partner organizations. Fields: `partner_id`, `partner_name`, `partner_logo` (filename), `website_url`, `display_order`, `active`.

**Other tables:** The database may contain additional tables (e.g. `projects`, `legislators`, `tasks`, `contact_log`, `timeline_phases`, `project_members`, `legislator_recommendations`). They are not used by the main app workflows documented here; ignore them for day-to-day work unless you're told otherwise.

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

- `pages/` \- Page components (DashboardPage, BillsPage, BlogPage, DirectoryPage, LoginPage, HomePage, OurStoryPage)  
- `components/` \- Reusable components (BillCard, BlogCard, Navbar, Footer, ApplicationForm, RegistrationForm, CollaboratorAvatars, PDFViewer, Pagination, etc.)  
- `lib/` \- Utilities (`supabase.js` \- Supabase client setup, `legiscan.js` \- LegiScan API helper)

**Backend (`supabase/`):**

- `migrations/` \- SQL migration files (run in order, all RLS policies and functions are here)  
- `functions/` \- Edge Functions (Deno/TypeScript): `members-provision/` (member onboarding), `password-reset/` (password reset emails), `dashboard-view/` (source; deployed as `view-member-dashboard`), `send-rejection-email/` (sends application rejection email via Resend), `send-volunteer-verification/` (sends volunteer hours verification PDF via Resend)

**Exec (executive director):**

- Exactly **all 4 permissions**: `volunteer`, `applications`, `bills`, `registration`. Used for bill approval, member management, and the “View dashboard” action.  
- **View-member-dashboard API:** `GET /functions/v1/view-member-dashboard?member_id=<uuid>` with `Authorization: Bearer <session JWT>`. Returns `{ member, volunteer_entries, leave_requests, bills, applications }` for that member. Caller must be an exec (all 4 perms); otherwise 403\.

**Email service (Resend):**

- All emails are sent via **Resend**. API key stored as `RESEND_API_KEY` Supabase secret. Sending domain: `spanationwide.org`, from address: `contact@spanationwide.org`.  
- **Onboarding email** \- Sent automatically by `members-provision` Edge Function when a new member is created. Includes welcome message, temporary password, onboarding steps, and login link. HTML template inlined in the function.  
- **Password reset email** \- Sent by `password-reset` Edge Function. Includes temporary password and login instructions. HTML template inlined in the function.  
- **Send rejection email API:** `POST /functions/v1/send-rejection-email` with `Authorization: Bearer <session JWT>` and body `{ applicant_name, applicant_email }`. Caller must be an exec; otherwise 403\.  
- **Send volunteer verification API:** `POST /functions/v1/send-volunteer-verification` with `Authorization: Bearer <session JWT>` and body `{ member_name, member_email, pdf_base64 }`. Caller must be an exec; otherwise 403\.

**PDF generation (client-side):**

- `jspdf` \+ `jspdf-autotable` for client-side PDF generation  
- `src/lib/generateVolunteerPDF.js` exports `generateVolunteerPDF(member, approvedEntries)` returning `{ pdfBlob, pdfBase64 }`  
- PDF matches the official SPAN volunteer hours verification letter template

**Key Patterns:**

- **Environment variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (in `.env.local`, never committed)  
- **Supabase client:** Import from `src/lib/supabase.js` \- exports `supabase` client  
- **Auth:** Uses Supabase Auth (`supabase.auth.getSession()`, `supabase.auth.signInWithPassword()`, etc.)  
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
2. **Application review** \- Execs (with `applications` permission) review in dashboard, can accept/reject/add notes  
3. **Member creation** \- When accepted, a member with **registration** permission (or an exec) opens Add Member (data pre-filled) and submits → calls `create_member` RPC → creates `members` row \+ Supabase Auth user → triggers Edge Function (`members-provision`) → sends welcome email with temp password \+ sets up Cloudflare email routing. Only **execs** can set the new member's permissions when adding or editing.  
4. **Registration form** \- New member logs in → sees registration form if `registration_complete = false` → fills required fields (name, email, phone, DOB, school, city, state, profile photo) → uploads photo to `members-images` bucket → sets `registration_complete = true`  
5. **Dashboard access** \- Once `registration_complete = true`, member can access full dashboard

### Bill Submission & Approval Workflow

1. **Submission** \- Members with `bills` permission can submit bills:  
   - **Execs** (all 4 permissions): Bills auto-approved (`status = 'approved'`) → appear on public Bills page immediately  
   - **Non-execs** (only `bills` permission): Bills submitted with `status = 'under_review'` → hidden from public until approved  
2. **Review** \- Execs see "Under Review" bills in dashboard → can approve, reject, or modify-and-approve  
3. **Public display** \- Only bills with `status = 'approved'` or `status = 'modified'` appear on public Bills page  
4. **Bill management** \- Execs can edit/delete bills, upload PDFs to `proposals` bucket (organized by state)

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

### Schools & Partners Management

- **Schools** \- Execs manage school partners (name, logo, display order, active status) → displayed on homepage carousel (only `active = true`)  
- **Partners** \- Execs manage partner organizations (name, logo, website, display order, active status) → displayed on homepage (only `active = true`)  
- **Storage** \- Logos stored in `schools-images` and `partners-images` buckets

### Blog Integration

- Fetches posts from Medium via RSS → JSON API  
- Featured article on page 1, paginated (5 posts/page)  
- Author names automatically linked to SPAN directory profiles if match found

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
- **Role-based permissions replaced tiering system** \- use `volunteer`, `applications`, `bills`, `registration` booleans, not `is_executive_director` or `tier`  
- **Bill position values:** 'Support', 'Oppose', 'Support If Amended', 'Propose' (not 'Proposed')  
- **Profile images:** Stored as `{member_id}.{ext}` in `members-images` bucket  
- **Bill PDFs:** Stored as `{state}/{bill_name}.pdf` in `proposals` bucket (sanitized filenames)

---

## File Locations Reference

- **Database schema:** `supabase/migrations/full_db_schema_for_ref.sql` (reference only, not meant to run)  
- **Setup guide:** `docs/SETUP.md`  
- **Auth provisioning docs:** `docs/auth-provisioning.md`  
- **Supabase client:** `src/lib/supabase.js`  
- **Main app router:** `src/App.jsx`  
- **Entry point:** `src/main.jsx`

---

**When writing code:**

- Follow existing patterns (check similar components/pages)  
- Use Supabase client from `src/lib/supabase.js`  
- Respect RLS policies (use RPC functions for admin operations)  
- Check permission booleans before showing admin UI  
- Use Bootstrap classes for styling (already included)  
- Environment variables must start with `VITE_` to be exposed to frontend
