# SPAN Database Architecture Summary

This section gives you a **mental model**: what lives where and how the pieces connect. You don’t need to memorize every column — focus on **which tables exist**, **what they’re for**, and **how they connect to `members`**. When you’re coding, you’ll usually load the current member first, then use their `member_id` or permissions to decide what to show or query.

---

## 1\. Overview (three ideas)

- **Backend** — Supabase \= **PostgreSQL** (tables) \+ **Auth** (login/sessions) \+ **Storage** (files). The app talks to the database using the logged-in user’s session, not a superuser account.  
- **Security** — Every table has **Row Level Security (RLS)**. Basically, who can see what is decided in the database, not only in the app.  
- **Auth link** — Logged-in users live in Supabase’s `auth.users`. Our app links each of them to one row in **`members`** via `members.user_id`. So: one Auth user → one member record (when they’re a SPAN member).

**Takeaway:** Data is in **tables**; **members** is the hub; **RLS** decides who can see or change what.

---

## 2\. The hub: `members`

Almost everything ties back to **`members`**.

| What | Meaning |
| :---- | :---- |
| **Who they are** | Legal name: **first\_name**, optional **middle\_name**, **last\_name**. Optional **preferred\_name** controls how the person appears on the public directory, team cards, and similar surfaces (when empty, the app uses the legal name). Org email addresses stay **`firstname.lastname@…`** style from first + last only. Plus email, phone, school, city, state, DOB, bio, profile image, etc. |
| **Auth** | `user_id` points to `auth.users.id`. If set, they can log in. |
| **Permissions** | Four booleans: `volunteer`, `applications`, `bills`, `registration`. They control what that person can do in the dashboard (e.g. approve volunteer hours, review applications, submit/approve bills, manage members). |
| **Exec** | A member with **all four** **permissions** true. Execs can approve bills, manage members, view any member’s dashboard, handle HR reports, approve leave/extension requests, etc. |
| **Lifecycle** | `active` (in directory vs inactive), `registration_complete` (must complete registration form after first login), `start_date` / `end_date`. |

When you see a column like `submitted_by` or `member_id` on another table, it’s pointing at `members.member_id`. That’s how we know “who did what” and how RLS can say “this user can only see their own rows (or everyone’s if they’re an exec).”

---

## 3\. Tables by area

Grouped by **what they’re used for**. The main ones you’ll care about day to day are below.

### Applications (joining SPAN) table

| Table | Purpose |
| :---- | :---- |
| **`applications`** | Public application form. One row per application: email, name, `grade` (school grade text), school, state, hours per week, social links, resume filename. `status`: pending → invited → met\_with → onboard → accepted/rejected. **`numeric_grade`** optional internal review score (decimals allowed). `reviewed_by` \= member who reviewed it. No login required to submit (anonymous insert). |

When someone is accepted, we **create a member** from that application (via the dashboard); the application row doesn’t link to a member until we do that. Note this is not to be confused with the permission “applications”.

### Bills (legislation) table

| Table | Purpose |
| :---- | :---- |
| **`bills`** | One row per bill: state, name, position (Support / Oppose / Support If Amended / Propose), description, date, LegiScan link, **google_doc_link** (optional link to proposal doc, e.g. Google Doc), collaborators. **hidden** (boolean): when true, bill is approved but not shown on the public Bills page; still visible in Bill Management and to the submitter. `status`: under\_review → approved / modified / rejected. `submitted_by` and `reviewed_by` are member IDs. Only approved/modified bills with **hidden = false** show on the public Bills page. Either a proposal PDF (in storage) or **google_doc_link** is required on submit; collaborators are required. |
| **`get_bills_research()`** | RPC (`SECURITY DEFINER`, `authenticated` only): returns a **non-internal** projection of all **`bills`** rows for users with **`members.bills`**. Includes bill\_id, state, name, position, description, bill\_date, legiscan\_link, google\_doc\_link, bill\_collaborators, status, hidden, submitted\_by, submitted\_at. **Excludes** review\_notes, reviewed\_by, reviewed\_at so bill members can research the full SPAN corpus without internal review data. Dashboard **Research** tab. Migration: `supabase/migrations/bills_research_get_bills_research_rpc.sql`. |
| **`bill_assignments`** | **Exec-assigned work** (research / drafting tasks), separate from formal **`bills`** submission. Fields: **title**, **goal**, **additional_info**, **assignee_member_id**, **assigned_by_member_id**, optional **due_date**, **status** (`not_started` → `in_progress` → `completed` → `in_review` → `approved`), **deliverable_doc_link**, **deliverable_pdf_url**. RLS: **execs** (all four member permissions) full access including **DELETE**; **assignee** can SELECT and UPDATE own rows. The dashboard **assignee picker** only lists members with **`bills`** permission. Dashboard: Bill Management → **Assigned work**; Bill Submission → **Assigned to me** (non-exec bill members). |
| ~~**`Bill_proposals (obsolete)`**~~ | ~~(Obsolete.) Used for proposal text / AI review. Bills that appear on the site are in `bills`.~~ |

Bill **PDFs** are in the **Storage** bucket `proposals`, not in the DB. Also note this is not to be confused with the permission “bills”.

### Volunteer hours table

