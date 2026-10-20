import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { k1Lessons, narrationPace } from '../../lessons'
import { sceneFor } from '../scenes'
import { DEFAULT_CHARS_PER_SEC, phraseIndex, timeAtChar } from '../cues'
import { Defs } from '../kit'
import { H, W } from '../palette'

/**
 * The kindergarten scenes keep the lesson stage's performance rules
 * (docs/handoff/content-and-motion-graphics.md, B2) — checked on every frame,
 * every 0.25 s, timed as the app's silent timeline at the K pace:
 *   about 150 elements on screen (250 at a transition's peak), no filters,
 *   motion that ends, deterministic frames, the finished picture when reduced,
 *   and nothing to read: numerals, letters and symbols only.
 */
const elements = (svg: string) => (svg.match(/<[a-zA-Z]/g) ?? []).length
/** Numbers to one decimal: a spring or a wobble a thousandth of a unit from rest is "still". */
const settled = (svg: string) =>
  svg
    .replace(/-?\d+(\.\d+)?(e-?\d+)?/g, (m) => (Math.round(Number(m) * 10) / 10).toFixed(1).replace('-0.0', '0.0'))
    .replace(/ ?rotate\(0\.0\)/g, '')
    .replace(/ ?scale\(1\.0\)/g, '')

for (const lesson of k1Lessons) {
  describe(`${lesson.id} scenes`, () => {
    for (const step of lesson.steps) {
      const Scene = sceneFor(lesson.id, step.id)!
      const text = step.narration
      const dur = text.length / (DEFAULT_CHARS_PER_SEC * narrationPace(lesson))
      const cue = (phrase: string, nth = 0) => {
        const i = phraseIndex(text, phrase, nth)
        if (i < 0) throw new Error(`cue "${phrase}" is not in ${lesson.id}/${step.id}`)
        return timeAtChar(i, text.length, dur)
      }
      const frame = (t: number, reduced = false) => renderToStaticMarkup(<svg viewBox={`0 0 ${W} ${H}`}><Defs /><Scene t={t} dur={dur} cue={cue} reduced={reduced} /></svg>)
      const defsOnly = elements(renderToStaticMarkup(<svg><Defs /></svg>))

      it(`${step.id}: stays light, filter-free and deterministic on every frame`, () => {
        let peak = 0
        for (let t = 0; t <= dur + 3; t += 0.25) {
          const svg = frame(t)
          const n = elements(svg) - defsOnly
          peak = Math.max(peak, n)
          expect(svg, `${step.id} @ ${t}s`).not.toMatch(/filter=/)
          expect(frame(t), `${step.id} @ ${t}s`).toBe(svg)
        }
        expect(peak, `${step.id} peak elements`).toBeLessThanOrEqual(150)
      })

      it(`${step.id}: motion ends, and reduced motion shows the finished picture`, () => {
        const end = settled(frame(dur + 2.5))
        expect(settled(frame(dur + 8)), `${step.id} still moving after the narration`).toBe(end)
        expect(settled(frame(1e4, true)), `${step.id} reduced`).toBe(end)
      })

      it(`${step.id}: shows nothing to read (numerals, single letters and symbols only)`, () => {
        for (const t of [dur * 0.5, dur + 2.5]) {
          const texts = [...frame(t).matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1].trim()).filter(Boolean)
          for (const s of texts) expect(s, `${step.id} shows "${s}"`).toMatch(/^([0-9?]+|[A-Za-z])$/)
        }
      })
    }
  })
}
