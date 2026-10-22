import { afterEach, describe, expect, it, vi } from 'vitest'
import { K_TOWERS_MAX, K_TOWER_EMOJI, makeKTowersProvider, type KTowersMode } from '../kTowers'
import { K_TOWER_THINGS } from '../../../voice/packs/k-towers'
import { cardsFor, hasPicturePanel, questionSteps, walkthroughCounts } from '../../../games/listenPlay/script'
import type { ListenProblem } from '../../../games/listenPlay/types'
import type { Picture } from '../../problem'
import { seededRng } from '../../random'
import { voiceText } from '../../../voice/registry'
import type { VoiceRef } from '../../../voice/types'
import { phraseIndex } from '../../../tutoring/motion/cues'
import { SKILLS } from '../../../tutoring/skills'

/**
 * Counting Towers' questions (K.CC): every one answerable from its pictures,
 * inside its stage's range, ramping up through the stage, every picture one a
 * tablet draws, and everything said resolves.
 */

afterEach(() => vi.restoreAllMocks())

const MODES: KTowersMode[] = ['count', 'compare', 'mixed']
const SEEDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l']

function draw(mode: KTowersMode, seed: string, n = 40): ListenProblem[] {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(`ktowers:${mode}:${seed}`))
  const p = makeKTowersProvider({ mode })
  const out = Array.from({ length: n }, () => p.next())
  vi.restoreAllMocks()
  return out
}

const count = (pic: Picture | undefined) => (pic?.kind === 'group' ? pic.count : NaN)
const numeral = (pic: Picture | undefined) => (pic?.kind === 'numeral' ? pic.n : NaN)
const said = (ref: VoiceRef | null | undefined) => {
  expect(ref).toBeTruthy()
  return voiceText(ref!)
}

/** The answer, worked out from the pictures alone. */
function solve(q: ListenProblem): number {
  const cards = q.pictureOptions!
  switch (q.subtopic) {
    case 'howMany':
      for (const c of cards) expect(c.picture.kind).toBe('numeral')
      return count(q.picture)
    case 'findGroup': {
      const want = numeral(q.picture)
      const hits = cards.filter((c) => count(c.picture) === want)
      expect(hits, q.prompt).toHaveLength(1)
      return hits[0].value as number
    }
    case 'more':
    case 'fewer': {
      const ns = cards.map((c) => count(c.picture))
      expect(ns[0]).not.toBe(ns[1])
      return q.subtopic === 'more' ? Math.max(...ns) : Math.min(...ns)
    }
    case 'bigger':
      return Math.max(...cards.map((c) => numeral(c.picture)))
  }
  throw new Error(`unknown tower question ${q.subtopic}`)
}

