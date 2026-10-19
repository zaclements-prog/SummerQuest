/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to 'true' by `npm run build:single` — forces fully-offline behavior (no LLM/network). */
  readonly VITE_OFFLINE?: string
  /** Set to 'true' by `npm run build:store` — the app-store build: no local AI, no network, no dev helpers. */
  readonly VITE_STORE?: string
  /** Set to 'true' in .env.local to show developer helpers (e.g. "Seed sample week" on This Week). */
  readonly VITE_DEV_TOOLS?: string
  /** 'true' offers kindergarten and 1st grade in a production build (always on in dev; see lib/features). */
  readonly VITE_K1?: string
  /** 'true' offers 5th grade in a production build (always on in dev; see lib/features). */
  readonly VITE_G5?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
