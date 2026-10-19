// @vitest-environment node
// (node env: jsdom's `crypto` has no `subtle`, Node's Web Crypto does.)
import { describe, expect, it } from 'vitest'
import { slotValues, type VoiceCatalog } from '../catalog'
import { planVoice } from '../playlist'
import { VOICE_PACKS, voiceText } from '../registry'
import type { VoiceRef } from '../types'
import voiceId from '../voiceId.json'
import voiceLinesJson from '../voiceLines.json'
import manifestJson from '../../../public/voice/manifest.json'
import { catalogWithHashes, sha1_10 } from './hash'

const VOICE = voiceId.voice
const voiceLines = voiceLinesJson as VoiceCatalog
type Manifest = Record<string, { file: string; hash: string; duration?: number; words?: string }>
const manifest = manifestJson as Manifest

// Every voice clip actually on disk (paths only; nothing is loaded).
const onDisk = new Set(Object.keys(import.meta.glob('../../../public/voice/**/*.{mp3,json}')).map((p) => p.replace(/^.*\/public\//, '')))

/** Every reference the app could make: each line, and each template with every slot value at least once. */
function everyRef(): VoiceRef[] {
  const refs: VoiceRef[] = []
  for (const pack of Object.values(VOICE_PACKS)) {
    for (const id of Object.keys(pack.lines)) refs.push({ line: `${pack.id}/${id}` })
    for (const [id, def] of Object.entries(pack.templates ?? {})) {
      const names = Object.keys(def.slots)
      const first = Object.fromEntries(names.map((n) => [n, slotValues(def.slots[n])[0]]))
      for (const n of names) for (const v of slotValues(def.slots[n])) refs.push({ template: `${pack.id}/${id}`, slots: { ...first, [n]: v } })
    }
  }
  return refs
}

describe('voice lines sync', () => {
  it('voiceLines.json matches the packs and the voice id (run `npm run voice:dump` after editing a pack)', async () => {
    expect(voiceLines).toEqual(await catalogWithHashes(Object.values(VOICE_PACKS), VOICE))
  })

  it('every pack line and template resolves, and every clip it plays is in the catalog', () => {
    const refs = everyRef()
    expect(refs.length).toBeGreaterThan(0)
    for (const ref of refs) {
      const text = voiceText(ref)
      expect(text.trim(), JSON.stringify(ref)).toBe(text)
      const plan = planVoice(ref)
      expect(plan.caption).toBe(text)
      expect(plan.segments.length, JSON.stringify(ref)).toBeGreaterThan(0)
      for (const seg of plan.segments) {
        expect(voiceLines.clips[seg.key], `${JSON.stringify(ref)} plays ${seg.key}, which isn't in voiceLines.json`).toBeDefined()
        expect(voiceLines.clips[seg.key].text).toBe(seg.text)
        expect(seg.capEnd).toBeGreaterThan(seg.capStart)
        expect(seg.capEnd).toBeLessThanOrEqual(text.length)
      }
    }
  })

  it('every manifest clip belongs to a current line and was rendered from its current text and voice', async () => {
    for (const [key, clip] of Object.entries(manifest)) {
      const c = voiceLines.clips[key]
      expect(c, `orphaned voice clip ${key} (npm run voice:prune)`).toBeDefined()
      expect(clip.file, `voice clip ${key} file`).toBe(c.file)
      expect(clip.hash, `stale voice clip ${key}: its text or the voice changed (re-render, or npm run voice:prune)`).toBe(await sha1_10(`${VOICE}|${c.text}`))
      expect(onDisk.has(clip.file), `voice clip ${key}: ${clip.file} is missing`).toBe(true)
      if (clip.words) expect(onDisk.has(clip.words), `voice clip ${key}: ${clip.words} is missing`).toBe(true)
    }
  })

  it('every voice clip on disk is listed in the manifest (no dead audio in the app)', () => {
    const listed = new Set(Object.values(manifest).flatMap((c) => [c.file, c.words].filter(Boolean)))
    for (const f of onDisk) if (f !== 'voice/manifest.json') expect(listed.has(f), `public/${f} is not in public/voice/manifest.json`).toBe(true)
  })
})

describe('voice coverage', () => {
  // Default CI: report what still has to be rendered, pass. VOICE_STRICT=1 (the K–1
  // release gate, plan §8): every clip must be rendered and fresh.
  const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}
  const strict = env.VOICE_STRICT === '1'

  it(`every voice line has a rendered clip${strict ? ' (strict)' : ' (reported; VOICE_STRICT=1 enforces)'}`, () => {
    const missing = Object.keys(voiceLines.clips).filter((k) => manifest[k]?.hash !== voiceLines.clips[k].hash)
    if (missing.length) {
      const msg = `${missing.length} of ${Object.keys(voiceLines.clips).length} voice clips not rendered: ${missing.slice(0, 20).join(', ')}${missing.length > 20 ? ', …' : ''}`
      if (strict) expect.fail(`${msg} — render them on the Mac (docs/narration-handoff.md, "Voice lines")`)
      else console.log(`[voice coverage] ${msg} (device speech until rendered)`)
    }
  })
})
