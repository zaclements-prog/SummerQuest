import { describe, it } from 'vitest'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { everyLesson, narrationPace } from '../../lessons'
import { sceneFor } from '../scenes'
import { DEFAULT_CHARS_PER_SEC, alignWords, phraseIndex, timeAtChar } from '../cues'
import type { TimedWord } from '../cues'
import { Defs } from '../kit'
import { H, M, W } from '../palette'

/**
 * Scene frame dump for before/after comparisons of a scene change (not a regular test:
 * it only runs with SCENE_SNAP set). For each lesson step it renders the scene's SVG
 * every SCENE_SNAP_STEP seconds (default 0.25) from 0 to 2.5 s past the narration,
 * timed exactly as in the app (the recorded clip's duration and word timings), and
 * writes the frames plus element counts to SCENE_SNAP_OUT. scripts/scene-snapshots.mjs
 * rasterizes them and compares two dumps pixel by pixel.
 *
 *   SCENE_SNAP=wordProblem,science SCENE_SNAP_OUT=/tmp/snaps/before npx vitest run sceneSnapshots
 */
const only = process.env.SCENE_SNAP
const out = process.env.SCENE_SNAP_OUT ?? 'scene-snapshots'
const stepS = Number(process.env.SCENE_SNAP_STEP ?? 0.25)

describe.skipIf(!only)('scene frame dump', () => {
  it('writes frames', () => {
    const lessons = only === 'all' ? everyLesson : everyLesson.filter((l) => only!.split(',').includes(l.id))
    const manifest = JSON.parse(readFileSync('public/tts/manifest.json', 'utf8')) as Record<string, { duration: number; words?: string }>
    const counts: Record<string, { frames: number; peak: number; mean: number }> = {}
    for (const l of lessons)
      for (const s of l.steps) {
        const Scene = sceneFor(l.id, s.id)
        if (!Scene) continue
        const key = `${l.id}/${s.id}`
        const clip = manifest[key]
        // (no clip yet: the app's silent timeline, at the lesson's own pace — slower for K–1)
        const dur = clip?.duration ?? s.narration.length / (DEFAULT_CHARS_PER_SEC * narrationPace(l))
        const words = clip?.words ? (JSON.parse(readFileSync(join('public', clip.words), 'utf8')) as { words?: TimedWord[] }).words ?? null : null
        const aligned = words ? alignWords(s.narration, words) : null
        const cue = (phrase: string, nth = 0) => {
          const i = phraseIndex(s.narration, phrase, nth)
          return i < 0 ? 0 : timeAtChar(i, s.narration.length, dur, aligned)
        }
        const dir = join(out, l.id, s.id)
        mkdirSync(dir, { recursive: true })
        let peak = 0
        let sum = 0
        let n = 0
        for (let t = 0; t <= dur + 2.5 + 1e-9; t += stepS) {
          const svg = renderToStaticMarkup(
            <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ background: M.paper }}>
              <Defs />
              <Scene t={t} dur={dur} cue={cue} reduced={false} />
            </svg>,
          )
          const elements = (svg.match(/<[a-zA-Z]/g) ?? []).length
          peak = Math.max(peak, elements)
          sum += elements
          n++
          writeFileSync(join(dir, `${t.toFixed(2).padStart(6, '0')}.svg`), svg)
        }
        counts[key] = { frames: n, peak, mean: Math.round(sum / n) }
      }
    writeFileSync(join(out, 'counts.json'), JSON.stringify(counts, null, 2))
  }, 600_000)
})
