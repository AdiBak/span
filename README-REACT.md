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

1. **PDF Viewer Integration**: Click "View Proposal" to see the PDF inline
2. **Keyword Extraction**: PDFs are automatically scanned for keywords which are then searchable
3. **Better Performance**: React's virtual DOM and optimized rendering
4. **Reusable Components**: Pagination and other components can be reused across pages

### Blog Page Improvements

1. **Medium RSS Integration in React**: Fetches posts via RSS → JSON API with proper loading and error states
2. **Featured + Paginated Layout**: Keeps the featured article on page 1 and paginates the remaining posts (5 per page)
3. **Author Detection**: Automatically links to SPAN member profiles when authors are recognized
4. **Writing Team Section**: Rendered via React with reusable data model for easy updates
5. **Shared Pagination Component**: Reuses the pagination component introduced for the Bills page

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

### Intentionally Vanilla JS

- Login Page (`auth.js`) - Admin/internal authentication
- Dashboard (`dashboard.js`) - Admin dashboard functionality

**Status:** All user-facing pages and components have been successfully migrated to React.

## Important Notes

1. **GitHub Pages Deployment**: The build output needs to be deployed.

2. **Hybrid Approach**: The site uses a hybrid approach - all user-facing pages are React, while admin/internal pages (login, dashboard) remain vanilla JS for now.

3. **Environment Variables**: Supabase credentials are now managed via environment variables. See [README-ENV.md](./README-ENV.md) for setup instructions.

4. **PDF.js Worker**: The PDF viewer uses a worker for better performance. Make sure the worker file is accessible in production.

## Architecture

### React Components Structure

```
src/
├── components/          # Reusable React components
│   ├── BillCard.jsx
│   ├── BlogCard.jsx
│   ├── PDFViewer.jsx
│   ├── Pagination.jsx
│   ├── CollaboratorAvatars.jsx
│   ├── CollaboratorModal.jsx
│   ├── Footer.jsx
│   ├── Navbar.jsx
│   ├── SchoolsCarousel.jsx
│   ├── TeamSection.jsx
│   ├── BillsPreview.jsx
│   ├── BillsStats.jsx
│   └── ImpactMap.jsx
├── pages/               # Page components
│   ├── BillsPage.jsx
│   ├── BlogPage.jsx
│   ├── DirectoryPage.jsx
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

## Next Steps (Improvements)

1. **Security**: Enhance DB security and make .env file
2. **Auth**: Improve user auth process
3. **Testing**: Add unit and integration tests
4. **Performance**: Optimize bundle size and add lazy loading
5. **Error Handling**: Add React error boundaries
6. **Documentation**: Update documentation and component docs

## Troubleshooting

### PDF Viewer Not Working
- Check that `pdfjs-dist` worker is properly loaded
- Verify CORS settings for PDF URLs
- Check browser console for errors

### Build Issues
- Make sure Node.js version is 18+
- Delete `node_modules` and `package-lock.json`, then reinstall
- Check Vite configuration

