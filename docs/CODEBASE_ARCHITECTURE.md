# SPAN Codebase Architecture — At a Glance

This is the written summary for the **Codebase architecture** tab. It gives you a map of where things live and how the app is wired so you can find your way when you dive into each feature.

---

## 1\. Tech stack

**Frontend:** React 18 \+ Vite 5, Bootstrap 5 and Bootstrap Icons.   
**Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions).   
**Deployment:** Static build to GitHub Pages.   
No separate Node server — the browser talks to Supabase directly using the Supabase JS client.

---

## 2\. How the app is built and “routed”

SPAN is **multi-page**, not a single-page app with client-side routing.

- There is **no React Router**. Each “page” is a **separate HTML file**: `index.html` (home), `bills.html`, `policy-briefs.html`, `policy-brief.html`, `login.html`, `dashboard.html`, `directory.html`, `our-story.html`, `classroom/join.html`, `classroom/dashboard.html`, `mentor-join.html`. `blog.html` / `blog-post.html` redirect to the policy-briefs URLs.
- Each HTML file includes the same script: `/src/main.jsx`. The HTML has a single **root div** with an id like `home-root`, `bills-root`, or `dashboard-root`.  
- **`main.jsx`** runs on every page. It looks for whichever root div exists on that page and mounts **`App`** with a **`page`** prop (e.g. `'home'`, `'login'`, `'dashboard'`). So one HTML page \= one root \= one page name.  
- **`App.jsx`** is a big switch on `page`: it lazy-loads and renders the right page component (`HomePage`, `LoginPage`, `DashboardPage`, etc.). Heavy pages are loaded on demand via `lazy()`.  
- **Navbar** and **Footer** are mounted once into `#navbarContainer` and `#footerContainer`, which exist on every HTML page. So layout is consistent without React Router.

**Protected vs public:** There’s no router guard. The **dashboard** is “protected” because `DashboardPage` checks the Supabase session on load; if there’s no session, it redirects to `login.html`. `LoginPage` redirects to `dashboard.html` if the user is already logged in.

---

## 3\. Folder structure (where to look)

span/

├── index.html, bills.html, login.html, dashboard.html, ...   \# One HTML file per “route”

├── src/

│   ├── main.jsx          \# Entry: mounts App \+ Navbar \+ Footer by root id

│   ├── App.jsx           \# Switch on page prop → lazy-loaded page component

│   ├── App.css, index.css

│   ├── pages/            \# One component per screen (HomePage, LoginPage, DashboardPage, …)

│   ├── components/       \# Reusable UI (Navbar, Footer, BillCard, ApplicationForm, …)

│   └── lib/              \# Shared utilities

│       ├── supabase.js   \# Supabase client (import this for DB/Auth/Storage)

│       ├── legiscan.js   \# LegiScan API helper

│       ├── memberDisplayName.js   \# Public vs legal display names (preferred / first+middle+last)

│       └── generateVolunteerPDF.js   \# Client-side PDF for volunteer verification

├── supabase/

│   ├── migrations/       \# SQL: tables, RLS, functions (run in order)

│   └── functions/        \# Edge Functions (Deno/TS): members-provision, password-reset, etc.

└── docs/                 \# Setup, DB architecture, this file, etc.

- **Pages** \= one big component per screen; they often hold a lot of state and call Supabase.  
- **Components** \= reusable pieces used by pages (or by other components). Things like forms, cards, modals live here.  
- **lib** \= shared Supabase client (`src/lib/supabase.js`) and helpers. The public application form uses a second client with `persistSession: false` so an exec testing the form does not submit under their JWT. 
- **supabase/migrations** \= source of truth for schema and RLS. **supabase/functions** \= serverless endpoints (invoked by the app or by Supabase triggers).

---

## 4\. Where key things live

