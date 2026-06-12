import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Hardcoded local-only defaults. Override via .env.local if needed.
const DEFAULT_OMLX_URL = 'http://127.0.0.1:8000'
const DEFAULT_OMLX_KEY = '4063'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const omlxUrl = env.VITE_OMLX_URL || DEFAULT_OMLX_URL
  const omlxKey = env.VITE_OMLX_KEY || DEFAULT_OMLX_KEY
  // `npm run build:single` sets SINGLEFILE=1 → one self-contained, fully-offline index.html
  // (all JS/CSS/font inlined; writing grader forced to its built-in heuristic, no network).
  const single = process.env.SINGLEFILE === '1'

  return {
    plugins: [react(), tailwindcss(), ...(single ? [viteSingleFile()] : [])],
    define: {
      'import.meta.env.VITE_OFFLINE': JSON.stringify(single ? 'true' : 'false'),
    },
    server: {
      port: 5173,
      open: true,
      proxy: {
        // Browser → /api/llm/v1/... → oMLX (auth header injected here so it's not in the JS bundle)
        '/api/llm': {
          target: omlxUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/llm/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `Bearer ${omlxKey}`)
            })
          },
        },
      },
    },
  }
})
