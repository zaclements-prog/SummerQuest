/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to 'true' by `npm run build:single` — forces fully-offline behavior (no LLM/network). */
  readonly VITE_OFFLINE?: string
  /** Set to 'true' by `npm run build:store` — the app-store build: no local AI, no network, no dev helpers. */
  readonly VITE_STORE?: string
  /** Set to 'true' in .env.local to show developer helpers (e.g. "Seed sample week" on This Week). */
  readonly VITE_DEV_TOOLS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