| What | Where |
| :---- | :---- |
| **Supabase client** | `src/lib/supabase.js` — import `{ supabase }` and use for `.from()`, `.auth`, `.storage`, `.rpc()`. |
| **Env vars** | `.env.local` in project root. Only vars starting with **`VITE_`** are available in the browser (`import.meta.env.VITE_SUPABASE_URL`, etc.). |
| **Navbar / Footer** | `src/components/Navbar.jsx`, `src/components/Footer.jsx`. Mounted in `main.jsx`. |
| **Auth checks** | Done inside pages (e.g. `DashboardPage` uses `supabase.auth.getSession()` and redirects to `login.html` if no session). Member data loaded from `members` table by matching `user_id` to `auth.uid()`. |
| **Permissions (volunteer, applications, bills, registration, blog)** | Stored on the `members` row. The app reads the current member and checks those booleans before showing admin UI or calling admin-only RPCs. |
| **Styles** | Bootstrap 5 (CDN) \+ Bootstrap Icons. Page- or component-specific CSS files live next to the component (e.g. `DashboardPage.css`). |

---

## 5\. Patterns

- **Data:** Use `supabase.from('table_name').select()`, `.insert()`, `.update()` for normal CRUD. RLS on the server decides what the current user can see or change.  
- **Auth:** `supabase.auth.getSession()`, `signInWithPassword()`, `signOut()`. Session is a JWT; the app sends it with every request.  
- **Admin actions:** When the app needs to do something that RLS would block (e.g. create/update another member), it calls **RPCs** defined in migrations (e.g. `create_member`, `update_member`). Those run with elevated privileges.  
- **Files:** Upload to a Storage bucket (e.g. `members-images`), then save the **filename** (or path) in the relevant table. Download or display via `supabase.storage.from('bucket').getPublicUrl(filename)` or similar.  
- **Permissions in UI:** Load the current user’s `members` row; check `member.volunteer`, `member.applications`, etc. “Executive director” \= volunteer, applications, bills, and registration all true. `blog` is a fifth flag. Mentors are not members; they use `mentor_accounts`.

---

## 6\. Edge Functions (where they live and when they’re used)

All live under **`supabase/functions/`**. Each is a separate function deployed to Supabase, that basically does an action behind-the-scenes on the server:

| Function | Purpose |
| :---- | :---- |
| **members-provision** | After `create_member` insert: Auth user, Cloudflare forward, welcome email. |
| **password-reset** | Forgot Password. **Deployed as `hyper-endpoint`**. |
| **dashboard-view** | **Deployed as `view-member-dashboard`**. Exec view-as. |
| **send-invitation-email** / **send-onboarding-schedule-email** / **send-rejection-email** | Application pipeline mail (Resend; invite/onboard support `dry_run` preview). |
| **send-volunteer-verification** | Volunteer hours PDF to member email. Exec-only. |
| **send-member-letter-email** | Honorable-exit, removal notice, policy-violation letters. |
| **notify-new-application** / **notify-hr-report** / **notify-resignation-request** | Internal alerts. |
| **check-ai-text** | ScreenComply / RoBERTa advisory screening. |
| **medium-otp-arm** | Medium OTP forwarding for blog editors. |
| **fetch-legiscan-person-contact** / **outreach-send-email** / **openstates-proxy** | Outreach and legislator lookup. |
| **classroom-provision-teacher** / **classroom-join-student** | Classroom teacher login and student join. |
| **mentors-provision** / **mentors-invite** / **mentors-join** | Mentor accounts and invite self-registration. |
| **web-analytics-summary** | Exec analytics. |

The frontend calls them via `supabase.functions.invoke('function-name', { body: { ... } })` or (for dashboard-view) a GET with the session JWT. Deploy aliases and JWT flags: [DEPLOYMENT.md](./DEPLOYMENT.md), [MENTOR_LOGIN.md](./MENTOR_LOGIN.md).

---

## 7\. Quick reference: page → file

| Page / area | HTML | Root id | Main component |
| :---- | :---- | :---- | :---- |
| Home | index.html | home-root | HomePage |
| Bills | bills.html | bills-root | BillsPage |
| Policy briefs (list) | policy-briefs.html | policy-briefs-root | BlogPage |
| Policy brief (post) | policy-brief.html | policy-brief-root | BlogPostPage |
| Directory | directory.html | directory-root | DirectoryPage |
| Our Story | our-story.html | our-story-root | OurStoryPage |
| Login | login.html | login-root | LoginPage |
| Dashboard | dashboard.html | dashboard-root | DashboardPage |
| Classroom join | classroom/join.html | classroom-join-root | ClassroomJoinPage |
| Classroom dashboard | classroom/dashboard.html | classroom-dashboard-root | ClassroomDashboardPage |
| Mentor join | mentor-join.html | mentor-join-root | MentorJoinPage |
| Bills preview (embedded) | (other) | bills-preview-root | BillsPreview |
| Bills stats (embedded) | (other) | bills-stats-root | BillsStats |

