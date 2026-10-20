// Drops voice-line clips that no longer match the catalog (their line, template
// or slot is gone, or its text or the voice id changed), and stray files no
// manifest entry points to, so the app reads those lines with device speech
// until they're re-rendered and the APK carries no dead audio.
// Run after editing voice packs:  npm run voice:dump && npm run voice:prune
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, rmdirSync, statSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const VOICE = JSON.parse(readFileSync(`${root}src/voice/voiceId.json`, 'utf8')).voice
const catalog = JSON.parse(readFileSync(`${root}src/voice/voiceLines.json`, 'utf8'))
const voiceDir = `${root}public/voice`
const manPath = `${voiceDir}/manifest.json`
const manifest = existsSync(manPath) ? JSON.parse(readFileSync(manPath, 'utf8')) : {}
const hashOf = (t) => createHash('sha1').update(`${VOICE}|${t}`).digest('hex').slice(0, 10)

if (catalog.voice !== VOICE) {
  console.error(`✗ voice:prune: voiceLines.json is for voice "${catalog.voice}" but voiceId.json says "${VOICE}" — run npm run voice:dump first`)
  process.exit(1)
}

let dropped = 0
for (const [key, clip] of Object.entries(manifest)) {
  const c = catalog.clips[key]
  if (c && clip.hash === hashOf(c.text) && clip.file === c.file) continue
  for (const rel of [clip.file, clip.words].filter(Boolean)) {
    const abs = `${root}public/${rel}`
    if (existsSync(abs)) rmSync(abs)
  }
  delete manifest[key]
  dropped++
  console.log(`dropped ${key} (${c ? 'text or voice changed' : 'no longer in any voice pack'})`)
}

// files on disk that no manifest entry points to; then empty folders
const keep = new Set()
for (const clip of Object.values(manifest)) for (const f of [clip.file, clip.words]) if (f) keep.add(f)
let strays = 0
const sweep = (dir, rel) => {
  for (const name of readdirSync(dir)) {
    const p = `${dir}/${name}`
    const r = `${rel}/${name}`
    if (statSync(p).isDirectory()) {
      sweep(p, r)
      if (readdirSync(p).length === 0) rmdirSync(p)
    } else if (/\.(mp3|words\.json)$/.test(name) && !keep.has(r)) {
      rmSync(p)
      strays++
      console.log(`removed stray ${r}`)
    }
  }
}
mkdirSync(voiceDir, { recursive: true })
sweep(voiceDir, 'voice')

const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]))
writeFileSync(manPath, JSON.stringify(sorted, null, 2) + '\n')
console.log(`voice:prune: ${dropped} stale clip(s) and ${strays} stray file(s) removed, ${Object.keys(sorted).length} kept`)
