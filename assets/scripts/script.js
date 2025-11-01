/**
 * SPAN Website - Legacy Script File
 * 
 * This file exports the Supabase client for use by vanilla JS pages
 * (login.html, dashboard.html). All user-facing functionality has been migrated to React.
 * 
 * React components use their own Supabase client from src/lib/supabase.js
 * 
 * Environment variables: This file reads from window.__ENV__ which is injected by Vite
 * during development and build. See vite.config.js for configuration.
 */

import {
    createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Read from injected environment or use fallback values
// Vite injects window.__ENV__ during build/dev (see vite.config.js)
const SUPABASE_URL = (typeof window !== 'undefined' && window.__ENV__?.VITE_SUPABASE_URL) || 
                     import.meta.env?.VITE_SUPABASE_URL ||
                     "https://qujzohvrbfsouakzocps.supabase.co";

const SUPABASE_ANON_KEY = (typeof window !== 'undefined' && window.__ENV__?.VITE_SUPABASE_ANON_KEY) || 
                          import.meta.env?.VITE_SUPABASE_ANON_KEY ||
                          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1anpvaHZyYmZzb3Vha3pvY3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNjQ2NzUsImV4cCI6MjA2OTk0MDY3NX0.Yl-vCGhkx4V_3HARGp2bwR-auSuZksP_77xgUoJop1k";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Migration Notes:
 * 
 * All user-facing functionality has been migrated to React:
 * - Bills: src/pages/BillsPage.jsx, src/components/BillsPreview.jsx, src/components/BillsStats.jsx
 * - Blog: src/pages/BlogPage.jsx
 * - Directory: src/pages/DirectoryPage.jsx
 * - Our Story: src/pages/OurStoryPage.jsx
 * - Navbar: src/components/Navbar.jsx
 * - Footer: src/components/Footer.jsx
 * - Map: src/components/ImpactMap.jsx
 * - Schools Carousel: src/components/SchoolsCarousel.jsx
 * - Team Section: src/components/TeamSection.jsx
 * 
 * This file is kept for backwards compatibility with admin pages (login, dashboard)
 * which still use vanilla JavaScript.
 */