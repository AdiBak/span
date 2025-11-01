import {
    createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://qujzohvrbfsouakzocps.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1anpvaHZyYmZzb3Vha3pvY3BzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzNjQ2NzUsImV4cCI6MjA2OTk0MDY3NX0.Yl-vCGhkx4V_3HARGp2bwR-auSuZksP_77xgUoJop1k";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================
// bills.js
// ==================
// NOTE: Bills functionality has been migrated to React
// - Full bills page: src/pages/BillsPage.jsx
// - Homepage preview: src/components/BillsPreview.jsx
// - Stats updater: src/components/BillsStats.jsx
// This code block has been removed - the React versions handle all bills rendering

// ==================
// blog.js
// ==================
// NOTE: Blog functionality has been migrated to React (src/pages/BlogPage.jsx)
// This code block has been removed - the React version handles all blog rendering


// ==================
// directory.js
// ==================
// NOTE: Directory functionality has been migrated to React (src/pages/DirectoryPage.jsx)
// This code block has been removed - the React version handles all directory rendering

// ==================
// navbar.js
// ==================
// NOTE: Navbar functionality has been migrated to React (src/components/Navbar.jsx)
// This code block has been removed - the React version handles all navbar rendering with auth state management


// ==================
// footer.js
// ==================
// NOTE: Footer functionality has been migrated to React (src/components/Footer.jsx)
// This code block has been removed - the React version handles all footer rendering
// ==================
// map.js
// ==================
// NOTE: Map visualization has been migrated to React (src/components/ImpactMap.jsx)
// This code block has been removed - the React version handles all map rendering with Google Charts

// ==================
// schools.js
// ==================
// NOTE: Schools carousel functionality has been migrated to React (src/components/SchoolsCarousel.jsx)
// This code block has been removed - the React version handles all school carousel rendering

// ==================
// team.js
// ==================
// NOTE: Team section functionality has been migrated to React (src/components/TeamSection.jsx)
// This code block has been removed - the React version handles all team section rendering