import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
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
        return html.replace('</head>', `${envScript}</head>`)
      }
    }
  ],
  base: '/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
        bills: './bills.html',
        blog: './blog.html',
        directory: './directory.html',
        'our-story': './our-story.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
}
})

