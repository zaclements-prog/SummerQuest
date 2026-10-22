import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeG1SharesProvider, type G1SharesMode } from '../g1Shares'
import { seededRng } from '../../random'
import type { ListenProblem } from '../../../games/listenPlay/types'
import { CUT_INFO, SHARE_THINGS, THING_BASE, allShareArt, area, cutsFor, outline, parseShareArt, shareArtName, shares, type ShareBase } from '../../../games/listenPlay/shareGeometry'
import { DRAWINGS } from '../../../games/listenPlay/drawings'
import { isShareTapSpec, shareTapLines, type ShareTapSpec } from '../../../games/listenPlay/activities/shareTapSpec'
import { voiceText } from '../../../voice/registry'
import { SKILLS } from '../../../tutoring/skills'
import { g1SharesProblems } from './g1Checks'

/**
 * Fair Share Falls (1st grade, 1.G.3): the shares are drawn exactly (equal
 * ones equal to a hair, unequal ones plainly not), every drawing a question
 * can show is in the registry, and many seeds of every stage are right and
 * fair, worked out again from the drawings (./g1Checks).
 */

afterEach(() => vi.restoreAllMocks())
// (many seeds of every stage: a busy machine needs more than the default 5 s)
vi.setConfig({ testTimeout: 60000 })

const BASES: ShareBase[] = ['circle', 'square', 'rect']

describe('the shares, as drawn', () => {
  it('every cut makes its shares, and they fill the thing', () => {
    for (const base of BASES)
      for (const cut of cutsFor(base))
        for (const turn of base === 'rect' ? [0] : [0, 90, 180, 270]) {
          const parts = shares(base, cut, turn)
          const key = `${base} ${cut} ${turn}`
          expect(parts.length, key).toBe(CUT_INFO[cut].parts)
          const total = parts.reduce((s, p) => s + area(p), 0)
          expect(Math.abs(total - area(outline(base))) / area(outline(base)), key).toBeLessThan(0.001)
          for (const p of parts) for (const [x, y] of p) expect(x >= 0 && x <= 100 && y >= 0 && y <= 100, key).toBe(true)
        }
  })

  it('equal shares are exactly equal; unequal ones are plainly unequal (the biggest at least half again the smallest)', () => {
    for (const base of BASES)
      for (const cut of cutsFor(base)) {
        const areas = shares(base, cut).map(area)
        const ratio = Math.max(...areas) / Math.min(...areas)
        if (cut === 'mix') {
          // a half and two fourths: the half is both fourths together
          expect(Math.abs(areas[0] - areas[1] - areas[2]) / areas[0], base).toBeLessThan(0.001)
          expect(Math.abs(areas[1] - areas[2]) / areas[1], base).toBeLessThan(0.001)
        } else if (CUT_INFO[cut].equal) expect(ratio, `${base} ${cut}`).toBeLessThan(1.002)
        else expect(ratio, `${base} ${cut}`).toBeGreaterThan(1.5)
      }
  })

  it('every share drawing is in the art registry under its name, and the name reads back', () => {
    const all = allShareArt()
    expect(all.length).toBeGreaterThan(200)
    for (const a of all) {
      const name = shareArtName(a)
      expect(DRAWINGS[name], name).toBeDefined()
      expect(parseShareArt(name)).toEqual({ ...a, turn: a.turn ?? 0 })
    }
    expect(parseShareArt('sunny')).toBeNull()
    for (const thing of SHARE_THINGS) expect(BASES).toContain(THING_BASE[thing])
  })
})

const MODES: G1SharesMode[] = ['equal', 'halvesFourths', 'size']

function round(mode: G1SharesMode, seed: string, n = 12): ListenProblem[] {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(seed))
  const p = makeG1SharesProvider({ mode })
  return Array.from({ length: n }, () => p.next())
}

describe.each(MODES)('Fair Share Falls provider: %s', (mode) => {
  it('every question is right and fair over many seeds (worked out again from the drawings)', () => {
    for (let s = 0; s < 40; s++) {
      for (const q of round(mode, `g1shares:${mode}:${s}`)) {
        expect(g1SharesProblems(q), `${q.prompt} ${JSON.stringify(q.options)} ${JSON.stringify(q.activity ?? q.picture)}`).toEqual([])
        expect(SKILLS[q.skill!.id], q.skill?.id).toBeDefined()
      }
    }
  })

  it('everything is said: the question, the word cards, every note, the share-tap help, the praise', () => {
    for (let s = 0; s < 10; s++) {
      for (const q of round(mode, `g1shares-voice:${mode}:${s}`)) {
        expect(voiceText(q.speech!)).toBe(q.prompt)
        for (const c of q.pictureOptions ?? []) if (c.speech) voiceText(c.speech)
        for (const n of q.notes ?? []) if (n) voiceText(n)
        for (const p of q.praise ?? []) voiceText(p)
        if (isShareTapSpec(q.activity)) for (const ref of shareTapLines(q.speech, q.activity)) voiceText(ref)
        // the only printed words are "half" and "fourth", on the two word cards
        for (const c of q.pictureOptions ?? []) if (c.picture.kind === 'word') expect(['half', 'fourth']).toContain(c.picture.text)
      }
    }
  })

  it('a card question never puts the answer in the same place three times running', () => {
    for (let s = 0; s < 10; s++) {
      const at = round(mode, `g1shares-place:${mode}:${s}`, 30)
        .filter((q) => q.options.length > 0)
        .map((q) => q.options.indexOf(q.answer))
      for (let i = 2; i < at.length; i++) expect(at[i] === at[i - 1] && at[i] === at[i - 2], `positions ${at.slice(i - 2, i + 1)}`).toBe(false)
    }
  })
})

describe('Fair Share Falls: each stage as planned', () => {
  it('Equal shares, then halves and fourths (with taps), then smaller shares', () => {
    const kinds = (mode: G1SharesMode) => round(mode, `plan:${mode}`, 6).map((q) => q.subtopic)
    expect(kinds('equal')).toEqual(['equal', 'equal', 'howMany', 'halves', 'equal', 'howMany'])
    expect(kinds('halvesFourths')).toEqual(['halves', 'fourths', 'tapHalf', 'howMany', 'fourths', 'tapFourth'])
    const size = kinds('size')
    expect(size.slice(0, 4)).toEqual(['nameShare', 'bigger', 'tapFourth', 'smaller'])
    expect(['halves', 'fourths']).toContain(size[4])
    expect(size[5]).toBe('nameShare')
  })

  it('a tap question puts the half somewhere new each time', () => {
    const turns = round('halvesFourths', 'taps', 30)
      .filter((q) => isShareTapSpec(q.activity) && q.activity.thing !== 'cake' && q.activity.thing !== 'garden')
      .map((q) => (q.activity as ShareTapSpec).turn)
    for (let i = 1; i < turns.length; i++) expect(turns[i]).not.toBe(turns[i - 1])
  })
})
