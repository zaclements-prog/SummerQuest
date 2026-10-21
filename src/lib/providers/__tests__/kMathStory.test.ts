import { afterEach, describe, expect, it, vi } from 'vitest'
import { createProvider, type ProviderConfig } from '..'
import { getZone, zoneStages } from '../../../curriculum'
import { seededRng } from '../../random'
import type { ListenProblem } from '../../../games/listenPlay/types'
import { hasSide, isMathStorySpec, sideCount, storyAnswer, storyLayout, type MathStorySpec } from '../../../games/listenPlay/activities/mathStorySpec'
import { voiceText } from '../../../voice/registry'
import type { VoiceRef } from '../../../voice/types'
import { SKILLS } from '../../../tutoring/skills'
import { K_ADDTAKE_THINGS } from '../../../voice/packs/k-addtake'
import { K_WOODS_STORIES, type KWoodsPlot } from '../../../voice/packs/k-woods'
import { K_ADDTAKE_ART, makeKAddTakeProvider, type KAddTakeConfig } from '../kAddTake'
import { K_WOODS_ART, WOODS_PLOTS, makeKStoryMathProvider, storyNumbers, type KStoryMathConfig } from '../kStoryMath'
import { storyDistractors, storyNote } from '../kMathStory'

/**
 * Add-and-Take Falls (K.OA.1, K.OA.5, K.OA.4) and Story Woods (K.OA.2): the
 * `mathStory` questions, fuzzed over many seeds. Every question is a scene
 * the child can watch (or act out) and answer: the numbers on screen give the
 * answer, the wrong cards are worth getting wrong, everything is said aloud,
 * and the pictures are emoji every Android tablet draws.
 */

afterEach(() => vi.restoreAllMocks())

/** Many seeds, many draws: generous on a busy machine. */
const SLOW = 60000

const SEEDS = Array.from({ length: 24 }, (_, i) => `seed-${i}`)
const ROUND = 6

/** A round of `n` questions from a fresh provider (the shell resets it as a round starts). */
function round(make: () => { next(): ListenProblem; reset?(): void }, seed: string, n = ROUND): ListenProblem[] {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(seed))
  const p = make()
  p.reset?.()
  const out = Array.from({ length: n }, () => p.next())
  vi.restoreAllMocks()
  return out
}
/** Many questions in a row (rounds that carry on: decks, the answer's place). */
function stream(make: () => { next(): ListenProblem }, seed: string, n = 300): ListenProblem[] {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(seed))
  const p = make()
  const out = Array.from({ length: n }, () => p.next())
  vi.restoreAllMocks()
  return out
}

const specOf = (q: ListenProblem): MathStorySpec => {
  expect(isMathStorySpec(q.activity)).toBe(true)
  return q.activity as MathStorySpec
}

/** Unicode 9 or older, one symbol (a text-default symbol may carry U+FE0F). */
function oldEmoji(e: string): boolean {
  const cps = [...e].map((c) => c.codePointAt(0)!).filter((cp) => cp !== 0xfe0f)
  if (cps.length !== 1) return false
  const cp = cps[0]
  return (
    cp < 0x1f6d3 ||
    (cp >= 0x1f6e0 && cp <= 0x1f6f6) ||
    (cp >= 0x1f910 && cp <= 0x1f91e) ||
    (cp >= 0x1f920 && cp <= 0x1f927) ||
    (cp >= 0x1f930 && cp <= 0x1f93e) ||
    (cp >= 0x1f940 && cp <= 0x1f94b) ||
    (cp >= 0x1f950 && cp <= 0x1f95e) ||
    (cp >= 0x1f980 && cp <= 0x1f991) ||
    cp === 0x1f9c0
  )
}

/** Worked out from the plot and the two numbers alone (not the activity's own helper). */
function independentAnswer(s: MathStorySpec): number {
  if (s.plot === 'join' || s.plot === 'together') return s.a + s.b
  if (s.plot === 'frame') return 10 - s.a
  return s.a - s.b
}

const said = (r: VoiceRef | null | undefined) => {
  expect(r).toBeTruthy()
  return voiceText(r!)
}

