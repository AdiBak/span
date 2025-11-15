import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
  publicDir: 'assets',
  plugins: [
    react(),
    // Plugin to inject environment variables for vanilla JS modules
    {
      name: 'inject-env-vars',
      transformIndexHtml(html) {
        // Inject env vars as a global variable for vanilla JS files
        const envScript = `
          <script>
            window.__ENV__ = {
              VITE_SUPABASE_URL: ${JSON.stringify(env.VITE_SUPABASE_URL || '')},
              VITE_SUPABASE_ANON_KEY: ${JSON.stringify(env.VITE_SUPABASE_ANON_KEY || '')}
            };
          </script>
        `
        // Add data-cfasync="false" to module scripts to disable Cloudflare Rocket Loader
        let modified = html.replace('</head>', `${envScript}</head>`)
        modified = modified.replace(
          /<script type="module"([^>]*)src="([^"]*)"([^>]*)>/g,
          '<script type="module"$1src="$2"$3 data-cfasync="false">'
        )
        return modified
      }
    }
  ],
  base: '/',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000, // Increase warning limit to 1MB (optional)
    rollupOptions: {
      input: {
        main: './index.html',
        bills: './bills.html',
        blog: './blog.html',
        directory: './directory.html',
        'our-story': './our-story.html',
        login: './login.html',
        dashboard: './dashboard.html'
      },
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          'react-vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
          'pdf-vendor': ['pdfjs-dist', 'react-pdf']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
}
})

