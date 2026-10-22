import { afterEach, describe, expect, it, vi } from 'vitest'
import { curriculum, zoneStages } from '../../../curriculum'
import { createProvider, type ProviderConfig } from '..'
import { seededRng } from '../../random'
import type { Picture, ProblemAnswer } from '../../problem'
import type { ListenProblem } from '../../../games/listenPlay/types'
import { cardsFor, hasPicturePanel, questionSteps, walkthroughCounts } from '../../../games/listenPlay/script'
import { voiceText } from '../../../voice/registry'
import type { VoiceRef } from '../../../voice/types'
import { phraseIndex } from '../../../tutoring/motion/cues'
import { SKILLS } from '../../../tutoring/skills'
import { K_SHAPES } from '../../../voice/packs/k-shapes'
import { DRAWINGS } from '../../../games/listenPlay/drawings'

/**
 * The kindergarten (Listen & Play) contract, for every K–1 stage config in
 * the curriculum and a few extra shapes of each provider: a child who can't
 * read gets a fair, spoken, picture question every time.
 */

const DRAWS = 300

/** Every distinct K provider config the K–1 stage sets use, plus the providers' other modes. */
function kConfigs(): { label: string; config: ProviderConfig }[] {
  const seen = new Map<string, { label: string; config: ProviderConfig }>()
  for (const zone of curriculum.zones) {
    for (const stage of zoneStages(zone, 0)) {
      const c = stage.providerConfig
      if (c.kind === 'kCounting' || c.kind === 'kShapes' || c.kind === 'kLetters') seen.set(JSON.stringify(c), { label: stage.id, config: c })
      // (phase 2a: Nature Summit and Counting Towers)
      if (c.kind === 'kScience' || c.kind === 'kTowers') seen.set(JSON.stringify(c), { label: stage.id, config: c })
    }
  }
  const extra: ProviderConfig[] = [
    { kind: 'kCounting' },
    { kind: 'kCounting', mode: 'count', min: 11, max: 20 },
    { kind: 'kCounting', mode: 'count', min: 1, max: 5, choices: 2 },
    { kind: 'kCounting', mode: 'compare', min: 1, max: 20 },
    { kind: 'kShapes', mode: 'name2d', choices: 2 },
    { kind: 'kShapes', mode: 'flatSolid', choices: 2 },
    { kind: 'kShapes', mode: 'hunt', choices: 2 },
    { kind: 'kLetters', mode: 'findUpper', choices: 2 },
    { kind: 'kLetters', mode: 'matchCase', confusablesAfter: 0 },
    { kind: 'kLetters', mode: 'firstSound', choices: 2 },
  ]
  for (const c of extra) if (!seen.has(JSON.stringify(c))) seen.set(JSON.stringify(c), { label: JSON.stringify(c), config: c })
  return [...seen.values()]
}

afterEach(() => vi.restoreAllMocks())

/** The card questions (a question answered by an activity, like Count with me's last trace, has its own tests). */
function draw(config: ProviderConfig, seed: string, n = DRAWS): ListenProblem[] {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(seed))
  const p = createProvider(config)
  const out: ListenProblem[] = []
  for (let i = 0; i < n; i++) out.push(p.next() as ListenProblem)
  return out.filter((q) => !q.activity)
}

const resolves = (ref: VoiceRef | null | undefined): string => {
  expect(ref).toBeTruthy()
  return voiceText(ref!)
}

/** A picture the kit can draw, with sane values. */
function pictureProblems(pic: Picture): string[] {
  switch (pic.kind) {
    case 'numeral':
      return Number.isInteger(pic.n) && pic.n >= 0 && pic.n <= 20 ? [] : [`numeral ${pic.n}`]
    case 'group':
      return Number.isInteger(pic.count) && pic.count >= 1 && pic.count <= 20 && !!pic.emoji ? [] : [`group ${pic.count} ${pic.emoji}`]
    case 'shape': {
      const errs: string[] = []
      if (!(K_SHAPES as readonly string[]).includes(pic.shape)) errs.push(`shape ${pic.shape} isn't a K shape`)
      if (pic.color !== undefined && !(Number.isInteger(pic.color) && pic.color >= 0 && pic.color < 8)) errs.push(`colour ${pic.color}`)
      if (pic.turn !== undefined && (Math.abs(pic.turn) % 90 === 45 || Math.abs(pic.turn) > 360)) errs.push(`turn ${pic.turn}`)
      return errs
    }
    case 'letter':
      return /^(?:[A-Za-z]|[A-Z][a-z])$/.test(pic.ch) ? [] : [`letter ${pic.ch}`]
    case 'art':
      return DRAWINGS[pic.name] ? [] : [`no drawing "${pic.name}"`]
    case 'emoji':
      // one picture, no ZWJ sequence or flag (they draw as several on older tablets)
      return pic.emoji && !/‍/.test(pic.emoji) && !/[\u{1F1E6}-\u{1F1FF}]/u.test(pic.emoji) && [...pic.emoji.replace(/️/g, '')].length === 1 ? [] : [`emoji ${pic.emoji}`]
    default:
      return [`a K card shouldn't be a ${pic.kind}`]
  }
}

