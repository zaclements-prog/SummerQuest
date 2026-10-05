// @vitest-environment node
// (node env: jsdom's `crypto` has no `subtle`, Node's Web Crypto does.)
import { describe, it, expect } from 'vitest'
import { allLessons } from '../lessons'
import narrationJson from '../narration.json'
import manifestJson from '../../../public/tts/manifest.json'

// Must match scripts/generate-tts.mjs (VOICE + hash recipe + file layout).
const VOICE = 'en-US-JennyNeural'

type Narration = Record<string, { stepId: string; text: string }[]>
type Manifest = Record<string, { file: string; hash: string }>
const narration: Narration = narrationJson
const manifest: Manifest = manifestJson

// Every narration clip actually on disk, keyed like the manifest ("lesson/step").
// Non-eager glob: only the paths are needed, the MP3s are never loaded.
const mp3OnDisk = new Set(
  Object.keys(import.meta.glob('../../../public/tts/**/*.mp3')).map((p) =>
    p.replace(/^.*\/public\/tts\//, '').replace(/\.mp3$/, ''),
  ),
)

async function clipHash(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-1', new TextEncoder().encode(`${VOICE}|${text}`))
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
  return hex.slice(0, 10)
}

/** What scripts/dump-narration.mjs would write for the current lessons. */
function dumpedNarration(): Narration {
  const out: Narration = {}
  for (const l of allLessons) out[l.id] = l.steps.map((s) => ({ stepId: s.id, text: s.narration }))
  return out
}

const currentText = new Map<string, string>()
for (const l of allLessons) for (const s of l.steps) currentText.set(`${l.id}/${s.id}`, s.narration)

describe('narration sync', () => {
  it('narration.json matches the lessons (run `npm run tts` after editing narration)', () => {
    expect(narration).toEqual(dumpedNarration())
  })

  it('lesson step ids are unique within each lesson (they key the audio clips)', () => {
    for (const l of allLessons) {
      const ids = l.steps.map((s) => s.id)
      expect(new Set(ids).size, `duplicate step id in ${l.id}`).toBe(ids.length)
    }
  })

  it('every manifest clip belongs to a current step and was generated from its current text', async () => {
    for (const [key, clip] of Object.entries(manifest)) {
      const text = currentText.get(key)
      expect(text, `orphaned clip ${key}: no such lesson step`).toBeDefined()
      expect(clip.file, `clip ${key} file path`).toBe(`tts/${key}.mp3`)
      expect(clip.hash, `stale clip ${key}: narration changed since the MP3 was made`).toBe(await clipHash(text!))
      expect(mp3OnDisk.has(key), `clip ${key} listed in manifest but ${clip.file} is missing`).toBe(true)
    }
  })

  it('every MP3 on disk is listed in the manifest (no leftover clips)', () => {
    for (const key of mp3OnDisk) expect(manifest[key], `public/tts/${key}.mp3 is not in manifest.json`).toBeDefined()
  })
})
