// Validates rendered narration against the lessons (the contract in
// docs/narration-handoff.md). Exit code 1 on any problem.
//   npm run tts:check                    every step must have a fresh clip
//   npm run tts:check -- --allow-missing  only check the clips that exist
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const allowMissing = process.argv.includes('--allow-missing')
const VOICE = JSON.parse(readFileSync(`${root}src/tutoring/narrationVoice.json`, 'utf8')).voice
const lessons = JSON.parse(readFileSync(`${root}src/tutoring/narration.json`, 'utf8'))
const manifest = JSON.parse(readFileSync(`${root}public/tts/manifest.json`, 'utf8'))
const hashOf = (t) => createHash('sha1').update(`${VOICE}|${t}`).digest('hex').slice(0, 10)

const problems = []
const warn = []
const steps = new Map()
for (const [lessonId, list] of Object.entries(lessons)) for (const { stepId, text } of list) steps.set(`${lessonId}/${stepId}`, text)

for (const [key, text] of steps) {
  const clip = manifest[key]
  if (!clip) {
    ;(allowMissing ? warn : problems).push(`${key}: no clip in manifest`)
    continue
  }
  if (clip.file !== `tts/${key}.mp3`) problems.push(`${key}: file must be tts/${key}.mp3 (got ${clip.file})`)
  if (clip.hash !== hashOf(text)) problems.push(`${key}: stale hash (text or voice "${VOICE}" changed) — re-render it`)
  const abs = `${root}public/${clip.file}`
  if (!existsSync(abs)) problems.push(`${key}: ${clip.file} is missing`)
  else if (statSync(abs).size < 2000) problems.push(`${key}: ${clip.file} is suspiciously small (${statSync(abs).size} bytes)`)
  if (clip.duration !== undefined) {
    if (!(clip.duration > 0)) problems.push(`${key}: duration must be > 0 seconds`)
    else {
      const cps = text.length / clip.duration
      if (cps < 7 || cps > 26) warn.push(`${key}: pace looks off (${cps.toFixed(1)} chars/s; expected ~10–18) — check the audio`)
    }
  }
  if (clip.words !== undefined) {
    const wabs = `${root}public/${clip.words}`
    if (clip.words !== `tts/${key}.words.json`) problems.push(`${key}: words must be tts/${key}.words.json`)
    if (!existsSync(wabs)) problems.push(`${key}: ${clip.words} is missing`)
    else {
      try {
        const { words } = JSON.parse(readFileSync(wabs, 'utf8'))
        if (!Array.isArray(words) || words.length === 0) problems.push(`${key}: words.json needs a non-empty "words" array`)
        else {
          let prev = -1
          for (const w of words) {
            if (typeof w.w !== 'string' || typeof w.s !== 'number' || typeof w.e !== 'number' || w.e < w.s) {
              problems.push(`${key}: bad word entry ${JSON.stringify(w)}`)
              break
            }
            if (w.s < prev - 0.05) {
              problems.push(`${key}: word times must not go backwards (at "${w.w}")`)
              break
            }
            prev = w.s
          }
          const spoken = text.split(/\s+/).filter(Boolean).length
          if (words.length < spoken * 0.8) warn.push(`${key}: only ${words.length} timed words for ${spoken} in the text`)
          if (clip.duration && words[words.length - 1].e > clip.duration + 0.3) problems.push(`${key}: last word ends after the clip's duration`)
        }
      } catch (e) {
        problems.push(`${key}: words.json is not valid JSON (${e.message})`)
      }
    }
  }
}
for (const key of Object.keys(manifest)) if (!steps.has(key)) problems.push(`${key}: orphaned clip (no such lesson step) — run npm run tts:prune`)

// stray files on disk
const ttsDir = `${root}public/tts`
for (const lesson of readdirSync(ttsDir)) {
  const dir = `${ttsDir}/${lesson}`
  if (!statSync(dir).isDirectory()) continue
  for (const f of readdirSync(dir)) {
    const m = f.match(/^(.+?)\.(mp3|words\.json)$/)
    if (m && !manifest[`${lesson}/${m[1]}`]) warn.push(`stray file tts/${lesson}/${f} (not in manifest)`)
  }
}

for (const w of warn) console.log('warn:', w)
for (const p of problems) console.log('FAIL:', p)
const fresh = [...steps.keys()].filter((k) => manifest[k] && manifest[k].hash === hashOf(steps.get(k))).length
console.log(`tts:check — voice "${VOICE}": ${fresh}/${steps.size} steps have a fresh clip; ${problems.length} problem(s), ${warn.length} warning(s)`)
process.exit(problems.length ? 1 : 0)