/** Every check a question of either zone must pass. */
function expectFair(q: ListenProblem) {
  const s = specOf(q)
  const where = `${q.prompt} ${JSON.stringify(q.options)} → ${q.answer}`
  // the answer is what the scene shows
  expect(q.answer, where).toBe(independentAnswer(s))
  expect(storyAnswer(s), where).toBe(q.answer)
  expect(q.answer as number, where).toBeGreaterThanOrEqual(1)
  expect(q.answer as number, where).toBeLessThanOrEqual(10)
  // the numbers fit within ten, and the things fit their spots
  expect(s.a, where).toBeGreaterThanOrEqual(1)
  expect(s.b, where).toBeGreaterThanOrEqual(1)
  if (s.plot === 'join' || s.plot === 'together') expect(s.a + s.b, where).toBeLessThanOrEqual(10)
  if (s.plot === 'leave' || s.plot === 'compare') expect(s.b, where).toBeLessThan(s.a)
  if (s.plot === 'frame') expect(s.a + s.b, where).toBe(10)
  if (s.plot === 'compare') expect(s.a, where).toBeLessThanOrEqual(6)
  // three numeral cards, the answer once, all different, all 1–10
  expect(q.options, where).toHaveLength(3)
  expect(new Set(q.options).size, where).toBe(3)
  expect(q.options.filter((o) => o === q.answer), where).toHaveLength(1)
  for (const o of q.options) {
    expect(Number.isInteger(o) && (o as number) >= 1 && (o as number) <= 10, where).toBe(true)
  }
  expect(q.pictureOptions!.map((c) => c.value), where).toEqual(q.options)
  for (const c of q.pictureOptions!) {
    expect(c.picture, where).toEqual({ kind: 'numeral', n: c.value })
    expect(said(c.speech), where).toBe(`${c.value}!`)
  }
  // a word for each wrong card that has one, never for the answer
  expect(q.notes, where).toHaveLength(3)
  q.notes!.forEach((n, i) => {
    if (q.options[i] === q.answer) expect(n, where).toBeNull()
    else if (n) said(n)
  })
  // everything is said: the story, the act-it-out prompt, the question, the praise
  for (const l of s.lines) said(l)
  said(s.ask)
  if (s.act) said(s.act)
  for (const p of q.praise ?? []) said(p)
  expect(q.prompt, where).toBe([...s.lines, ...(s.act ? [s.act] : []), s.ask].map(voiceText).join(' '))
  expect(q.prompt, where).not.toMatch(/undefined|NaN|\{|\s{2}/)
  // pictures every tablet draws, and never the same picture for two roles
  for (const e of [s.emoji, s.emoji2, s.who, s.friend].filter((x): x is string => !!x)) expect(oldEmoji(e), `${e} in ${where}`).toBe(true)
  const roles = [s.emoji, s.emoji2, s.who, s.friend].filter(Boolean)
  expect(new Set(roles).size, where).toBe(roles.length)
  expect(SKILLS[q.skill!.id], `${q.skill?.id} is registered`).toBeDefined()
}

/** The answer moves between the cards: never in one place three times running, every place used. */
function expectPlacesMove(qs: ListenProblem[]) {
  const at = qs.map((q) => q.options.indexOf(q.answer))
  for (let i = 2; i < at.length; i++) expect(at[i] === at[i - 1] && at[i] === at[i - 2], `positions ${at.slice(i - 2, i + 1)}`).toBe(false)
  for (let k = 0; k < 3; k++) expect(at.filter((x) => x === k).length, `answer at card ${k}`).toBeGreaterThan(qs.length * 0.15)
}

// ── Add-and-Take Falls ───────────────────────────────────────────────────────

describe('Add-and-Take Falls (kAddTake)', () => {
  const MODES: KAddTakeConfig['mode'][] = ['within5', 'within10', 'make10']

  it('has a picture, a home and a way of moving for every thing the voice names', () => {
    expect(Object.keys(K_ADDTAKE_ART).sort()).toEqual([...K_ADDTAKE_THINGS].sort())
    for (const [t, art] of Object.entries(K_ADDTAKE_ART)) expect(oldEmoji(art.emoji), t).toBe(true)
    expect(new Set(Object.values(K_ADDTAKE_ART).map((a) => a.emoji)).size).toBe(K_ADDTAKE_THINGS.length)
  })

  it.each(MODES)('%s: every question is fair, said aloud and drawn (many seeds)', (mode) => {
    for (const seed of SEEDS) for (const q of stream(() => makeKAddTakeProvider({ mode }), `addtake:${mode}:${seed}`, 60)) expectFair(q)
  }, SLOW)

  it('within 5: adding and taking away take turns, totals to 5, one moving at first', () => {
    for (const seed of SEEDS) {
      const qs = round(() => makeKAddTakeProvider({ mode: 'within5' }), `w5:${seed}`)
      const ss = qs.map(specOf)
      for (const s of ss) {
        expect(['join', 'leave']).toContain(s.plot)
        expect(s.plot === 'join' ? s.a + s.b : s.a).toBeLessThanOrEqual(5)
        // watching it happen: no acting, no characters, the falls
        expect(s.act).toBeUndefined()
        expect(s.who).toBeUndefined()
        expect(s.place).toBe('falls')
      }
      expect(ss.slice(0, 2).map((s) => s.b)).toEqual([1, 1])
      expect(new Set(ss.slice(0, 2).map((s) => s.plot)).size).toBe(2)
      expect(ss.map((s) => s.b).every((b) => b <= 3)).toBe(true)
    }
  })

  it('within 10: past five every time, up to ten, the change growing through the round', () => {
    for (const seed of SEEDS) {
      const ss = round(() => makeKAddTakeProvider({ mode: 'within10' }), `w10:${seed}`).map(specOf)
      for (const s of ss) {
        const top = s.plot === 'join' ? s.a + s.b : s.a
        expect(top).toBeGreaterThanOrEqual(6)
        expect(top).toBeLessThanOrEqual(10)
      }
      expect(ss.slice(0, 2).every((s) => s.b <= 2)).toBe(true)
    }
  })

  it('make ten: a ten-frame, one or two empty spots first, then more', () => {
    for (const seed of SEEDS) {
      const ss = round(() => makeKAddTakeProvider({ mode: 'make10' }), `m10:${seed}`).map(specOf)
      for (const s of ss) {
        expect(s.plot).toBe('frame')
        expect(s.home).toBe('frame')
        expect(s.lines).toHaveLength(1)
        expect(voiceText(s.ask)).toBe('How many more make ten?')
      }
      expect(ss[0].b).toBeLessThanOrEqual(2)
      expect(Math.max(...ss.map((s) => s.b))).toBeGreaterThanOrEqual(3)
    }
  })

  it('says it the way it happens: "Here are 3 frogs." "2 more hop in." "How many now?"', () => {
    const spec = (q: ListenProblem) => specOf(q)
    const qs = stream(() => makeKAddTakeProvider({ mode: 'within10' }), 'falls-lines', 200)
    for (const q of qs) {
      const s = spec(q)
      const [start, change] = s.lines.map(voiceText)
      expect(start).toMatch(s.a === 1 ? /^Here is one \w+\.$/ : new RegExp(`^Here are ${s.a} \\w+\\.$`))
      if (s.plot === 'join') {
        expect(change).toMatch(s.b === 1 ? /^One more (hops|swims|flies) in\.$/ : new RegExp(`^${s.b} more (hop|swim|fly) in\\.$`))
        expect(voiceText(s.ask)).toBe('How many now?')
      } else {
        expect(change).toMatch(s.b === 1 ? /^One (hops|swims|flies) away\.$/ : new RegExp(`^${s.b} (hop|swim|fly) away\\.$`))
        expect(voiceText(s.ask)).toBe('How many are left?')
      }
    }
  })

  it('never the same scene twice in a row, and the answer moves around', () => {
    for (const mode of MODES) {
      const qs = stream(() => makeKAddTakeProvider({ mode }), `falls-order:${mode}`)
      for (let i = 1; i < qs.length; i++) {
        const [a, b] = [specOf(qs[i - 1]), specOf(qs[i])]
        expect(`${a.plot}${a.a}${a.b}`, `item ${i}`).not.toBe(`${b.plot}${b.a}${b.b}`)
      }
      expectPlacesMove(qs)
    }
  }, SLOW)
})

// ── Story Woods ──────────────────────────────────────────────────────────────

describe('Story Woods (kStoryMath)', () => {
  it('has at least thirty short stories of every kind, each with its place and characters', () => {
    expect(K_WOODS_STORIES.length).toBeGreaterThanOrEqual(30)
    expect(new Set(K_WOODS_STORIES.map((s) => s.id)).size).toBe(K_WOODS_STORIES.length)
    const by = (p: KWoodsPlot) => K_WOODS_STORIES.filter((s) => s.plot === p).length
    expect(by('join')).toBeGreaterThanOrEqual(8)
    expect(by('leave')).toBeGreaterThanOrEqual(8)
    expect(by('together')).toBeGreaterThanOrEqual(5)
    expect(by('compare')).toBeGreaterThanOrEqual(4)
    expect(Object.keys(K_WOODS_ART).sort()).toEqual(K_WOODS_STORIES.map((s) => s.id).sort())
    for (const s of K_WOODS_STORIES) {
      const [start, change, ask] = s.lines
      expect(start, s.id).toMatch(/\{n\}/)
      expect(change, s.id).toMatch(/\{n\}/)
      expect(ask, s.id).toMatch(/^How many .+\?$/)
      for (const l of s.lines) expect(l.split(/\s+/).length, l).toBeLessThanOrEqual(9)
      const art = K_WOODS_ART[s.id]
      if (s.plot === 'together' || s.plot === 'compare') expect(art.emoji2, s.id).toBeDefined()
      for (const e of [art.emoji, art.emoji2, art.who, art.friend].filter((x): x is string => !!x)) expect(oldEmoji(e), `${s.id}: ${e}`).toBe(true)
    }
    // the places and the characters vary: not a drill
    expect(new Set(Object.values(K_WOODS_ART).map((a) => a.place)).size).toBeGreaterThanOrEqual(8)
    expect(new Set(Object.values(K_WOODS_ART).flatMap((a) => [a.who, a.friend]).filter(Boolean)).size).toBeGreaterThanOrEqual(12)
  })

  it('kind stories: no hurting, no scolding, nobody is sad about food', () => {
    const text = K_WOODS_STORIES.flatMap((s) => s.lines).join(' ').toLowerCase()
    for (const w of ['hit', 'kill', 'hurt', 'fight', 'bad', 'naughty', 'greedy', 'too many', 'fat', 'chomp', 'gobble', 'sad', 'cry', 'lost', 'broke']) expect(text, w).not.toMatch(new RegExp(`\\b${w}\\b`))
  })

  it('every story can be told with every number its lines are recorded for, within 5 and within 10', () => {
    for (const story of K_WOODS_STORIES) {
      for (const max of [5, 10]) {
        if (story.plot === 'compare' && max === 5) continue
        vi.spyOn(Math, 'random').mockImplementation(seededRng(`${story.id}:${max}`))
        for (let i = 0; i < 80; i++) {
          const { a, b } = storyNumbers(story, max, i % ROUND)
          const where = `${story.id} max ${max}: ${a}, ${b}`
          expect(a, where).toBeGreaterThanOrEqual(story.a[0])
          expect(a, where).toBeLessThanOrEqual(story.a[1])
          expect(b, where).toBeGreaterThanOrEqual(story.b[0])
          expect(b, where).toBeLessThanOrEqual(story.b[1])
          if (story.plot === 'join' || story.plot === 'together') expect(a + b, where).toBeLessThanOrEqual(max)
          else {
            expect(a, where).toBeLessThanOrEqual(max)
            expect(b, where).toBeLessThan(a)
          }
          voiceText({ template: `k-woods/${story.id}-a`, slots: { n: a } })
          voiceText({ template: `k-woods/${story.id}-b`, slots: { n: b } })
        }
        vi.restoreAllMocks()
      }
    }
  }, SLOW)

  const STAGES: [string, KStoryMathConfig][] = [
    ['act it out (to 5)', { plots: ['join', 'leave'], max: 5 }],
    ['story time (to 10)', { plots: ['join', 'leave', 'together'], max: 10 }],
    ['story puzzles (every kind)', { plots: ['join', 'leave', 'together', 'compare'], max: 10 }],
  ]

  it.each(STAGES)('%s: every question is fair, said aloud and acted out (many seeds)', (_label, cfg) => {
    for (const seed of SEEDS) {
      for (const q of stream(() => makeKStoryMathProvider(cfg), `woods:${JSON.stringify(cfg)}:${seed}`, 60)) {
        expectFair(q)
        const s = specOf(q)
        expect(cfg.plots).toContain(s.plot)
        // the child acts every story out, and a story within 5 stays within 5
        expect(s.act).toBeDefined()
        expect(s.plot === 'join' || s.plot === 'together' ? s.a + s.b : s.a).toBeLessThanOrEqual(cfg.max!)
        expect(q.skill!.id).toBe(s.plot === 'compare' ? 'k-story-more' : 'k-story-problems')
      }
    }
  }, SLOW)

  it('a round deals the plots like cards: every kind before a repeat, never twice in a row', () => {
    for (const seed of SEEDS) {
      const ss = round(() => makeKStoryMathProvider({ plots: [...WOODS_PLOTS] }), `deal:${seed}`).map(specOf)
      expect(new Set(ss.slice(0, 4).map((s) => s.plot)).size).toBe(4)
      for (let i = 1; i < ss.length; i++) expect(ss[i].plot).not.toBe(ss[i - 1].plot)
    }
  })

  it('small changes first: the first two stories move one or two things', () => {
    for (const seed of SEEDS) {
      const ss = round(() => makeKStoryMathProvider({ plots: ['join', 'leave', 'together'], max: 10 }), `ramp:${seed}`).map(specOf)
      for (const s of ss.slice(0, 2)) expect(s.b).toBeLessThanOrEqual(2)
    }
  })

  it('tells many different stories, never one twice in a row, and moves the answer around', () => {
    const qs = stream(() => makeKStoryMathProvider({ plots: [...WOODS_PLOTS] }), 'woods-many', 300)
    expect(new Set(qs.map((q) => q.subtopic)).size).toBe(K_WOODS_STORIES.length)
    for (let i = 1; i < qs.length; i++) expect(qs[i].subtopic).not.toBe(qs[i - 1].subtopic)
    expectPlacesMove(qs)
  }, SLOW)
})

// ── the wrong cards ──────────────────────────────────────────────────────────

describe('the wrong cards are worth getting wrong', () => {
  it('one is a likely mix-up when there is one (the start, the change, the other way), one a step away', () => {
    expect(storyDistractors({ plot: 'join', a: 3, b: 2 })).toContain(3)
    expect(storyDistractors({ plot: 'leave', a: 5, b: 2 })).toContain(5)
    expect(storyDistractors({ plot: 'frame', a: 7, b: 3 })).toContain(7)
    expect(storyDistractors({ plot: 'compare', a: 5, b: 3 })).toContain(5)
    for (const plot of ['join', 'leave', 'together', 'compare', 'frame'] as const) {
      for (let a = 1; a <= 9; a++)
        for (let b = 1; b <= 9; b++) {
          const s = { plot, a, b: plot === 'frame' ? 10 - a : b }
          const ans = storyAnswer(s)
          if (ans < 1 || ans > 10 || (plot !== 'frame' && (plot === 'join' || plot === 'together' ? a + b > 10 : b >= a))) continue
          const d = storyDistractors(s)
          expect(d, JSON.stringify(s)).toHaveLength(2)
          expect(new Set([ans, ...d]).size, JSON.stringify(s)).toBe(3)
          expect(d.some((v) => Math.abs(v - ans) <= 1 || [s.a, s.b].includes(v)), JSON.stringify(s)).toBe(true)
        }
    }
  })

  it('a word about a wrong card fits what happened', () => {
    const note = (s: Parameters<typeof storyNote>[0], v: number) => {
      const r = storyNote(s, v)
      return r ? voiceText(r) : null
    }
    expect(note({ plot: 'join', a: 3, b: 2 }, 3)).toBe("That's how many there were at the start.")
    expect(note({ plot: 'join', a: 3, b: 2 }, 4)).toBe('More came, so there are more now.')
    expect(note({ plot: 'leave', a: 5, b: 2 }, 5)).toBe("That's how many there were at the start.")
    expect(note({ plot: 'leave', a: 5, b: 2 }, 4)).toBe('Some went away, so there are fewer now.')
    expect(note({ plot: 'leave', a: 6, b: 2 }, 2)).toBe("That's how many went away.")
    expect(note({ plot: 'together', a: 3, b: 2 }, 3)).toBe("That's just one kind. Count them all!")
    expect(note({ plot: 'frame', a: 7, b: 3 }, 7)).toBe("That's how many are there already.")
    expect(note({ plot: 'frame', a: 7, b: 3 }, 10)).toBe('Ten fills the whole frame.')
    expect(note({ plot: 'compare', a: 5, b: 3 }, 5)).toBe("That's how many friends there are.")
    expect(note({ plot: 'compare', a: 5, b: 3 }, 2)).toBeNull()
  })
})

// ── the scene fits the screen ────────────────────────────────────────────────

describe('the scene fits a Fire tablet, sideways and upright', () => {
  // the activity's scene box at 1024×528 and 600×952 (the shell's chrome and the card row taken off)
  const BOXES = [
    { w: 900, h: 360 },
    { w: 576, h: 660 },
    { w: 1200, h: 560 },
  ]
  it('every thing is a big tap target (at least 64 px), and every spot is inside the scene', () => {
    const specs: MathStorySpec[] = []
    for (const cfg of [
      { kind: 'kAddTake', mode: 'within10' },
      { kind: 'kAddTake', mode: 'make10' },
      { kind: 'kStoryMath', plots: [...WOODS_PLOTS], max: 10 },
    ] as ProviderConfig[]) {
      vi.spyOn(Math, 'random').mockImplementation(seededRng(`layout:${cfg.kind}`))
      const p = createProvider(cfg)
      for (let i = 0; i < 200; i++) specs.push(specOf(p.next() as ListenProblem))
      vi.restoreAllMocks()
    }
    for (const box of BOXES) {
      for (const s of specs) {
        const L = storyLayout(s, box.w, box.h)
        const where = `${box.w}×${box.h} ${s.plot} ${s.a},${s.b} ${s.who ?? ''}${s.friend ?? ''}`
        expect(L.cell, where).toBeGreaterThanOrEqual(64)
        for (const p of [...L.spots, ...L.sideSpots]) {
          expect(p.x - L.cell / 2, where).toBeGreaterThanOrEqual(0)
          expect(p.x + L.cell / 2, where).toBeLessThanOrEqual(box.w)
          expect(p.y - L.cell / 2, where).toBeGreaterThanOrEqual(0)
          expect(p.y + L.cell / 2, where).toBeLessThanOrEqual(box.h)
        }
        expect(L.sideSpots.length, where).toBe(hasSide(s) ? Math.max(1, sideCount(s)) : 0)
        // the character never stands on the group
        if (L.who) expect(L.who.x + L.who.s / 2 <= L.home.x + 1 || L.who.y + L.who.s / 2 <= L.home.y + 1, where).toBe(true)
      }
    }
  }, SLOW)
})

// ── the stages ───────────────────────────────────────────────────────────────

describe('the K stages play these questions', () => {
  it('Add-and-Take Falls: within 5, within 10, make ten; Story Woods: acting out to 5, to 10, every kind', () => {
    const kinds = (zoneId: string) => zoneStages(getZone(zoneId)!, 0).map((st) => st.providerConfig)
    expect(kinds('fraction-falls')).toEqual([
      { kind: 'kAddTake', mode: 'within5' },
      { kind: 'kAddTake', mode: 'within10' },
      { kind: 'kAddTake', mode: 'make10' },
    ])
    expect(kinds('word-problem-woods')).toEqual([
      { kind: 'kStoryMath', plots: ['join', 'leave'], max: 5 },
      { kind: 'kStoryMath', plots: ['join', 'leave', 'together'], max: 10 },
      { kind: 'kStoryMath', plots: ['join', 'leave', 'together', 'compare'], max: 10 },
    ])
  })
})
