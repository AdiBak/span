# SPAN Website - React Migration

## Overview

This repository has been migrated from vanilla JavaScript to React. All user-facing pages and components are now React-based, providing better maintainability, performance, and developer experience.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install React, Vite, and all required dependencies.

### 2. Development Server

Run the development server:

```bash
npm run dev
```

This will start Vite dev server on `http://localhost:3000`

### 3. Build for Production

To build for GitHub Pages:

```bash
npm run build
```

The built files will be in the `dist/` directory.

### 4. Preview Production Build

```bash
npm run preview
```


## New Features

### Bills Page Improvements

1. **PDF Viewer Integration**: Click "View Proposal" to see the PDF inline with scrollable pages
2. **Keyword Extraction**: PDFs are automatically scanned for keywords which are then searchable
3. **Collaborator Search**: Search bills by collaborator names
4. **Better Performance**: React's virtual DOM and optimized rendering
5. **Reusable Components**: Pagination and other components can be reused across pages

### Blog Page Improvements

1. **Medium RSS Integration in React**: Fetches posts via RSS → JSON API with proper loading and error states
2. **Featured + Paginated Layout**: Keeps the featured article on page 1 and paginates the remaining posts (5 per page)
3. **Author Detection**: Automatically links to SPAN member profiles when authors are recognized
4. **Writing Team Section**: Rendered via React with reusable data model for easy updates
5. **Shared Pagination Component**: Reuses the pagination component introduced for the Bills page

### Application System

1. **Native Application Form**: Replaced Google Forms with a native React form on the homepage
   - All fields from original Google Form (email, phone, name, age, grade, school, state, hours/week, referral source, additional info)
   - Form validation and error handling
   - Success message after submission
   - Scrollable form container
   - Single-column layout for better readability

2. **Application Management Dashboard** (Executive Directors only):
   - View all applications with filtering (All/Pending/Accepted/Rejected)
   - View application details in modal with all information
   - Accept/Reject applications with confirmation prompts
   - Add notes to applications
   - Delete applications (for accepted/rejected ones)
   - Status badges and clickable contact info

### Member Management System

1. **Member Creation** (Executive Directors only):
   - Create new members directly from dashboard
   - Form includes all member fields (name, email, original_email, role, tier, dates, location, school, contact info, bio, notes)
   - Automatically triggers member provisioning pipeline (creates auth user, sends email invitation, sets up Cloudflare email routing)
   - Uses database function (`create_member`) to bypass RLS restrictions

2. **Member Registration Form** (New Members):
   - Shows on first login if `registration_complete` is false
   - Pre-filled with existing member data from when they were added
   - Required fields: name, email, phone, DOB, school, city, state, profile photo
   - Optional fields: position, LinkedIn, Instagram, additional info
   - Profile photo upload to Supabase storage with validation
   - Phone number auto-formatting as user types
   - State abbreviation auto-uppercase conversion
   - Blocks access to dashboard until registration is complete
   - Automatically refreshes member data after successful registration

### Dashboard Improvements

1. **Redesigned "Your Info" Section**: 
   - Modern split-card layout with dark top section and light grid bottom
   - Icons and improved typography
   - Better visual hierarchy

2. **Bill Management** (Executive Directors):
   - Bills grouped by state in collapsible accordions
   - State flags/icons for visual organization
   - Nested accordions for individual bills
   - Edit and delete functionality for each bill

## Migration Status

### ✅ Completed React Migrations

**Pages:**
- ✅ Bills Page
- ✅ Blog Page
- ✅ Directory Page
- ✅ Our Story Page

**Components:**
- ✅ Navbar (global navigation with auth state)
- ✅ Footer (global footer)
- ✅ Schools Carousel (homepage)
- ✅ Team Section (homepage)
- ✅ Bills Preview (homepage)
- ✅ Bills Stats (homepage)
- ✅ Impact Map (homepage - Google Charts visualization)
- ✅ ApplicationForm (homepage - native application form)
- ✅ RegistrationForm (dashboard - member registration)

### Dashboard Migration

- ✅ Dashboard Page (`DashboardPage.jsx`) - Migrated to React
  - Volunteer hours tracking
  - Bill management (executive directors)
  - Application management (executive directors)
  - Member management (executive directors)
  - Member registration form (new members)
  - Password change
  - SPANCard generation

### Intentionally Vanilla JS

- Login Page (`auth.js`) - Admin/internal authentication

**Status:** All user-facing pages and components have been successfully migrated to React, including the dashboard.

## Important Notes

1. **GitHub Pages Deployment**: The build output needs to be deployed.

2. **Hybrid Approach**: The site uses a hybrid approach - all user-facing pages are React, while admin/internal pages (login, dashboard) remain vanilla JS for now.

3. **Environment Variables**: Supabase credentials are now managed via environment variables. See [README-ENV.md](./README-ENV.md) for setup instructions.

4. **PDF.js Worker**: The PDF viewer uses a worker for better performance. Make sure the worker file is accessible in production.

