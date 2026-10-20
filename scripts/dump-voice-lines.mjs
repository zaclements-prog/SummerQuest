// Writes src/voice/voiceLines.json: every voice-line clip to record, from all
// the packs in src/voice/packs/*.ts (see src/voice/catalog.ts for the keys and
// docs/narration-handoff.md, "Voice lines"). Run with tsx:
//   npm run voice:dump
// Fails (exit 1) on a line or template that can't be recorded or named, e.g.
// a `whole` template with too many combinations (switch it to `stitch`).
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { buildVoiceCatalog } from '../src/voice/catalog.ts'

const root = new URL('..', import.meta.url)
const packDir = new URL('src/voice/packs/', root)
const voice = JSON.parse(readFileSync(new URL('src/voice/voiceId.json', root), 'utf8')).voice
const sha1_10 = (s) => createHash('sha1').update(s).digest('hex').slice(0, 10)

const packs = []
for (const f of readdirSync(packDir).filter((f) => f.endsWith('.ts')).sort()) {
  const mod = await import(new URL(f, packDir).href)
  if (!mod.default?.id) {
    console.error(`✗ voice:dump: voice pack ${f} has no default export with an id`)
    process.exit(1)
  }
  packs.push(mod.default)
}

let catalog
try {
  catalog = buildVoiceCatalog(packs, voice, sha1_10)
} catch (e) {
  console.error(`✗ voice:dump: ${e.message}`)
  process.exit(1)
}
writeFileSync(new URL('src/voice/voiceLines.json', root), JSON.stringify(catalog, null, 2) + '\n')
const kinds = {}
for (const c of Object.values(catalog.clips)) kinds[c.kind] = (kinds[c.kind] ?? 0) + 1
const summary = Object.entries(kinds).map(([k, n]) => `${n} ${k}`).join(', ')
console.log(`voiceLines.json: ${Object.keys(catalog.clips).length} clips from ${packs.length} pack(s) (${summary || 'none'}), voice "${voice}"`)
