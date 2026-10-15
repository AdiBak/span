# SPAN software work

I have been Lead Developer at SPAN ([spanationwide.org](https://spanationwide.org)) since October 2025. I work with the amazing team of executive directors, who've brainstormed many of the ideas which I've built into the software.

---

## Contents

- [0. Current product overview (2026)](#0-current-product-overview-2026)
- [1. Project overview and initial setup](#1-project-overview-and-initial-setup)
- [2. React migration and modernization](#2-react-migration-and-modernization)
- [3. Bills page enhancements](#3-bills-page-enhancements)
- [4. Blog page implementation](#4-blog-page-implementation)
- [5. Application management system](#5-application-management-system)
- [6. Member management system](#6-member-management-system)
- [7. Dashboard improvements](#7-dashboard-improvements)
- [8. HR reports system](#8-hr-reports-system)
- [9. Role-based permissions refactor](#9-role-based-permissions-refactor)
- [10. UI/UX improvements and bug fixes](#10-uiux-improvements-and-bug-fixes)
- [11. Database migrations and security](#11-database-migrations-and-security)
- [12. Technical infrastructure](#12-technical-infrastructure)
- [Key achievements](#key-achievements)
- [Technical metrics](#technical-metrics)
- [File structure](#file-structure)
- [Deployment status](#deployment-status)
- [Conclusion](#conclusion)

## 0. Current product overview (2026)

This section is the up-to-date feature rundown. Older sections below are
historical build notes; if anything conflicts, prefer this section.

**Organization:** Students for Patient Advocacy Nationwide (SPAN),
[spanationwide.org](https://spanationwide.org).

### Scale (production, October 2026)

- Members: 62 records (47 active, 15 inactive); 58 registration-complete; 61
  with Auth. Native applications: 57 (41 accepted, 12 rejected, remainder in
  pipeline). 40 members have bills permission. Members span 41 schools / 14
  states in profile data.
- Bills: 57 rows (53 approved, 2 modified, 2 outreach_only); 52 public
  (approved/modified and not hidden); 5 hidden; 55 with legiscan_link; 19
  distinct states. Bill assignments: 6. Policy teams: 6 (3 policy, 2
  marketing, 1 blog); 15 unique members on team rosters. Outreach targets:
  775 rows on 41 bills (almost all pending; 1 contacted).
- Volunteer hours: 32 approved entries, 111.5 hours, 10 distinct members.
- Schools / partners: 15 school rows (14 active), 8 partners (all active).
- Other ops: 24 leave/extension requests (18 approved, 6 declined); 11 HR
  reports (resolved or dismissed); 12 member suggestions.
- Classroom: 2 schools, 1 teacher, 1 class, 1 student, 2 assignments
  (pilot-scale; do not cite as adoption).

### Public site

- **Home (`index.html`):** about, impact map and bill stats, bills preview,
  partners, schools carousel, exec team, native application form (`#join`).
  Hero also links to Suggest a Bill (`bills.html?suggest=1`).
- **Bills (`bills.html`):** public catalog (see below) and public bill /
  issue suggestion form.
- **Directory (`directory.html`):** Leadership (execs, division / team leads,
  Board of Mentors from `advisors`) and full member directory. Search, sort,
  pagination. Emailing someone from the directory goes through a Cloudflare
  Turnstile gate before `mailto:`.
- **Policy briefs (`policy-briefs.html` / `policy-brief.html`):** Medium RSS
  list and post pages; author names can link to directory members.
- **Our Story (`our-story.html`).**
- **Login (`login.html`):** member login (SPAN email); mentor mode
  (`?mode=mentor`); Forgot Password; SPANCard QR scan to log in.
- **Classroom:** `classroom/join.html` (class code) and
  `classroom/dashboard.html` (teacher / student).
- **Mentor join (`mentor-join.html`):** token-gated self-registration
  (`?invite=…`).

### Dashboard and permissions

- Five flags on `members`: volunteer, applications, bills, registration, blog.
  Exec is the original four set true; blog is a fifth flag for Medium. Layout
  and section order follow those flags (see
  [DASHBOARD_FUNCTIONS.md](docs/DASHBOARD_FUNCTIONS.md)).
- Typical member sections: Your Info, Leave & Extension, Bill Submission (if
  bills), Volunteer Hours, Ideas & Suggestions, HR Reports, Change Password,
  Resign from SPAN.
- Execs additionally see Bill Management, Applications, Member Management,
  Schools / Partners / Mentors, Classroom admin, Analytics, Executive Conduct,
  Medium (if blog).
- **View-as:** execs can open `/dashboard.html?viewAs=<member_id>` (from
  Member Management). `view-member-dashboard` returns that member’s dashboard
  data read-only.
- Dashboard dark mode, section jump nav, preferred public name on the profile
  header, Download My SPANCard (password confirm), self-serve school / grade /
  location edits where enabled.

### Bills — public site (`BillsPage`)

- Public bills list with filters, search, pagination, collaborators, LegiScan
  links.
- Proposal viewing: PDF and/or Google Doc–style links as configured per bill.
- Optional “hidden” approved bills: live in admin/submitter views but not on
  the public list.
- Bill cards can show a LegiScan-derived status timeline (House/Senate rows
  when data allows).
- Public suggestion form (`?suggest=1`) feeds the exec Ideas & Suggestions
  queue as a public bill recommendation; it does not write into the internal
  bills table.

### Bills — dashboard (exec and bill members)

- Bill Management (execs) and Bill Submission (members with bills permission).
- Assigned work: execs create assignments for members who have bills access;
  assignees see “Assigned to me,” update status (e.g. in progress /
  completed), and submit deliverables (Google Doc link and PDF URL as required
  by the workflow).
- Open pool: members can claim unassigned tasks from a shared pool where
  enabled.
- After exec approval, publishing copies an assignment onto the public bills
  side with prefilled fields (PDF upload still required where applicable). US
  state values are normalized.
- Research (SPAN): browse internal proposal corpus with filters (state,
  number, keywords, status), expand for detail, doc/PDF preview,
  collaborators. `get_bills_research()` omits review notes.
- Research (Legislature): search LegiScan bills; detail includes metadata,
  sponsors, history, and readable bill text when available.
- Compare: side-by-side SPAN proposal + LegiScan bill in one view.
- Outreach (exec): legislator/outreach tracking on approved bills
  (`bill_outreach_targets`, refresh from LegiScan sponsors, status updates).
  Contact modal can send outreach email (proposal PDF attached) via
  `outreach-send-email`; mentors can preview but not send via SPAN email.

### Policy teams

- `policy_teams` / `member_policy_teams` / `policy_team_leads`; team kinds
  include policy, marketing, blog, general. See
  [MIGRATION_POLICY_TEAMS.md](docs/MIGRATION_POLICY_TEAMS.md).
- Exec Member Management: create teams, co-leads, roster.
- Team leads: RLS-scoped leave queue for their team and **Team — Assigned
  work** (assign/track; publishing to the public site stays with execs).

### Applications

- Native application form on the homepage join section (anonymous submit;
  own Supabase client with `persistSession: false`). Required fields include
  age.
- Referral source; if “friend/classmate,” optional structured field for the
  friend’s name (stored on the application row).
- Pipeline statuses: pending, invited, met_with, onboard, accepted, rejected;
  internal numeric review score optional.
- Interview invitation: moving to Invited uses send-invitation-email (Resend),
  with an in-app preview (`dry_run`) before send; from/cc configurable via
  Supabase secrets.
- Onboarding scheduling: moving to Onboard uses
  send-onboarding-schedule-email — congrats message and request for ~two weeks
  of availability to schedule the onboarding call (detailed welcome is
  intended for the live call).
- Rejection flow can send email via send-rejection-email; met_with date
  captured in UI.
- Import from application into Add Member prefills member fields.
- AI screening: ScreenComply (overall score and per-detector explanations) on
  application “additional info” and proposals, with a RoBERTa TMR fallback if
  that service is down. Advisory for reviewers; does not auto-reject.
  `check-ai-text` Edge Function.

### Ideas & suggestions

- Members submit bill ideas, general interest, or web/feature suggestions
  (`member_suggestions`). Execs see all, default filter Pending, set status
  (pending / under review / approved / declined) and leave review notes.
- Public bill suggestions from the Bills page show up in the same exec queue
  (source filter: public vs internal).

### Volunteer hours

- Members submit hours; volunteer-permission users can approve/deny and
  comment (not on their own entries).
- Database stores reviewed_by and reviewed_at; UI shows “Reviewed by” + date
  (view-as enriches reviewer names via view-member-dashboard).
- Execs can generate a verification PDF (`generateVolunteerPDF.js`) and email
  it via send-volunteer-verification.

### Members and Auth

- Member create/update via dashboard; `create_member` inserts the row, then
  members-provision creates/finds Auth, Cloudflare forward
  (`firstname.lastname@spanationwide.org`), and Resend welcome mail. Retry
  does not mint a second Auth user if one already exists.
- Member Management: Resend welcome, or Create login & welcome if Auth never
  attached.
- Optional `middle_name` and `preferred_name`; public display uses preferred
  name when present.
- Registration form on first login until `registration_complete`; start_date
  can be set when registration completes.
- Login identity is `members.email` (@spanationwide.org). `original_email` is
  personal/contact only (welcome + password-reset delivery).
- Forgot Password: LoginPage POSTs to `/functions/v1/hyper-endpoint` (source
  folder password-reset/). Resolves members by SPAN or personal email;
  prefers Auth user for SPAN email; may create/link Auth if missing; sets
  alphanumeric temp password; emails via Resend with the SPAN login address
  in the body. Details: docs/FIRST_LOGIN_AND_REGISTRATION.md §1b and
  docs/DEPLOYMENT.md.
- Change Password on the dashboard. Registration permission sees Member
  Management (active/inactive list, add/edit). Only execs edit permission
  flags.

### Mentors

- Mentors are not `members` rows. Profiles live in `advisors` (public
  Leadership / Board of Mentors). Login accounts in `mentor_accounts`.
  [MENTOR_LOGIN.md](docs/MENTOR_LOGIN.md).
- Preferred path: exec copies an invite link from Schools, Partners & Mentors;
  mentor submits on `mentor-join.html`; system creates advisor + Auth +
  temporary password email. Manual Add Mentor + Provision login still works.
- Login at `/login.html?mode=mentor` (username or registered email).
  Dashboard: research, outreach, change password. SPAN outreach send is
  disabled for mentors.

### Schools, partners, advisors

- Exec **Schools, Partners & Mentors** section: add/edit schools, partners,
  and Board of Mentors (advisors), including photos. These feed the homepage
  carousels/sections and the directory Leadership tab.

### HR reports and executive conduct

- Members submit HR reports and see their own. Execs see all reports except
  those where they are the `regarding_member_id`. Status updates and review
  notes in the view modal.
- **Executive Conduct:** strike log (from an HR report or manual), removal
  proposals, resignation queue. Directory deactivation (`active = false`)
  after confirmed exit.
- Letters via `send-member-letter-email`: honorable-exit, removal notice,
  policy-violation notice (after a strike is on record; execs CC’d).
  `notify-hr-report` on new reports.

### Leave, calendar

- Leave/break and project-extension requests (`member_requests`); members
  submit their own; execs approve/decline with comments. Team leads see their
  team’s leave queue (RLS-scoped).
- Unified calendar in the Leave section: birthdays, SPAN events, team-lead
  deadlines (`dashboard_calendar_events`).

### Resign from SPAN

- Members can submit a resignation, see status, and withdraw before a letter
  is sent. `notify-resignation-request` notifies directors. Execs manage the
  queue in Executive Conduct.

### Classroom (SPAN Classroom)

- Pilot. Exec dashboard Classroom section: schools, teachers, provision
  teacher login (`classroom-provision-teacher`).
- Teachers scoped to their school/classes; students join with a class code
  (`classroom-join-student`) and only see their own work.
- Assignments: materials/file uploads, due dates, grading, class feature
  flags. Classroom LegiScan search and student policy toolkit. Bill text is
  fetched and stored rather than re-requested on every load.

### Analytics

- Exec Analytics section: site page-view summary via
  `web-analytics-summary` (date range, totals, series).

### Medium / blog

- `blog` permission gates a Medium OTP section on the dashboard;
  `medium-otp-arm` Edge Function and optional Google Apps Script for
  forwarding login codes to the member’s SPAN email.
- Public policy-briefs pages read the Medium RSS feed.

### Security / perf (recent)

- Public site reads increasingly routed through safe RPCs; hardened public
  RLS.
- Bundle/perf work: dashboard JS cuts, WebP, public-data caching, a11y
  passes; Our Story and related page splits to reduce bloat.

### Edge Functions

- members-provision
- password-reset (deploy as **hyper-endpoint**)
- dashboard-view (deploy as **view-member-dashboard**)
- send-invitation-email, send-onboarding-schedule-email, send-rejection-email
- send-volunteer-verification
- send-member-letter-email (honorable exit, removal, policy notice)
- notify-new-application, notify-hr-report, notify-resignation-request
- check-ai-text
- medium-otp-arm
- fetch-legiscan-person-contact, outreach-send-email, openstates-proxy
- classroom-provision-teacher, classroom-join-student
- mentors-provision, mentors-invite, mentors-join
- web-analytics-summary

### Database

- All schema/RLS changes live under `supabase/migrations/`. Includes
  volunteers reviewed_by/reviewed_at; applications referral_friend_name;
  bill assignment and outreach tables; policy teams; member_suggestions;
  member_strikes / resignation / removal; dashboard_calendar_events;
  classroom tables; mentor_accounts / mentor_join_invites; public-read RPC
  hardening. Run migrations on Supabase before relying on new columns.

### Documentation in repo

- docs/README.md — index of all guides; docs/README-REACT.md,
  docs/README-ENV.md, docs/DEPLOYMENT.md.
- docs/SETUP.md, docs/DEVELOPMENT.md, docs/DATABASE_ARCHITECTURE.md,
  docs/CODEBASE_ARCHITECTURE.md, docs/DASHBOARD_FUNCTIONS.md,
  docs/APPLYING_AND_APPLICATION_REVIEW.md, docs/DOCS_CHANGELOG.md,
  docs/COPILOT_CONTEXT.md, docs/FIRST_LOGIN_AND_REGISTRATION.md (incl.
  Forgot Password), docs/ADDING_A_NEW_MEMBER.md,
  docs/BILLS_EXEC_SUITE_SPEC.md, docs/MIGRATION_POLICY_TEAMS.md,
  docs/MENTOR_LOGIN.md, docs/leave-and-extension-requests.md.
- docs/VOLORA_INTEGRATION.md is a design note only (not implemented).
- docs/email-templates/ — reference HTML only; production email bodies live
  in Edge Functions.
- This file (`WORK_SUMMARY.md`): current feature snapshot (section 0) and
  historical build notes.

## 1. Project overview and initial setup

**Project:** SPAN Website Redesign & Feature Development
### Technology stack

- Frontend: React (Vite), HTML, CSS, JavaScript
- Backend: Supabase (PostgreSQL, Authentication, Storage)
- Deployment: GitHub Pages
- Build Tool: Vite

### Initial state

- Legacy vanilla JavaScript website
- Basic bills tracking functionality
- Manual member management
- Google Forms for applications
- Limited dashboard functionality

## 2. React migration and modernization

**Objective:** Modernize the codebase by migrating from vanilla JavaScript to React
for better maintainability, performance, and developer experience.

**Completed work:**

#### 2.1 React Project Setup

- Created Vite-based React project structure
- Configured build system for GitHub Pages deployment
- Set up component architecture for code reusability
- Implemented lazy loading for performance optimization
- Created proper routing system with App.jsx

#### 2.2 Pages Migrated to React

- ✅ Bills Page (BillsPage.jsx)
- ✅ Blog Page (BlogPage.jsx)
- ✅ Directory Page (DirectoryPage.jsx)
- ✅ Our Story Page (OurStoryPage.jsx)
- ✅ Home Page (HomePage.jsx)
- ✅ Login Page (LoginPage.jsx)
- ✅ Dashboard Page (DashboardPage.jsx)

#### 2.3 Component Architecture

Created reusable components:
- BillCard.jsx - Individual bill display card
- BlogCard.jsx - Blog post cards with featured article support
- PDFViewer.jsx - Inline PDF viewer with text extraction
- Pagination.jsx - Reusable pagination component
- CollaboratorAvatars.jsx - Member avatar display
- CollaboratorModal.jsx - Collaborator details modal
- ApplicationForm.jsx - Native application form
- RegistrationForm.jsx - Member registration form
- Footer.jsx - Site footer component
- Navbar.jsx - Navigation bar component
- ImpactMap.jsx - Interactive state map
- SchoolsCarousel.jsx - School carousel display
- TeamSection.jsx - Team member display
- BillsPreview.jsx - Bills preview component
- BillsStats.jsx - Bills statistics component

#### 2.4 Build Configuration

- Configured Vite for production builds
- Set up proper asset handling
- Implemented code splitting
- Created development and production environments

## 3. Bills page enhancements

**Objective:** Improve bills tracking functionality with better UX and new features.

**Completed work:**

#### 3.1 Core Functionality Maintained

- Filtering by position (Support, Oppose, Monitor, etc.)
- Search functionality across bill names, states, descriptions
- Pagination (6 bills per page - optimized from 9)
- Collaborator avatars and details
- State flag display
- LegiScan links integration

#### 3.2 New Features Added

##### 3.2.1 PDF Viewer Integration

- Integrated inline PDF viewer using react-pdf library
- Users can click "View Proposal" to see PDFs without leaving the page
- Full-page navigation controls (previous/next page)
- Download button for PDFs
- Loading states and error handling
- Supports both old (URL-encoded) and new (sanitized) file naming formats

##### 3.2.2 Keyword Extraction System

- Automatic PDF text extraction from all pages
- Identifies top 10 most frequent meaningful words
- Keywords are searchable in the search bar
- Improves discoverability of bills by content
- Keywords cached per bill for performance

##### 3.2.3 Collaborator Search

- Enhanced search to include collaborator names
- Clickable collaborator avatars
- Modal showing collaborator details and contact info

##### 3.2.4 Bill Management (Executive Directors)

- Edit bills directly from bills page
- Delete bills with confirmation
- Update bill details, PDFs, and collaborators
- State-organized bill display in dashboard

#### 3.3 UI/UX Improvements

- Equal vertical and horizontal spacing between bill cards
- Responsive filter buttons redesigned for mobile
- Removed "Oppose Unless Amended" position option
- Standardized state icon sizes
- Improved card layout and typography
- Better mobile responsiveness

#### 3.4 Data Improvements

- Bills grouped by state in collapsible accordions (dashboard)
- State flags/icons for visual organization
- Nested accordions for individual bills
- Federal legislation (United States) excluded from "states targeted" stat

## 4. Blog page implementation

**Objective:** Replace external blog integration with native React implementation.

**Completed work:**

#### 4.1 Medium RSS Integration

- Fetches blog posts via RSS → JSON API
- Proper loading and error states
- Placeholder imagery for posts without images
- Error handling for failed API calls

#### 4.2 Layout Features

- Featured article prominently displayed on page 1
- Paginated layout (5 posts per page)
- Reuses Pagination component from Bills page
- Clean, modern card-based design

#### 4.3 Author Integration

- Automatically links recognized authors to SPAN directory profiles
- Author badges with profile links
- Writing team section rendered via React

#### 4.4 Code Quality

- Shared pagination component
- Reusable data model for easy updates
- Proper error boundaries

## 5. Application management system

**Objective:** Replace Google Forms with native application system and provide
executive directors with application review capabilities.

**Completed work:**

#### 5.1 Native Application Form

- Replaced Google Forms with React form on homepage
- All original fields maintained:
  - Email, phone, name
  - Grade, school, state
  - Hours/week availability
  - Referral source
  - Additional information (later changed to essay prompt)
- Form validation and error handling
- Success message after submission
- Scrollable form container
- Single-column layout for better readability

#### 5.2 Application Form Updates

- Removed "Age" question (redundant with grade)
- Changed "Is there anything else..." to essay prompt:
  "Tell us about any experience you have in policy, healthcare, advocacy, or 
   related areas. Why are you interested in joining SPAN, and how do you see 
   yourself contributing to our mission? Feel free to include any skills, 
   strengths, or additional information that would help us get to know you 
   better."

#### 5.3 Application Management Dashboard

- View all applications with filtering:
  - All applications
  - Pending applications
  - Accepted applications
  - Rejected applications
- View application details in modal with all information
- Accept/Reject applications with confirmation prompts
- Add notes to applications
- Delete applications (for accepted/rejected ones)
- Status badges for visual clarity
- Clickable contact info (email, phone)

#### 5.4 Database & Security

- Created applications table in Supabase
- Row Level Security (RLS) policies:
  - Anonymous users can submit applications
  - Only members with "applications" permission can view
  - Only members with "applications" permission can update/delete
- Migration: allow_anonymous_application_inserts.sql

#### 5.5 Import Feature

- "Import from Application" button in member creation modal
- Opens modal showing all applications in a list
- Selecting an application prefills member form with:
  - Name, personal email, phone
  - School, state, grade
  - Other available fields
- SPAN email auto-generated from name

## 6. Member management system

**Objective:** Create comprehensive member management system with automated user
provisioning and registration workflow.

**Completed work:**

#### 6.1 Member Creation System

- Create new members directly from dashboard (executive directors only)
- Form includes all member fields:
  - Basic info: name, email, original_email, role
  - Dates: start date, date of birth
  - Location: city, state, school
  - Contact: phone, LinkedIn, Instagram
  - Additional: bio, notes
  - Permissions: volunteer, applications, bills, registration (checkboxes)
  - Active status: active/inactive member toggle
- Automatically triggers member provisioning pipeline:
  - Creates auth user in Supabase
  - Generates temporary password
  - Sends email invitation via Edge Function
  - Sets up Cloudflare email routing
  - Links user_id in members table

#### 6.2 Member Registration Form

- Shows on first login if registration_complete is false
- Pre-filled with existing member data from when they were added
- Required fields:
  - Name, email, phone
  - Date of birth
  - School, city, state
  - Profile photo upload
- Optional fields:
  - Position/role
  - LinkedIn, Instagram
  - Additional info
- Features:
  - Profile photo upload to Supabase storage with validation
  - Phone number auto-formatting as user types
  - State abbreviation auto-uppercase conversion
  - Blocks access to dashboard until registration is complete
  - Automatically refreshes member data after successful registration

#### 6.3 Member Management Interface

- Renamed "New Member Registration" to "Member Management"
- Table view showing all members
- Split into Active/Inactive sections (2-column layout)
- Scrollable sections to prevent excessive page length
- Quick action buttons for each member:
  - Edit member info and roles
  - Email member (mailto: link)
  - Text member (sms: link)
- Edit member functionality:
  - Load existing member data into form
  - Update any field including roles
  - Change active/inactive status
  - Update profile photo

#### 6.4 SPAN Email Auto-Generation

- Format: firstname.lastname@spanationwide.org
- Auto-generates when adding member
- Updates as name is typed (unless manually edited)
- Uses first letter of last name if last name exists

#### 6.5 Database Functions

- create_member function: Handles member creation with auth user provisioning
- update_member function: Handles member updates including roles
- Edge Function: members-provision/index.ts
  - Creates Supabase auth user
  - Generates secure temporary password
  - Sends welcome email with credentials
  - Handles Cloudflare email routing setup

## 7. Dashboard improvements

**Objective:** Enhance dashboard functionality and user experience for all members
and executive directors.

**Completed work:**

#### 7.1 "Your Info" Section Redesign

- Modern split-card layout
- Dark top section with key information
- Light grid bottom section with details
- Icons and improved typography
- Better visual hierarchy

#### 7.2 Volunteer Hours Management

- Submit volunteer hours with two input modes:
  - DateTime mode: start time, end time, date
  - Hours mode: direct hours input, date
- View all volunteer entries
- Executive directors can:
  - View all members' volunteer entries
  - Approve/reject entries
  - Add comments to entries
  - Delete entries

#### 7.3 Bill Management (Executive Directors)

- Bills grouped by state in collapsible accordions
- State flags/icons for visual organization
- Nested accordions for individual bills
- Edit and delete functionality for each bill
- Upload/update PDF proposals
- Manage collaborators

#### 7.4 Application Management

- See all applications
- Filter by status (All/Pending/Accepted/Rejected)
- View application details in modal
- Accept/Reject applications
- Add notes to applications
- Delete applications

#### 7.5 Member Management

- See all members in table format
- Split Active/Inactive views
- Quick actions (Edit, Email, Text)
- Create new members
- Edit existing members
- Import from applications

#### 7.6 Password Management

- Change password functionality
- Moved to bottom of dashboard (as requested)

#### 7.7 Permission-Based Access

- Dashboard sections show/hide based on user permissions
- Volunteer section: requires "volunteer" permission
- Applications section: requires "applications" permission
- Bills section: requires "bills" permission
- Member Management: requires "registration" permission
- HR Reports: visible to all members, status updates require all permissions

## 8. HR reports system

**Objective:** Create HR complaint reporting system for members to report issues
while protecting executive directors from viewing reports about themselves.

**Completed work:**

#### 8.1 HR Report Submission

- Form available to all members in dashboard
- Fields:
  - Nature of complaint (text)
  - Who it is regarding (text)
  - When it happened (date)
  - Additional details (text)
- All members (including execs) can submit reports

#### 8.2 HR Report Viewing

- Executive directors can view all reports EXCEPT those about themselves
- Filter by status:
  - All reports
  - Pending
  - Reviewed
  - Resolved
  - Dismissed
- View report details in modal
- Status badges for visual clarity

#### 8.3 HR Report Status Management

- Only executive directors (all 4 permissions) can update status
- Status options:
  - Pending (default)
  - Reviewed
  - Resolved
  - Dismissed
- Status update buttons in modal
- Real-time status updates in UI

#### 8.4 Database Implementation

- Created hr_reports table with fields:
  - report_id (primary key)
  - user_id (foreign key to auth.users)
  - nature_of_complaint (text)
  - regarding (text)
  - when_happened (date)
  - additional_details (text)
  - status (enum: pending, reviewed, resolved, dismissed)
  - created_at, updated_at (timestamps)

#### 8.5 Security Policies

- Members can submit their own reports
- Members can view their own reports
- Executive directors can view all reports EXCEPT those about themselves
- Only executive directors (all 4 permissions) can update report status
- Migration: create_hr_reports_table.sql
- Migration: add_hr_reports_update_policy.sql

## 9. Role-based permissions refactor

**Objective:** Replace tiering system and is_executive_director field with granular
role-based permission system.

**Completed work:**

#### 9.1 Database Schema Changes

- Removed columns:
  - is_executive_director (boolean)
  - tier (text)
- Added columns:
  - volunteer (boolean) - access to volunteer hours management
  - applications (boolean) - access to application review
  - bills (boolean) - access to bill management
  - registration (boolean) - access to member management
- Migrated existing executive directors to have all 4 roles = true

#### 9.2 Permission System Logic

- Executive Director = member with ALL 4 permissions
- Granular permissions allow specific access:
  - volunteer: manage and approve volunteer hours
  - applications: review new member applications
  - bills: create, edit, delete bills
  - registration: manage members (create, edit, view all)

#### 9.3 Frontend Updates

- Created hasPermission() helper function (later renamed to 
  hasExecutiveDirectorPermissions())
- Replaced all is_executive_director checks with role-based permission checks
- Updated dashboard sections to check specific permissions
- Updated BillCard component to check bills permission
- Member management modal shows permission checkboxes

#### 9.4 Row Level Security (RLS) Updates

- Updated all RLS policies to use new permission columns
- Policies updated for:
  - volunteers table
  - bills table
  - applications table
  - storage.objects (proposals)
  - hr_reports table
- Migration: add_role_based_permissions.sql

#### 9.5 Member Management UI

- Permission checkboxes in member creation/edit modal
- Members cannot change their own permissions (UI enforced)
- Visual indication of member permissions in management table

## 10. UI/UX improvements and bug fixes

**Completed work:**

#### 10.1 Homepage Improvements

- "Our Impact" section: Clicking U.S. region opens bills for United States
- Header text color: Changed to beige color used in navbar
- Application form improvements (see section 5.2)

#### 10.2 Bills Page Improvements

- Equal vertical and horizontal spacing between bill cards
- Filter buttons redesigned for mobile (better responsive design)
- Removed "Oppose Unless Amended" position option
- Standardized state icon sizes
- Changed bills per page from 9 to 6
- Federal legislation excluded from "states targeted" stat

#### 10.3 Dashboard Improvements

- "Your Info" section redesigned (see section 7.1)
- Password change moved to bottom
- Active/Inactive member views in 2 columns
- Scrollable member sections
- Import from application button positioning fixed

#### 10.4 Bug Fixes

- Fixed SPAN email not updating as name is typed
- Fixed duplicate variable declaration (emailManuallyEdited)
- Fixed HR report status not updating in UI
- Fixed status dropdown buttons not working (replaced with individual buttons)
- Fixed RLS policy conflicts when dropping columns
- Fixed member dashboard not showing sections based on permissions
- Fixed console errors and warnings

#### 10.5 Mobile Responsiveness

- Improved filter button layout on mobile
- Better card stacking on smaller screens
- Responsive table layouts
- Touch-friendly button sizes

## 11. Database migrations and security

**Completed work:**

#### 11.1 Migrations Created

##### 11.1.1 add_role_based_permissions.sql

- Adds volunteer, applications, bills, registration columns
- Migrates existing exec directors
- Removes is_executive_director and tier columns
- Updates create_member function
- Creates update_member function
- Updates all RLS policies to use new permissions

##### 11.1.2 allow_anonymous_application_inserts.sql

- Enables RLS on applications table
- Allows anonymous users to insert applications
- Allows anonymous users to select their own applications

##### 11.1.3 create_hr_reports_table.sql

- Creates hr_reports table
- Sets up RLS policies:
  - Members can submit reports
  - Members can view their own reports
  - Executive directors can view all reports (except about themselves)

##### 11.1.4 add_hr_reports_update_policy.sql

- Creates UPDATE policy for hr_reports
- Only executive directors (all 4 permissions) can update status
- Includes DROP POLICY IF EXISTS for safe re-runs

#### 11.2 Security Enhancements

- Row Level Security (RLS) enabled on all sensitive tables
- Permission-based access control
- Executive directors protected from viewing HR reports about themselves
- Anonymous application submissions secured
- Member data protected by user_id checks

#### 11.3 Database Functions

- create_member: Handles member creation with auth provisioning
- update_member: Handles member updates
- Both functions bypass RLS for admin operations

## 12. Technical infrastructure

**Completed work:**

#### 12.1 Supabase Integration

- Supabase client setup (src/lib/supabase.js)
- Authentication system
- Database queries and mutations
- Storage integration for:
  - Member profile photos
  - Bill PDF proposals
- Edge Functions for member provisioning

#### 12.2 Build & Deployment

- Vite build configuration
- GitHub Pages deployment setup
- Production build optimization
- Asset handling and routing

#### 12.3 Code Organization

- Component-based architecture
- Reusable utility functions
- Shared constants and configurations
- Proper separation of concerns

#### 12.4 Performance Optimizations

- Lazy loading of components
- Code splitting by route
- Optimized database queries
- Efficient state management

#### 12.5 Error Handling

- Try-catch blocks for async operations
- User-friendly error messages
- Loading states for async operations
- Error boundaries (where applicable)

## Key achievements

1. ✅ Complete React migration of all user-facing pages
2. ✅ Native application system replacing Google Forms (pipeline, emails, onboarding scheduling)
3. ✅ Comprehensive member management with automated provisioning
4. ✅ Role-based permissions (volunteer, applications, bills, registration, blog)
5. ✅ HR reports system with proper security
6. ✅ Bills: public page + exec suite (assignments, pool, research, compare, outreach, publish flow)
7. ✅ Modern blog integration with Medium RSS; Medium OTP path for blog editors
8. ✅ Improved dashboard with permission-based access and view-as exec
9. ✅ Volunteer hours with reviewer attribution
10. ✅ Secure database policies and migrations

## Technical metrics

(Approximate — see git history and supabase/migrations for ground truth.)

- Pages Migrated to React: 7+
- Components: many (pages + shared components under src/components)
- Database migrations: full set under supabase/migrations/
- Edge Functions: multiple (members-provision, email flows, dashboard-view, etc.)
- RLS: per-table policies in migrations

## File structure

```
src/
├── components/          # Reusable React components
├── pages/              # Page components
├── lib/                # Utilities (Supabase client)
├── App.jsx             # Router
└── main.jsx            # Entry point

supabase/
├── migrations/         # Database migration files
└── functions/          # Edge Functions

assets/                 # Static assets (CSS, images, scripts)
```

## Deployment status

- All changes committed to git
- Production builds tested
- Database migrations run in Supabase
- Features deployed and functional
- Security policies in place

## Conclusion

This document represents a comprehensive transformation of the SPAN website from
a basic vanilla JavaScript site to a modern, feature-rich React application with:

- Complete member lifecycle management
- Automated user provisioning
- Role-based access control
- Application review system
- HR reporting system
- Enhanced bills tracking
- Modern UI/UX
- Secure database policies
- Mobile-responsive design

All work has been completed, tested, and deployed. The codebase is now more
maintainable, scalable, and user-friendly.