5. **Automated Member Provisioning**: Fully automated onboarding system is now live! When a member is added to the `members` table, the system automatically:
   - Creates a Supabase Auth user
   - Sets up Cloudflare email routing (SPAN email → personal email)
   - Sends a welcome email via EmailJS
   - Links the member's `user_id` to the Auth account
   
   See [docs/auth-provisioning.md](./docs/auth-provisioning.md) for complete setup and configuration details.

## Architecture

### React Components Structure

```
src/
├── components/          # Reusable React components
│   ├── ApplicationForm.jsx      # Native application form (homepage)
│   ├── BillCard.jsx
│   ├── BlogCard.jsx
│   ├── PDFViewer.jsx
│   ├── Pagination.jsx
│   ├── CollaboratorAvatars.jsx
│   ├── CollaboratorModal.jsx
│   ├── Footer.jsx
│   ├── Navbar.jsx
│   ├── RegistrationForm.jsx     # Member registration form (dashboard)
│   ├── SchoolsCarousel.jsx
│   ├── TeamSection.jsx
│   ├── BillsPreview.jsx
│   ├── BillsStats.jsx
│   └── ImpactMap.jsx
├── pages/               # Page components
│   ├── BillsPage.jsx
│   ├── BlogPage.jsx
│   ├── DashboardPage.jsx         # Dashboard with all management features
│   ├── DirectoryPage.jsx
│   ├── HomePage.jsx
│   ├── LoginPage.jsx
│   └── OurStoryPage.jsx
├── lib/                 # Utilities and services
│   └── supabase.js
├── App.jsx              # Thin router (selects page component)
└── main.jsx             # React entry point (mounts components)
```

### Component Mounting

React components are mounted to specific DOM elements in the HTML files:
- Pages mount to their respective root divs (`#bills-root`, `#blog-root`, etc.)
- Global components (Navbar, Footer) mount to their containers
- Homepage components mount to specific sections (`#schools-carousel-root`, `#impact-map-root`, etc.)

## Automated Member Provisioning

The system now includes a fully automated onboarding flow powered by a Supabase Edge Function:

- **Trigger**: Database webhook on `INSERT` to `public.members` table
- **Edge Function**: `supabase/functions/members-provision/index.ts`
- **Features**:
  - Automatic Supabase Auth user creation
  - Cloudflare Email Routing setup (forwards SPAN emails to personal inbox)
  - Welcome email delivery via EmailJS (with instructions to complete registration)
  - Graceful error handling and logging

**Setup**: See [docs/auth-provisioning.md](./docs/auth-provisioning.md) for deployment and configuration instructions.

## Database Functions and Policies

### Member Management Functions

1. **`create_member()`**: Allows executive directors to create new members
   - Verifies caller is an executive director
   - Bypasses RLS to insert member record
   - Triggers automated provisioning pipeline

2. **`update_member_registration()`**: Allows members to update their own registration
   - Verifies caller is updating their own record
   - Handles phone number type conversion (text to bigint)
   - Updates all registration fields including profile photo

### Storage Policies

- **`members-images` bucket policies**:
  - Authenticated users can upload/update/delete their own profile images
  - Files must be named with their `member_id` (e.g., `{member_id}.png`)
  - Public read access for displaying images on the website

### Application Table

- **`applications` table**: Stores membership applications
  - RLS policies: Anyone can submit, only exec directors can view/update/delete
  - Status tracking: pending, accepted, rejected
  - Review tracking: who reviewed and when

**Setup**: Run SQL migrations in `supabase/migrations/` directory in Supabase SQL Editor.

## Database Migrations

SQL migration files are located in `supabase/migrations/`:

1. **`create_applications_table.sql`**: Creates applications table with RLS policies
2. **`add_registration_complete_column.sql`**: Adds `registration_complete` boolean to members table
3. **`add_storage_policies_members_images.sql`**: Storage policies for profile image uploads
4. **`add_update_member_function.sql`**: Database function for member registration updates

**To apply migrations**: Run each SQL file in Supabase SQL Editor in order.

## Email Templates

### EmailJS Template Variables

- `{{to_name}}` - Member's full name
- `{{span_email}}` - The SPAN email address (for login)
- `{{action_link}}` - The Supabase invite/recovery link (to set password)
- `{{otp}}` - 6-digit code (for invite emails)
- `{{invite_type}}` - Either "invite" or "recovery"

**Template Content**: The email template instructs new members to:
1. Set their password using the action link
2. Complete their registration form in the dashboard
3. Access full dashboard features after registration

## Next Steps (Improvements)

1. **Auto-create members from applications**: When an application is accepted, automatically create a member record
2. **Email notifications**: Notify exec directors when new applications are submitted
3. **QR Login Enhancement**: Modernize QR login to use single-use tokens instead of passwords
4. **Testing**: Add unit and integration tests
5. **Performance**: Optimize bundle size and add lazy loading
6. **Error Handling**: Add React error boundaries
7. **Documentation**: Update API documentation and component docs

## Troubleshooting

### PDF Viewer Not Working
- Check that `pdfjs-dist` worker is properly loaded
- Verify CORS settings for PDF URLs
- Check browser console for errors

### Build Issues
- Make sure Node.js version is 18+
- Delete `node_modules` and `package-lock.json`, then reinstall
- Check Vite configuration

