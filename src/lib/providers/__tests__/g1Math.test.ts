import { afterEach, describe, expect, it, vi } from 'vitest'
import { getZone, zoneStages } from '../../../curriculum'
import { seededRng } from '../../random'
import type { ListenProblem } from '../../../games/listenPlay/types'
import { actTaps, isNumberSentenceSpec, sentenceHolds, solveSentence, type NumberSentenceSpec, type SentenceToken } from '../../../games/listenPlay/activities/numberSentenceSpec'
import { hasSide, isMathStorySpec, sideCount, storyAnswer, storyLayout, storyMoves, type MathStorySpec } from '../../../games/listenPlay/activities/mathStorySpec'
import { lineText, voiceText } from '../../../voice/registry'
import type { VoiceRef } from '../../../voice/types'
import { SKILLS } from '../../../tutoring/skills'
import { G1_WOODS_STORIES, type G1WoodsPlot } from '../../../voice/packs/g1-woods'
import { makeG1AddingProvider, type G1AddingMode } from '../g1Adding'
import { makeG1SubtractProvider, type G1SubtractMode } from '../g1Subtract'
import { G1_PLOT, G1_WOODS_ART, G1_WOODS_PLOTS, makeG1StoryMathProvider } from '../g1StoryMath'
import { factCards } from '../g1Facts'

/**
 * 1st grade (phase 2b): Adding Mesa and Take-Away Dunes (the `numberSentence`
 * questions) and Story Woods (the `mathStory` stories within 20), fuzzed over
 * many seeds. Every question is a true number sentence the child can work
 * out from the picture; the wrong cards are worth getting wrong and each has
 * its word; everything is said aloud (every voice reference resolves); the
 * pictures are emoji every Android tablet draws.
 */

afterEach(() => vi.restoreAllMocks())

const SLOW = 90000
const SEEDS = Array.from({ length: 30 }, (_, i) => `seed-${i}`)
const ROUND = 6

function round(make: () => { next(): ListenProblem; reset?(): void }, seed: string, n = ROUND): ListenProblem[] {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(seed))
  const p = make()
  p.reset?.()
  const out = Array.from({ length: n }, () => p.next())
  vi.restoreAllMocks()
  return out
}

function stream(make: () => { next(): ListenProblem }, seed: string, n = 240): ListenProblem[] {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(seed))
  const p = make()
  const out = Array.from({ length: n }, () => p.next())
  vi.restoreAllMocks()
  return out
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

const said = (r: VoiceRef | null | undefined, where = '') => {
  expect(r, where).toBeTruthy()
  return voiceText(r!)
}

