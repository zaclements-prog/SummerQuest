// Validates the rendered voice-line clips (public/voice) against the catalog
// (src/voice/voiceLines.json, written by `npm run voice:dump`). See
// docs/narration-handoff.md, "Voice lines".
//   npm run voice:check                 report; fails on stale / orphaned / broken clips
//   npm run voice:check -- --strict     …and on any missing clip (also VOICE_STRICT=1)
// Clips are counted as fresh / stale / missing / orphan. Missing clips are fine
// by default (the app reads those lines with device speech) until the packs
// that need them ship.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const strict = process.argv.includes('--strict') || process.env.VOICE_STRICT === '1'
const VOICE = JSON.parse(readFileSync(`${root}src/voice/voiceId.json`, 'utf8')).voice
const catalog = JSON.parse(readFileSync(`${root}src/voice/voiceLines.json`, 'utf8'))
const manPath = `${root}public/voice/manifest.json`
const manifest = existsSync(manPath) ? JSON.parse(readFileSync(manPath, 'utf8')) : {}
const hashOf = (t) => createHash('sha1').update(`${VOICE}|${t}`).digest('hex').slice(0, 10)
const wordsOf = (file) => file.replace(/\.mp3$/, '.words.json')

const problems = []
const warn = []
const clips = catalog.clips ?? {}

if (catalog.voice !== VOICE) problems.push(`voiceLines.json was written for voice "${catalog.voice}", but voiceId.json says "${VOICE}" — run npm run voice:dump`)
for (const [key, c] of Object.entries(clips)) {
  if (c.hash !== hashOf(c.text)) {
    problems.push(`voiceLines.json is out of date (${key}) — run npm run voice:dump`)
    break
  }
}

const fresh = []
const stale = []
const missing = []
const orphan = []
for (const [key, c] of Object.entries(clips)) {
  const clip = manifest[key]
  if (!clip) {
    missing.push(key)
    continue
  }
  if (clip.hash !== hashOf(c.text)) {
    stale.push(key)
    problems.push(`${key}: stale clip (text or voice "${VOICE}" changed) — re-render it, or npm run voice:prune`)
    continue
  }
  let ok = true
  const bad = (msg) => {
    problems.push(`${key}: ${msg}`)
    ok = false
  }
  if (clip.file !== c.file) bad(`file must be ${c.file} (got ${clip.file})`)
  const abs = `${root}public/${clip.file}`
  if (!existsSync(abs)) bad(`${clip.file} is missing`)
  else if (statSync(abs).size < 800) bad(`${clip.file} is suspiciously small (${statSync(abs).size} bytes)`)
  if (clip.duration !== undefined) {
    if (!(clip.duration > 0)) bad('duration must be > 0 seconds')
    else if (c.text.split(/\s+/).length > 3) {
      const cps = c.text.length / clip.duration
      if (cps < 5 || cps > 22) warn.push(`${key}: pace looks off (${cps.toFixed(1)} chars/s; K delivery is ~9–14) — check the audio`)
    }
  } else warn.push(`${key}: no duration in the manifest (stitched lines time better with it)`)
  if (clip.words !== undefined) {
    if (clip.words !== wordsOf(c.file)) bad(`words must be ${wordsOf(c.file)}`)
    const wabs = `${root}public/${clip.words}`
    if (!existsSync(wabs)) bad(`${clip.words} is missing`)
    else {
      try {
        const { words } = JSON.parse(readFileSync(wabs, 'utf8'))
        if (!Array.isArray(words) || words.length === 0) bad('words.json needs a non-empty "words" array')
        else {
          let prev = -1
          for (const w of words) {
            if (typeof w.w !== 'string' || typeof w.s !== 'number' || typeof w.e !== 'number' || w.e < w.s) {
              bad(`bad word entry ${JSON.stringify(w)}`)
              break
            }
            if (w.s < prev - 0.05) {
              bad(`word times must not go backwards (at "${w.w}")`)
              break
            }
            prev = w.s
          }
          if (clip.duration && words[words.length - 1].e > clip.duration + 0.3) bad("last word ends after the clip's duration")
        }
      } catch (e) {
        bad(`words.json is not valid JSON (${e.message})`)
      }
    }
  }
  if (ok) fresh.push(key)
}
for (const key of Object.keys(manifest)) {
  if (!clips[key]) {
    orphan.push(key)
    problems.push(`${key}: orphaned clip (no such line, template or slot) — run npm run voice:prune`)
  }
}

// stray files on disk (shipped in the app but never played)
const listed = new Set()
for (const clip of Object.values(manifest)) for (const f of [clip.file, clip.words]) if (f) listed.add(f)
const walk = (dir, rel) => {
  for (const name of readdirSync(dir)) {
    const p = `${dir}/${name}`
    const r = `${rel}/${name}`
    if (statSync(p).isDirectory()) walk(p, r)
    else if (/\.(mp3|words\.json)$/.test(name) && !listed.has(r)) warn.push(`stray file ${r} (not in manifest) — npm run voice:prune removes it`)
  }
}
if (existsSync(`${root}public/voice`)) walk(`${root}public/voice`, 'voice')

if (missing.length) {
  const byPack = {}
  for (const k of missing) {
    const pack = k.split('/')[0]
    byPack[pack] = (byPack[pack] ?? 0) + 1
  }
  const list = `${missing.length} clip(s) not rendered yet (${Object.entries(byPack).map(([p, n]) => `${p}: ${n}`).join(', ')}): ${missing.slice(0, 12).join(', ')}${missing.length > 12 ? ', …' : ''}`
  if (strict) problems.push(`missing: ${list}`)
  else console.log(`note: ${list} — those lines use device speech until rendered (--strict fails on this)`)
}

for (const w of warn) console.log('warn:', w)
for (const p of problems) console.log('FAIL:', p)
const total = Object.keys(clips).length
console.log(
  `voice:check — voice "${VOICE}": ${total} clips: ${fresh.length} fresh, ${stale.length} stale, ${missing.length} missing, ${orphan.length} orphan${strict ? ' (strict)' : ''}; ${problems.length} problem(s), ${warn.length} warning(s)`,
)
process.exit(problems.length ? 1 : 0)