`blog.html` and `blog-post.html` are redirects to the policy-briefs URLs.

---

## 8\. Public-facing pages (what visitors see)

These pages are visible to everyone (no login required). A short overview of each and where the data comes from. You can add screenshots of each page in the Google Doc if that helps.

### Home (`index.html` → HomePage)

- **What visitors see:** Hero, about section, “Join Our Movement” (application form), schools carousel, partners carousel, team section (member photos/bios), impact map.  
- **Data:**   
  - **Application form** posts to `applications` (and optional resume to `applications-resumes` bucket);   
  - **SchoolsCarousel** loads from `schools` (active only);   
  - **PartnersCarousel** from `partners` (active only);   
  - **TeamSection** from `members` (for team display; names use **preferred public name** when set, otherwise legal first/middle/last).   
  - HomePage itself doesn’t call Supabase; the child components do.  
      
- **Where:** `src/pages/HomePage.jsx`, plus `src/components/ApplicationForm.jsx`, `SchoolsCarousel.jsx`, `PartnersCarousel.jsx`, `TeamSection.jsx`, `ImpactMap.jsx`.

### Bills (`bills.html` → BillsPage)

- **What visitors see:** List of legislation with filters (position, state), search, and for each bill a **card** (name, description, position, date, optional PDF viewer, optional LegiScan timeline, collaborator avatars). Public **Suggest a bill or issue** form (`?suggest=1`) writes `public_bill_recommendations`, not `bills`.  
- **Data:**   
  - **Bills** from `bills` — only `status = 'approved'` or `'modified'` and not hidden.   
  - **Collaborator avatars** from `members`.   
  - **PDFs** from the `proposals` storage bucket.  
- **Where:** `src/pages/BillsPage.jsx`, `PublicBillRecommendationForm`, `BillCard`, `PDFViewer`, `CollaboratorAvatars`, `Pagination`, `src/lib/legiscan.js`.

### Policy briefs (`policy-briefs.html` → BlogPage)

- **What visitors see:** Medium policy briefs in a list (featured post first, then paginated). Each post has a title, excerpt, author, link to full post.  
- **Data:** Posts come from **Medium via RSS**, not from our database. Author names are optionally matched to **members** so they can link to the Directory profile.  
- **Where:** `src/pages/BlogPage.jsx`, `BlogPostPage.jsx`, `BlogCard`. Nav label is Policy Briefs. `blog.html` redirects here.

### Our Story (`our-story.html` → OurStoryPage)

- **What visitors see:** Static content — SPAN’s origin, mission, and story (e.g. Texas HB 5294, coalition, pass/fail victory). No dynamic data.  
- **Data:** None from Supabase or APIs. Copy and layout only.  
- **Where:** `src/pages/OurStoryPage.jsx` and `OurStoryPage.css`.

### Directory (`directory.html` → DirectoryPage)

- **What visitors see:** Tabs for **Leadership** (execs, division / team leads, Board of Mentors from `advisors`) and the full **member directory**. Search, sort, pagination. Emailing someone goes through a Cloudflare Turnstile gate before `mailto:`.  
- **Data:** Active `members`; `advisors` / mentor people; team-lead rows. Photos from `members-images` (and advisor photos as configured).  
- **Where:** `src/pages/DirectoryPage.jsx`, `DirectoryEmailGateModal`, `AdvisorsBoard`.

### Classroom and mentor join

- **Classroom join / dashboard** (`classroom/join.html`, `classroom/dashboard.html`): teachers and students; class codes; assignments. Exec admin is a dashboard section, not these pages.  
- **Mentor join** (`mentor-join.html`): token-gated self-registration. See [MENTOR_LOGIN.md](./MENTOR_LOGIN.md).

---

Once this map is clear, the feature subtabs focus on what each feature does and where in these folders and files the logic lives.