/** The three numeral cards: the answer once, all different, all 1–20, each said, a word for the wrong ones only. */
function expectCards(q: ListenProblem, where: string) {
  expect(q.options, where).toHaveLength(3)
  expect(new Set(q.options).size, where).toBe(3)
  expect(q.options.filter((o) => o === q.answer), where).toHaveLength(1)
  for (const o of q.options) expect(Number.isInteger(o) && (o as number) >= 1 && (o as number) <= 20, `${where}: card ${o}`).toBe(true)
  expect(q.pictureOptions!.map((c) => c.value), where).toEqual(q.options)
  for (const c of q.pictureOptions!) {
    expect(c.picture, where).toEqual({ kind: 'numeral', n: c.value })
    expect(said(c.speech, where)).toBe(`${c.value}!`)
  }
  expect(q.notes, where).toHaveLength(3)
  q.notes!.forEach((n, i) => {
    if (q.options[i] === q.answer) expect(n, where).toBeNull()
    else if (n) said(n, where)
  })
  for (const p of q.praise ?? []) said(p, where)
  expect(SKILLS[q.skill!.id], `${q.skill?.id} is registered`).toBeDefined()
  expect(q.prompt, where).not.toMatch(/undefined|NaN|\{|\s{2}/)
}

// ── Adding Mesa and Take-Away Dunes: number sentences ────────────────────────

const specOf = (q: ListenProblem): NumberSentenceSpec => {
  expect(isNumberSentenceSpec(q.activity)).toBe(true)
  return q.activity as NumberSentenceSpec
}

/** The number the model shows, worked out from the model alone. */
function modelAnswer(s: NumberSentenceSpec): number | null {
  const m = s.model
  switch (m.kind) {
    case 'countOn':
      return m.start + m.on
    case 'rows':
      return m.top + m.bottom
    case 'makeTen':
      return m.a + m.b
    case 'takeAway':
      return m.whole - m.take
    case 'countBack':
      return m.start - m.back
    case 'parts':
      return m.whole - m.part
    case 'family':
      return null
  }
}

const nums = (ts: readonly SentenceToken[]) => ts.filter((t): t is number => typeof t === 'number')

function expectFairFact(q: ListenProblem) {
  const s = specOf(q)
  const where = `${s.sentence.join(' ')} [${s.model.kind}] ${JSON.stringify(q.options)} → ${q.answer}`
  // a true number sentence with one unknown, and its answer is the card
  expect(s.sentence.filter((t) => t === '?'), where).toHaveLength(1)
  expect(solveSentence(s.sentence), where).toBe(q.answer)
  expect(s.answer, where).toBe(q.answer)
  expect(sentenceHolds(s.sentence, s.answer), where).toBe(true)
  expect(q.answer as number, where).toBeGreaterThanOrEqual(1)
  expect(q.answer as number, where).toBeLessThanOrEqual(20)
  for (const n of nums(s.sentence)) expect(n >= 1 && n <= 20, where).toBe(true)
  expect(s.cards, where).toEqual(q.options)
  // the picture agrees with the sentence
  const m = s.model
  const fromModel = modelAnswer(s)
  const total = nums(s.sentence).reduce((a, b) => Math.max(a, b), 0)
  switch (m.kind) {
    case 'countOn':
      // count on from the bigger number
      expect(m.start, where).toBeGreaterThanOrEqual(m.on)
      expect(fromModel, where).toBe(q.answer)
      expect([...nums(s.sentence)].sort((a, b) => a - b), where).toEqual([m.on, m.start].sort((a, b) => a - b))
      break
    case 'rows':
      expect(fromModel, where).toBe(q.answer)
      if (m.turn) expect(s.given && sentenceHolds(s.given, 0), where).toBe(true)
      else expect(Math.abs(m.top - m.bottom), where).toBeLessThanOrEqual(1)
      expect(Math.max(m.top, m.bottom), where).toBeLessThanOrEqual(10)
      break
    case 'makeTen':
      expect(fromModel, where).toBe(q.answer)
      expect(m.a + m.b, where).toBeGreaterThan(10)
      expect(m.a, where).toBeLessThan(10)
      expect(m.b, where).toBeLessThanOrEqual(10)
      break
    case 'takeAway':
    case 'countBack':
      expect(fromModel, where).toBe(q.answer)
      expect(s.sentence[0], where).toBe(m.kind === 'takeAway' ? m.whole : m.start)
      break
    case 'parts':
      // the missing part: whole − the part we have
      expect(fromModel, where).toBe(q.answer)
      expect(m.whole, where).toBe(total)
      expect(m.whole, where).toBeLessThanOrEqual(20)
      break
    case 'family': {
      expect(m.a + m.b, where).toBe(m.whole)
      expect(m.sentences, where).toHaveLength(4)
      for (const sent of m.sentences) expect(sentenceHolds(sent, 0), `${where}: ${sent.join(' ')}`).toBe(true)
      // the asked sentence is one of the four with one number hidden
      const full = m.sentences[m.blank]
      expect(s.sentence.length, where).toBe(full.length)
      s.sentence.forEach((t, i) => (t === '?' ? expect(full[i], where).toBe(q.answer) : expect(t, where).toBe(full[i])))
      break
    }
  }
  if (s.act) expect(actTaps(m), where).toBeGreaterThan(0)
  // everything is said: the question, the hint, the act prompt, every help line
  said(s.ask, where)
  if (s.hint) said(s.hint, where)
  if (s.act) said(s.act, where)
  expect(s.help.length, where).toBeGreaterThan(0)
  for (const b of s.help) said(b.voice, where)
  expect(q.speech, where).toEqual(s.ask)
  expectCards(q, where)
}

describe('Adding Mesa (g1Adding)', () => {
  const MODES: G1AddingMode[] = ['countOn', 'facts']

  it.each(MODES)('%s: every question is a true sentence, its picture agrees, the cards are fair, all of it said (many seeds)', (mode) => {
    for (const seed of SEEDS) for (const q of stream(() => makeG1AddingProvider({ mode }), `add:${mode}:${seed}`, 120)) expectFairFact(q)
  }, SLOW)

  it('count on: acted out first (tap each dot), small, then bigger; the smaller number first once; turn-around facts; no repeats', () => {
    for (const seed of SEEDS) {
      const qs = round(() => makeG1AddingProvider({ mode: 'countOn' }), `on:${seed}`)
      const ss = qs.map(specOf)
      expect(ss.slice(0, 3).every((s) => !!s.act && s.model.kind === 'countOn')).toBe(true)
      expect(ss.slice(3).every((s) => !s.act)).toBe(true)
      expect(ss[0].answer).toBeLessThanOrEqual(11)
      // the third: the smaller number written first (start with the bigger one)
      const third = ss[2]
      expect(third.model.kind === 'countOn' && (third.sentence[0] as number) < (third.sentence[2] as number)).toBe(true)
      expect(ss[3].model.kind === 'rows' && ss[3].model.turn).toBe(true)
      expect(Math.max(...ss.map((s) => s.answer))).toBeGreaterThanOrEqual(12)
      expect(new Set(ss.map((s) => s.sentence.join(' '))).size).toBe(ss.length)
    }
  })

  it('doubles and tens: doubles, near doubles and make ten, the first make ten acted out', () => {
    const kinds = new Set<string>()
    for (const seed of SEEDS) {
      const qs = round(() => makeG1AddingProvider({ mode: 'facts' }), `facts:${seed}`)
      const ss = qs.map(specOf)
      expect(ss[0].model).toMatchObject({ kind: 'rows' })
      expect(ss[1].model.kind).toBe('makeTen')
      expect(ss[1].act).toBeDefined()
      for (const q of qs) kinds.add(q.subtopic!)
    }
    expect([...kinds].sort()).toEqual(['double', 'makeTen', 'near'])
  })

  it('the wrong cards: one short (counting the first number again), just the ten, just the double, the other operation', () => {
    const notes = new Set<string>()
    for (const seed of SEEDS)
      for (const mode of MODES)
        for (const q of round(() => makeG1AddingProvider({ mode }), `notes:${mode}:${seed}`)) for (const n of q.notes ?? []) if (n && 'line' in n) notes.add(n.line)
    for (const id of ['noteNext', 'notePart', 'noteTen', 'noteDouble']) expect(notes).toContain(`g1-facts/${id}`)
  })
})

describe('Take-Away Dunes (g1Subtract)', () => {
  const MODES: G1SubtractMode[] = ['takeAway', 'think']

  it.each(MODES)('%s: every question is a true sentence, its picture agrees, the cards are fair, all of it said (many seeds)', (mode) => {
    for (const seed of SEEDS) for (const q of stream(() => makeG1SubtractProvider({ mode }), `sub:${mode}:${seed}`, 120)) expectFairFact(q)
  }, SLOW)

  it('take away: taking away and counting back acted out first, within ten; then teen numbers with the picture to help', () => {
    for (const seed of SEEDS) {
      const ss = round(() => makeG1SubtractProvider({ mode: 'takeAway' }), `ta:${seed}`).map(specOf)
      expect(ss.slice(0, 3).every((s) => !!s.act)).toBe(true)
      expect(ss.slice(0, 2).map((s) => s.model.kind)).toEqual(['takeAway', 'takeAway'])
      expect(ss[2].model.kind).toBe('countBack')
      expect((ss[0].sentence[0] as number) <= 10 && (ss[1].sentence[0] as number) <= 10).toBe(true)
      expect(ss.slice(3).every((s) => !s.act && (s.sentence[0] as number) > 10)).toBe(true)
      for (const s of ss) expect(s.sentence[1]).toBe('−')
    }
  })

  it('think addition: the missing number in every place, and fact families', () => {
    const shapes = new Set<string>()
    for (const seed of SEEDS) {
      const ss = round(() => makeG1SubtractProvider({ mode: 'think' }), `th:${seed}`).map(specOf)
      expect(ss.map((s) => s.model.kind)).toEqual(['parts', 'parts', 'family', 'parts', 'parts', 'family'])
      for (const s of ss) shapes.add(s.sentence.map((t) => (typeof t === 'number' ? 'n' : t)).join(''))
      // a fact family: four true sentences, the roof's three numbers
      const fam = ss[2].model
      expect(fam.kind === 'family' && fam.whole <= 10).toBe(true)
      expect(ss[5].model.kind === 'family' && ss[5].model.whole > 10).toBe(true)
    }
    // 13 − 5 = ?, ? + 4 = 9, 5 + ? = 12 and 12 − ? = 4 all come up
    for (const shape of ['n−n=?', '?+n=n', 'n+?=n', 'n−?=n']) expect(shapes, shape).toContain(shape)
  })
})

describe('the cards (factCards)', () => {
  it('the answer, the first mix-up that fits, a near miss, all different and 1–20', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('cards'))
    for (let answer = 1; answer <= 20; answer++) {
      const { cards, notes } = factCards(answer, [
        [answer + 7, { line: 'g1-facts/noteAdded' }],
        [0, { line: 'g1-facts/noteWhole' }],
      ])
      expect(cards[0]).toBe(answer)
      expect(new Set(cards).size).toBe(3)
      for (const c of cards) expect(c >= 1 && c <= 20).toBe(true)
      if (answer + 7 <= 20) expect(cards).toContain(answer + 7)
      for (const c of cards.slice(1)) if (notes.get(c)) said(notes.get(c))
    }
  })
})