| Table | Purpose |
| :---- | :---- |
| **`volunteers`** | One row per volunteer hour entry: `member_id`, start/end time, job title, description. `approved`: waiting → approved/denied. `supervisor_comment`. Members add and see their own; members with **volunteer** permission see all and can approve/deny. |

### HR, leave/extension, and suggestions tables

| Table | Purpose |
| :---- | :---- |
| **`hr_reports`** | HR complaints: who submitted, who it’s about (`regarding_member_id`), nature, date, details. `status`: pending → reviewed → resolved/dismissed. Only **execs** can update status. |
| **`member_requests`** | Leave/break or project extension requests. `member_id`, type (leave / extension), reason, optional dates or project name. `status`: pending → approved/declined. **Execs** approve or decline; the app sets `reviewed_by`, `reviewed_at`, `review_notes`. Dashboard and view-member-dashboard enrich with `reviewed_by_member` (reviewer name) for display in the Request View modal. |
| **`member_suggestions`** | Ideas and suggestions: bill ideas, general interests, web/feature suggestions. `member_id`, `type` (bill_idea / general_interest / web_dev_feature), `title`, `description`. `status`: pending → under_review / approved / declined. **Execs** view all, set status, and leave `review_notes`. See `docs/SUGGESTIONS.md`. |

### Public-facing content (no per-member ownership) tables

| Table | Purpose |
| :---- | :---- |
| **`schools`** | School partners: name, image filename, display order, `active`. Only active schools show on the homepage. |
| **`partners`** | Partner organizations: name, logo filename, website, display order, `active`. Same idea. |

### Auth / internal (reference only) 

| Table / system | Purpose |
| :---- | :---- |
| **`auth.users`** | Supabase Auth — emails, passwords, session. We use it for login; we don’t create tables here. |
| **`qr_logins`** | If QR-based login is used; stores a token and link to `auth.users`. |
| **`agent_proposal_reviews`** | (Obsolete.) AI review results for bill proposals. |

You’ll rarely touch these when doing normal feature work.

---

## 4\. Storage buckets (files, not rows)

Files live in **Supabase Storage**, not in PostgreSQL. The DB only stores **filenames** (or paths); the app uploads/downloads via the Supabase client.

| Bucket | What’s in it |
| :---- | :---- |
| **`members-images`** | Profile photos. Filename: `{member_id}.{ext}`. |
| **`proposals`** | Bill PDFs. By state: e.g. `{state}/{bill_name}.pdf`. |
| **`schools-images`** | School logos. |
| **`partners-images`** | Partner logos. |
| **`applications-resumes`** | Resume uploads from the application form. |

---

## 5\. How RLS fits in (plain English)

- **RLS is on for every table.** So even if the app code says “select from bills,” Postgres only returns rows the **current user** is allowed to see.  
- **Current user** \= the person whose session (JWT) is in the request. The policies often do: “find the row in `members` where `user_id` \= this session’s user id,” then allow:  
  - **Own rows only** — e.g. volunteer entries where `member_id` \= that member (so you only see your own unless you have permission).  
  - **All rows** — for **execs** (all four permission booleans true), e.g. view any member’s data, approve bills.  
- **Admin-style writes** (create/update members, update report status) go through **RPC functions** in the migrations. Those run with elevated privileges (`SECURITY DEFINER`) so they can do things RLS would block. The app calls them with `supabase.rpc('function_name', { ... })`.
- **Own `members` row updates:** policies may compare the session to the row using **JWT claims** (email / `user_id`) rather than selecting from **`auth.users`**, so members can update their profile without needing table privileges on `auth.users`. See migration **`members_rls_use_jwt_email_not_auth_users.sql`**.

**In one line:** Tables \= what data we have; **RLS** \= who can see/change it; **RPC** \= when we need a controlled admin action.

---

## 6\. Quick reference: table → purpose

If you forget what a table is for, use this list.

| Table | One-line purpose |
| :---- | :---- |
| **members** | People in SPAN; link to Auth; permissions and profile. |
| **applications** | Pre-login applications to join; reviewed then accepted/rejected. |
| **bills** | Legislation we track; status workflow for public display. |
| **bill\_proposals** | (Obsolete.) Proposal text / AI review. |
| **volunteers** | Volunteer hour entries; member-owned; approval workflow. |
| **hr\_reports** | HR complaints; execs manage status. |
| **member\_requests** | Leave/extension requests; members submit, execs approve/decline. |
| **schools** | School partners for homepage; display order, active flag. |
| **partners** | Partner orgs for homepage; same idea. |

**Other tables:** You may see more tables in Supabase (e.g. `projects`, `legislators`, `tasks`, `contact_log`, `timeline_phases`, `project_members`, `legislator_recommendations`). They’re not covered here and aren’t needed for the main workflows above. No need to worry about them for now.

---

## 7\. Where to look in the repo

- **Table definitions and RLS** — `supabase/migrations/` (SQL files, run in order). For a full snapshot of tables/columns (reference only, don’t run as one script): `supabase/migrations/full_db_schema_for_ref.sql`.  
- **How the app uses the DB** — `src/lib/supabase.js` (client); then any `supabase.from('table_name')` or `supabase.rpc(...)` in `src/`. `docs/COPILOT_CONTEXT.md` has a short schema list and patterns (member loading, permissions, storage).

Once this layout makes sense, the rest of the onboarding sections should fit in. If you have questions, let me know\!  