describe.each(kConfigs())('Listen & Play content: $label', ({ config, label }) => {
  const items = () => draw(config, `k-listen:${label}`)

  it('every question is fair: the answer once among 2–3 unique options, one picture per option', () => {
    for (const q of items()) {
      const where = `${q.prompt} ${JSON.stringify(q.options)} → ${q.answer}`
      expect(q.options.length, where).toBeGreaterThanOrEqual(2)
      expect(q.options.length, where).toBeLessThanOrEqual(3)
      expect(new Set(q.options.map((o) => String(o).toLowerCase())).size, where).toBe(q.options.length)
      expect(q.options.filter((o) => o === q.answer), where).toHaveLength(1)
      expect(q.pictureOptions!.map((o) => o.value), where).toEqual(q.options)
      // what a card shows tells the cards apart
      expect(new Set(q.pictureOptions!.map((o) => JSON.stringify({ ...o.picture, color: undefined, turn: undefined }))).size, where).toBe(q.options.length)
      for (const o of q.pictureOptions!) expect(pictureProblems(o.picture), where).toEqual([])
      if (q.picture) expect(pictureProblems(q.picture), where).toEqual([])
      for (const pic of q.pair ?? []) expect(pictureProblems(pic), where).toEqual([])
      expect(q.prompt, where).not.toMatch(/undefined|NaN|\{|\s{2}/)
      expect(SKILLS[q.skill!.id], `${q.skill?.id} is a registered skill`).toBeDefined()
    }
  })

  it('everything is said: the question, every card, every note and praise line resolves', () => {
    for (const q of items()) {
      const said = resolves(q.speech)
      // the caption is the prompt (plus "Tap the number."-style tails)
      expect(said.startsWith(q.prompt.replace(/\.$/, '')), `${said} / ${q.prompt}`).toBe(true)
      for (const o of q.pictureOptions!) resolves(o.speech)
      for (const n of q.notes ?? []) if (n) resolves(n)
      for (const p of q.praise ?? []) resolves(p)
      expect(q.notes === undefined || q.notes.length === q.options.length).toBe(true)
      // a note is about a wrong card, never the answer
      q.notes?.forEach((n, i) => {
        if (q.options[i] === q.answer) expect(n).toBeNull()
      })
    }
  })

  it('the guide can follow every cue: phrases of the line, cards that exist', () => {
    for (const q of items()) {
      const said = voiceText(q.speech!)
      for (const c of q.cues ?? []) {
        if (typeof c.cue === 'string') expect(phraseIndex(said, c.cue), `"${c.cue}" in "${said}"`).toBeGreaterThanOrEqual(0)
        if (c.target.startsWith('card') && c.target !== 'cards') expect(Number(c.target.slice(4))).toBeLessThan(q.options.length)
        if (c.target === 'picture') expect(hasPicturePanel(q)).toBe(true)
      }
      const open = q.options.map((_, i) => i)
      const steps = questionSteps(q, open)
      expect(steps[0].voice).toEqual(q.speech)
      // every wrong card has a walkthrough plan that the kit can run
      cardsFor(q).forEach((c, i) => {
        if (c.value === q.answer) return
        for (const plan of walkthroughCounts(q, cardsFor(q), i, open)) {
          expect(plan.count).toBeGreaterThan(0)
          expect(plan.count).toBeLessThanOrEqual(20)
        }
      })
    }
  })

  it('never asks the same question twice in a row, and moves the answer around', () => {
    const qs = items()
    const at: number[] = []
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i]
      const sig = (p: ListenProblem) => `${p.prompt}|${JSON.stringify(p.pair ?? p.picture ?? null)}|${JSON.stringify(p.options)}`
      if (i > 0) expect(sig(q), `item ${i}`).not.toBe(sig(qs[i - 1]))
      at.push(q.options.indexOf(q.answer as ProblemAnswer))
    }
    // never in the same place three times running (yes / no keeps 👍 first: the answer moves with it)
    for (let i = 2; i < at.length; i++) expect(at[i] === at[i - 1] && at[i] === at[i - 2], `positions ${at.slice(i - 2, i + 1)}`).toBe(false)
    // and every place gets used (among the questions that have it: a stage can mix two- and three-card questions)
    const places = Math.max(...qs.map((q) => q.options.length))
    for (let k = 0; k < places; k++) expect(at.filter((x) => x === k).length, `answer at card ${k}`).toBeGreaterThan(qs.filter((q) => q.options.length > k).length * 0.15)
  })
})
