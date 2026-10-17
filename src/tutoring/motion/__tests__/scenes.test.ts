import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { allLessons } from '../../lessons'
import { sceneFor } from '../scenes'
import { phraseIndex } from '../cues'

describe('lesson motion scenes', () => {
  it('every lesson step has a scene', () => {
    const missing = allLessons.flatMap((l) => l.steps.filter((s) => !sceneFor(l.id, s.id)).map((s) => `${l.id}/${s.id}`))
    expect(missing).toEqual([])
  })

  it('every cue phrase is spoken in its step, and scenes render across their timeline', () => {
    const badCues = new Set<string>()
    for (const l of allLessons)
      for (const s of l.steps) {
        const Scene = sceneFor(l.id, s.id)
        if (!Scene) continue
        const cue = (phrase: string, nth = 0) => {
          if (phraseIndex(s.narration, phrase, nth) < 0) badCues.add(`${l.id}/${s.id}: "${phrase}"`)
          return 1
        }
        // start, mid-narration, after it, and the held end frame (reduced motion)
        for (const t of [0, 3, 8, 15, 10000]) {
          expect(() => renderToStaticMarkup(createElement('svg', null, createElement(Scene, { t, dur: 12, reduced: false, cue }))), `${l.id}/${s.id} @ ${t}s`).not.toThrow()
        }
      }
    expect([...badCues]).toEqual([])
  })
})
