// Drops narration clips that no longer match their lesson text (or voice), so the
// app falls back to browser speech for those steps until they're re-rendered.
// Run after editing lesson narration:  npm run tts:dump && npm run tts:prune
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const VOICE = JSON.parse(readFileSync(`${root}src/tutoring/narrationVoice.json`, 'utf8')).voice
const lessons = JSON.parse(readFileSync(`${root}src/tutoring/narration.json`, 'utf8'))
const manPath = `${root}public/tts/manifest.json`
const manifest = existsSync(manPath) ? JSON.parse(readFileSync(manPath, 'utf8')) : {}

const text = new Map()
for (const [lessonId, steps] of Object.entries(lessons)) for (const { stepId, text: t } of steps) text.set(`${lessonId}/${stepId}`, t)
const hashOf = (t) => createHash('sha1').update(`${VOICE}|${t}`).digest('hex').slice(0, 10)

let dropped = 0
for (const [key, clip] of Object.entries(manifest)) {
  const t = text.get(key)
  if (t !== undefined && clip.hash === hashOf(t)) continue
  for (const rel of [clip.file, clip.words].filter(Boolean)) {
    const abs = `${root}public/${rel}`
    if (existsSync(abs)) rmSync(abs)
  }
  for (const ext of ['.mp3.hash']) {
    const abs = `${root}public/tts/${key}${ext}`
    if (existsSync(abs)) rmSync(abs)
  }
  delete manifest[key]
  dropped++
  console.log(`dropped ${key} (${t === undefined ? 'step no longer exists' : 'text or voice changed'})`)
}
writeFileSync(manPath, JSON.stringify(manifest, null, 2) + '\n')
console.log(`prune: ${dropped} stale clip(s) removed, ${Object.keys(manifest).length} kept`)
