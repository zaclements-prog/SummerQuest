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
  // `npm run build:store` sets VITE_STORE=true → the app-store build (Amazon Appstore, a
  // child-directed listing): the local-AI writing feeder is compiled out and developer
  // helpers stay off whatever .env.local says, so nothing in the bundle talks to a server.
  // scripts/check-store-bundle.mjs then checks dist/ for any way out.
  const store = process.env.VITE_STORE === 'true'

  return {
    plugins: [react(), tailwindcss(), ...(single ? [viteSingleFile()] : [])],
    define: {
      'import.meta.env.VITE_OFFLINE': JSON.stringify(single ? 'true' : 'false'),
      'import.meta.env.VITE_STORE': JSON.stringify(store ? 'true' : 'false'),
      ...(store
        ? {
            'import.meta.env.VITE_DEV_TOOLS': JSON.stringify('false'),
            // K–1 and grade 5 aren't authored yet (lib/features): the store build offers
            // them only when its own command line asks, never because of .env.local.
            'import.meta.env.VITE_K1': JSON.stringify(process.env.VITE_K1 === 'true' ? 'true' : 'false'),
            'import.meta.env.VITE_G5': JSON.stringify(process.env.VITE_G5 === 'true' ? 'true' : 'false'),
          }
        : {}),
    },
    // `npm run play` (what the launchers use) serves the production build on the
    // SAME port as the dev server, so the browser origin — and the saved progress
    // in localStorage — stays the same. Proxy settings are inherited from `server`.
    preview: {
      port: 5173,
      strictPort: true,
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
