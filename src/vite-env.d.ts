/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to 'true' by `npm run build:single` — forces fully-offline behavior (no LLM/network). */
  readonly VITE_OFFLINE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
