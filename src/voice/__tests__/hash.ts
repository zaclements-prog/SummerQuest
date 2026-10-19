import { buildVoiceCatalog, type VoiceCatalog } from '../catalog'
import type { VoicePack } from '../types'

/** First 10 hex of SHA-1, as scripts/dump-voice-lines.mjs and the renderer compute it (Web Crypto). */
export async function sha1_10(s: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-1', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 10)
}

/** buildVoiceCatalog with the real hashes (its hash function is synchronous; Web Crypto isn't). */
export async function catalogWithHashes(packs: VoicePack[], voice: string): Promise<VoiceCatalog> {
  const cat = buildVoiceCatalog(packs, voice, (s) => s) // hash = its input, for now
  for (const c of Object.values(cat.clips)) c.hash = await sha1_10(c.hash)
  return cat
}