describe.each(MODES)('Counting Towers questions: %s', (mode) => {
  const items = () => SEEDS.flatMap((s) => draw(mode, s))

  it('every question is answerable from its pictures, within the stage’s range', () => {
    const max = K_TOWERS_MAX[mode]
    for (const q of items()) {
      const where = `${q.prompt} ${JSON.stringify(q.options)} → ${q.answer}`
      expect(solve(q), where).toBe(q.answer)
      expect(new Set(q.options).size, where).toBe(q.options.length)
      expect(q.options.length, where).toBeGreaterThanOrEqual(2)
      expect(q.options.length, where).toBeLessThanOrEqual(3)
      expect(q.pictureOptions!.map((o) => o.value), where).toEqual(q.options)
      for (const o of q.options) {
        expect(Number.isInteger(o) && (o as number) >= 1 && (o as number) <= max, where).toBe(true)
      }
      // groups of more than ten never come three to a screen
      if (q.subtopic === 'findGroup' && (q.answer as number) > 10) expect(q.options, where).toHaveLength(2)
      // more / fewer compare groups within ten (K.CC.6)
      if (q.subtopic === 'more' || q.subtopic === 'fewer') for (const o of q.options) expect(o as number).toBeLessThanOrEqual(10)
      for (const pic of [q.picture, ...q.pictureOptions!.map((o) => o.picture)]) {
        if (pic?.kind === 'group') expect(Object.values(K_TOWER_EMOJI), where).toContain(pic.emoji)
      }
      expect(SKILLS[q.skill!.id], q.skill?.id).toMatchObject({ zoneId: 'tower-battlefront', lessonId: 'kTowers' })
    }
  })

  it('only the stage’s kinds of question', () => {
    const kinds = new Set(items().map((q) => q.subtopic))
    expect([...kinds].sort()).toEqual(
      ({ count: ['howMany'], compare: ['fewer', 'more'], mixed: ['bigger', 'fewer', 'findGroup', 'howMany', 'more'] } as const)[mode].slice(),
    )
  })

  it('everything is said, and the guide can follow it; a wrong card has a count-along to run', () => {
    for (const q of items()) {
      const line = said(q.speech)
      expect(line.startsWith(q.prompt.replace(/\.$/, '')), `${line} / ${q.prompt}`).toBe(true)
      for (const o of q.pictureOptions!) said(o.speech)
      for (const p of q.praise ?? []) said(p)
      for (const c of q.cues ?? []) {
        if (typeof c.cue === 'string') expect(phraseIndex(line, c.cue)).toBeGreaterThanOrEqual(0)
        if (c.target === 'picture') expect(hasPicturePanel(q)).toBe(true)
      }
      const open = q.options.map((_, i) => i)
      expect(questionSteps(q, open)[0].voice).toEqual(q.speech)
      cardsFor(q).forEach((c, i) => {
        if (c.value === q.answer) return
        const plan = walkthroughCounts(q, cardsFor(q), i, open)
        if (q.walkthrough === 'countUp') expect(plan).toEqual([])
        else {
          expect(plan.length, q.prompt).toBeGreaterThan(0)
          for (const p of plan) expect(p.count).toBeLessThanOrEqual(20)
        }
      })
    }
  })

  it('never the same question twice in a row; the answer never in one place three times running', () => {
    for (const seed of SEEDS) {
      const qs = draw(mode, seed, 60)
      const at = qs.map((q) => q.options.indexOf(q.answer))
      for (let i = 1; i < qs.length; i++) {
        const sig = (q: ListenProblem) => `${q.prompt}|${JSON.stringify(q.picture ?? null)}|${JSON.stringify(q.options)}`
        expect(sig(qs[i]), `${seed} item ${i}`).not.toBe(sig(qs[i - 1]))
      }
      for (let i = 2; i < at.length; i++) expect(at[i] === at[i - 1] && at[i] === at[i - 2], `${seed}: ${at.slice(i - 2, i + 1)}`).toBe(false)
    }
  })
})

describe('Counting Towers ramps up through a stage', () => {
  it('how many: small groups first (2–5), then up to 8, then up to 10', () => {
    for (const seed of SEEDS) {
      const qs = draw('count', seed, 8).map((q) => q.answer as number)
      for (const n of qs.slice(0, 2)) expect(n).toBeLessThanOrEqual(5)
      for (const n of qs.slice(2, 4)) expect(n).toBeLessThanOrEqual(8)
      for (const n of qs) expect(n).toBeGreaterThanOrEqual(2)
    }
  })
  it('more or fewer: far apart at first (3 or 4), closer later', () => {
    for (const seed of SEEDS) {
      const qs = draw('compare', seed, 8).map((q) => Math.abs((q.options[0] as number) - (q.options[1] as number)))
      for (const d of qs.slice(0, 2)) expect(d).toBeGreaterThanOrEqual(3)
      for (const d of qs) expect(d).toBeLessThanOrEqual(4)
    }
  })
  it('mixed: counts reach 20 later in the stage, not at the start', () => {
    const early = SEEDS.flatMap((s) => draw('mixed', s, 2)).map((q) => q.difficulty ?? 0)
    const late = SEEDS.flatMap((s) => draw('mixed', s, 12).slice(6)).map((q) => q.difficulty ?? 0)
    expect(Math.max(...early)).toBeLessThanOrEqual(10)
    expect(Math.max(...late)).toBeGreaterThan(14)
  })
})

describe('Counting Towers things', () => {
  it('the things counted are in step with the voice pack, and every Android tablet draws them (Unicode 6)', () => {
    expect(Object.keys(K_TOWER_EMOJI).sort()).toEqual([...K_TOWER_THINGS].sort())
    for (const e of Object.values(K_TOWER_EMOJI)) {
      const cps = [...e].map((c) => c.codePointAt(0)!)
      expect(cps).toHaveLength(1)
      expect(cps[0]).toBeLessThan(0x1f6d3)
    }
  })
})