// ── Story Woods at 1st grade ─────────────────────────────────────────────────

const storySpec = (q: ListenProblem): MathStorySpec => {
  expect(isMathStorySpec(q.activity)).toBe(true)
  return q.activity as MathStorySpec
}

/** The story's own numbers, as said (the `{n}` of each line, in order). */
function saidNumbers(q: ListenProblem): number[] {
  const s = storySpec(q)
  return s.lines.map((l) => ('template' in l ? Number(l.slots.n) : NaN)).filter((n) => !Number.isNaN(n))
}

/** The answer, worked out from what is SAID (not from the activity's own helper). */
function answerFromStory(plot: G1WoodsPlot, said: number[]): number {
  const [x, y, z] = said
  switch (plot) {
    case 'join':
    case 'together':
      return x + y
    case 'leave':
    case 'compare':
    case 'fewer':
      return x - y
    case 'joinChange':
      // "Bear had 8." … "Now Bear has 13."
      return y - x
    case 'leaveChange':
      // "15 birds." … "Now there are 9."
      return x - y
    case 'joinStart':
      // "Then 5 more." "Now there are 13."
      return y - x
    case 'apart':
      // "12 flowers." "5 are tulips."
      return x - y
    case 'three':
      return x + y + z
  }
}

function expectFairStory(q: ListenProblem) {
  const s = storySpec(q)
  const [plot, id] = (q.subtopic ?? ':').split(':') as [G1WoodsPlot, string]
  const story = G1_WOODS_STORIES.find((x) => x.id === id)!
  const where = `${q.prompt} ${JSON.stringify(q.options)} → ${q.answer}`
  expect(story, where).toBeDefined()
  expect(story.plot, where).toBe(plot)
  expect(s.plot, where).toBe(G1_PLOT[plot])
  // the answer is what the story says, and what the scene shows
  expect(q.answer, where).toBe(answerFromStory(plot, saidNumbers(q)))
  expect(storyAnswer(s), where).toBe(q.answer)
  expect(q.answer as number, where).toBeGreaterThanOrEqual(1)
  // within 20, and the things fit their spots: a home of at most 20, a side of at most 10
  const home = s.plot === 'leave' || s.plot === 'leaveChange' || s.plot === 'compare' ? s.a : s.plot === 'three' ? s.a + s.b + (s.c ?? 0) : s.a + s.b
  expect(home, where).toBeLessThanOrEqual(20)
  if (hasSide(s)) expect(sideCount(s), where).toBeLessThanOrEqual(10)
  if (s.plot === 'compare') expect(s.a, where).toBeLessThanOrEqual(10)
  expect(storyMoves(s), where).toBeGreaterThan(0)
  // the number sentence written after: true, its answer where it says
  expect(s.sentence, where).toBeDefined()
  const tokens = s.sentence!
  expect(tokens[s.sentenceAnswerAt!], where).toBe(q.answer)
  expect(sentenceHolds(tokens as SentenceToken[], 0), where).toBe(true)
  expect(said(s.sentenceSaid, where).replace(/\.$/, '').split(' ').filter((w) => /^\d+$/.test(w)).map(Number), where).toEqual(nums(tokens as SentenceToken[]))
  // everything is said: the story, the act prompt, the question
  for (const l of s.lines) said(l, where)
  said(s.ask, where)
  said(s.act, where)
  expect(q.prompt, where).toBe([...s.lines, s.act!, s.ask].map((r) => voiceText(r)).join(' '))
  // pictures every tablet draws, never the same picture for two roles (taking apart and how many fewer excepted: one kind, two owners)
  for (const e of [s.emoji, s.emoji2, s.emoji3, s.who, s.friend].filter((x): x is string => !!x)) expect(oldEmoji(e), `${e} in ${where}`).toBe(true)
  const roles = [s.emoji, plot === 'fewer' ? undefined : s.emoji2, s.emoji3, s.who, s.friend].filter(Boolean)
  expect(new Set(roles).size, where).toBe(roles.length)
  expectCards(q, where)
}

describe('Story Woods at 1st grade (g1StoryMath)', () => {
  const stages = zoneStages(getZone('word-problem-woods')!, 1)

  it('has the art for every story, and at least 30 new stories over every kind', () => {
    expect(G1_WOODS_STORIES.length).toBeGreaterThanOrEqual(30)
    expect(Object.keys(G1_WOODS_ART).sort()).toEqual(G1_WOODS_STORIES.map((s) => s.id).sort())
    for (const p of G1_WOODS_PLOTS) expect(G1_WOODS_STORIES.filter((s) => s.plot === p).length, p).toBeGreaterThanOrEqual(3)
    for (const s of G1_WOODS_STORIES) {
      const art = G1_WOODS_ART[s.id]
      for (const e of [art.emoji, art.emoji2, art.emoji3, art.who, art.friend].filter((x): x is string => !!x)) expect(oldEmoji(e), `${s.id}: ${e}`).toBe(true)
      // two kinds where the story has two, three where it has three
      if (s.plot === 'together' || s.plot === 'apart' || s.plot === 'compare' || s.plot === 'fewer') expect(art.emoji2, s.id).toBeDefined()
      if (s.plot === 'three') expect(art.emoji2 && art.emoji3, s.id).toBeTruthy()
      // every fixed line and question is in the pack
      expect(lineText(`g1-woods/${s.id}-q`), s.id).toBe(s.ask)
      if (s.plot === 'apart') expect(lineText(`g1-woods/${s.id}-act`), s.id).toBe(s.act)
    }
  })

  it.each(stages.map((s) => [s.id, s] as const))('%s: every story is fair, said aloud, acted out and written as a sentence (many seeds)', (_id, stage) => {
    const cfg = stage.providerConfig as { kind: 'g1StoryMath'; plots: G1WoodsPlot[] }
    for (const seed of SEEDS)
      for (const q of stream(() => makeG1StoryMathProvider(cfg), `woods:${stage.id}:${seed}`, 60)) {
        expectFairStory(q)
        expect(cfg.plots).toContain(q.subtopic!.split(':')[0])
      }
  }, SLOW)

  it('ramps: small numbers first, up to the teens later; every kind of the stage comes up, never twice in a row', () => {
    for (const stage of stages) {
      const cfg = stage.providerConfig as { kind: 'g1StoryMath'; plots: G1WoodsPlot[] }
      const seen = new Set<string>()
      let big = 0
      for (const seed of SEEDS) {
        const qs = round(() => makeG1StoryMathProvider(cfg), `ramp:${stage.id}:${seed}`)
        const plots = qs.map((q) => q.subtopic!.split(':')[0])
        for (let i = 1; i < plots.length; i++) if (cfg.plots.length > 1) expect(plots[i], stage.id).not.toBe(plots[i - 1])
        plots.forEach((p) => seen.add(p))
        const top = (q: ListenProblem) => Math.max(...saidNumbers(q), q.answer as number)
        for (const q of qs.slice(0, 2)) expect(top(q), `${stage.id}: ${q.prompt}`).toBeLessThanOrEqual(13)
        big = Math.max(big, ...qs.map(top))
      }
      expect([...seen].sort(), stage.id).toEqual([...cfg.plots].sort())
      expect(big, stage.id).toBeGreaterThanOrEqual(14)
    }
  })

  it('the stories lay out with things big enough to tap, on a landscape and an upright tablet', () => {
    for (const stage of stages) {
      const cfg = stage.providerConfig as { kind: 'g1StoryMath'; plots: G1WoodsPlot[] }
      for (const seed of SEEDS.slice(0, 10))
        for (const q of round(() => makeG1StoryMathProvider(cfg), `layout:${stage.id}:${seed}`)) {
          const s = storySpec(q)
          // (the scene's box at 1024×528 and at 600×952, after the shell's chrome and the cards: measured in the app)
          for (const [w, h] of [
            [914, 260],
            [570, 533],
          ]) {
            const L = storyLayout(s, w, h)
            expect(L.cell, `${q.prompt} @ ${w}×${h}`).toBeGreaterThanOrEqual(36)
          }
        }
    }
  })
})
