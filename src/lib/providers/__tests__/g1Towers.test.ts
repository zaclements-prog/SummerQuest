import { afterEach, describe, expect, it, vi } from 'vitest'
import { getZone, zoneStages } from '../../../curriculum'
import { createProvider } from '..'
import { factDistractors, makeG1TowersProvider, type G1TowersConfig } from '../g1Towers'
import { seededRng } from '../../random'
import { numberWord } from '../../numberWords'
import { voiceText } from '../../../voice/registry'
import { ADD_10, ADD_20, ALL_FACTS, SUB_10, SUB_20, factAnswer, factStrategy, type G1Fact } from '../../../voice/packs/g1-towers'
import { cardsFor, hasPicturePanel, questionSteps } from '../../../games/listenPlay/script'
import type { ListenProblem } from '../../../games/listenPlay/types'
import { phraseIndex } from '../../../tutoring/motion/cues'
import { SKILLS } from '../../../tutoring/skills'

/**
 * Counting Towers for 1st grade (phase-2b contract: + and − within 20): the
 * questions that build the towers, fuzzed over many seeds. A number sentence
 * said aloud and shown ("3 + 4"), three numeral cards with the answer once,
 * near misses as the wrong ones, and a strategy that really gets there.
 */

afterEach(() => vi.restoreAllMocks())

const SEEDS = 'abcdefghijkl'.split('')

function run(cfg: G1TowersConfig, seed: string, n: number): ListenProblem[] {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(`g1towers:${cfg.mode}:${seed}`))
  const p = makeG1TowersProvider(cfg)
  return Array.from({ length: n }, () => p.next())
}

/** The fact a question asks, read back from the number sentence it shows. */
function factOf(q: ListenProblem): G1Fact {
  const m = /^(\d+) ([+−]) (\d+)$/.exec((q.picture as { text: string }).text)
  expect(m, JSON.stringify(q.picture)).not.toBeNull()
  return { op: m![2] === '+' ? '+' : '-', a: Number(m![1]), b: Number(m![3]) }
}

const words = (s: string) => s.match(/[a-z]+(?:-[a-z]+)?/gi) ?? []

describe('the facts', { timeout: 30_000 }, () => {
  it('within 10, then past ten: every answer 0–20, never a negative, never all taken away', () => {
    expect(ADD_10).toHaveLength(45)
    expect(SUB_10).toHaveLength(45)
    expect(ADD_20).toHaveLength(55)
    expect(SUB_20).toHaveLength(55)
    for (const f of ADD_10) expect(f.a + f.b).toBeLessThanOrEqual(10)
    for (const f of SUB_10) expect(f.a <= 10 && f.a - f.b >= 1).toBe(true)
    for (const f of ADD_20) expect(f.a + f.b >= 11 && f.a + f.b <= 20 && f.a <= 10 && f.b <= 10).toBe(true)
    for (const f of SUB_20) expect(f.a >= 11 && f.a <= 20 && f.b <= 10 && f.a - f.b <= 10 && f.a - f.b >= 1).toBe(true)
  })

  it('each strategy gets to the answer: count on from the bigger number, count back, or count up', () => {
    for (const f of ALL_FACTS) {
      const s = factStrategy(f)
      const ans = factAnswer(f)
      expect(voiceText({ line: `g1-towers/how-${f.op === '+' ? 'add' : 'sub'}-${f.a}-${f.b}` })).toBe(s)
      const counted = words(s.split(':')[1]).filter((w) => w !== 'That' && w !== 's')
      if (f.op === '+') {
        // "Start at seven. Count on two: eight, nine!" — as many steps as the smaller number, ending on the answer
        expect(s).toMatch(new RegExp(`^Start at ${numberWord(Math.max(f.a, f.b))}\\.`))
        expect(counted.length, s).toBe(Math.min(f.a, f.b))
        expect(counted.at(-1), s).toBe(numberWord(ans))
      } else if (s.startsWith('Start')) {
        expect(counted.length, s).toBe(f.b)
        expect(counted.at(-1), s).toBe(numberWord(ans))
      } else {
        // "Count up from seven to nine: eight, nine. That's two!"
        expect(s).toMatch(new RegExp(`That's ${numberWord(ans)}!$`))
        expect(words(s.split(':')[1].split('.')[0]).length, s).toBe(ans)
      }
    }
  })

  it('wrong cards are near misses (and, taking away, the two numbers added), 0–20, all different', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRng('distractors'))
    for (let k = 0; k < 4; k++)
      for (const f of ALL_FACTS) {
        const ans = factAnswer(f)
        const d = factDistractors(f)
        expect(d, JSON.stringify(f)).toHaveLength(2)
        expect(new Set([ans, ...d]).size).toBe(3)
        for (const n of d) {
          expect(n >= 0 && n <= 20).toBe(true)
          expect(Math.abs(n - ans) <= 2 || (f.op === '-' && n === f.a + f.b), `${JSON.stringify(f)}: ${n}`).toBe(true)
        }
      }
  })
})

describe.each([
  ['g1-towers-1', 'add10'],
  ['g1-towers-2', 'sub10'],
  ['g1-towers-3', 'mix20'],
] as const)('%s', (stageId, mode) => {
  const stage = zoneStages(getZone('tower-battlefront')!, 1).find((s) => s.id === stageId)!

  it('is the tower game in its K–1 mode, built with + and − questions', () => {
    expect(stage.gameId).toBe('towerDefense')
    expect(stage.params?.listen).toBe(true)
    expect(stage.providerConfig).toEqual({ kind: 'g1Towers', mode })
    expect(createProvider(stage.providerConfig).topic).toBe('g1Towers')
  })

  it('every question: the number sentence shown and said, three numeral cards, the answer once; a miss hears the strategy', () => {
    for (const seed of SEEDS)
      for (const q of run(stage.providerConfig as G1TowersConfig, seed, 30)) {
        const f = factOf(q)
        const ans = factAnswer(f)
        const w = `${q.prompt} ${JSON.stringify(q.options)} → ${q.answer}`
        expect(q.answer, w).toBe(ans)
        expect(voiceText(q.speech!), w).toBe(q.prompt)
        expect(q.prompt, w).toBe(`${numberWord(f.a)[0].toUpperCase()}${numberWord(f.a).slice(1)} ${f.op === '+' ? 'plus' : 'minus'} ${numberWord(f.b)}. Tap the answer.`)
        expect(q.options).toHaveLength(3)
        expect(new Set(q.options).size).toBe(3)
        expect(q.options.filter((o) => o === ans)).toHaveLength(1)
        expect(cardsFor(q).every((c) => c.picture.kind === 'numeral' && voiceText(c.speech!) === `${c.value}!`)).toBe(true)
        expect(hasPicturePanel(q)).toBe(true)
        expect(SKILLS[q.skill!.id]).toMatchObject({ zoneId: 'tower-battlefront', lessonId: 'kTowers' })
        for (const p of q.praise ?? []) voiceText(p)
        // a miss: the strategy, or for ten and some more just that ("Ten and nine more is nineteen.")
        const tenAnd = f.op === '+' && (f.a === 10 || f.b === 10)
        const note = tenAnd ? `Ten and ${numberWord(f.a === 10 ? f.b : f.a)} more is ${numberWord(ans)}.` : factStrategy(f)
        q.notes!.forEach((n, i) => (q.options[i] === ans ? expect(n).toBeNull() : expect(voiceText(n!)).toBe(note)))
        // …with the counters in ten-frames shown: the start and the ones counted on, or the ones taken crossed out
        expect(q.helpPicture).toEqual(f.op === '+' ? { kind: 'tenFrame', count: ans, split: Math.max(f.a, f.b) } : { kind: 'tenFrame', count: f.a, gone: f.b })
        for (const c of q.cues ?? []) if (typeof c.cue === 'string') expect(phraseIndex(q.prompt, c.cue)).toBeGreaterThanOrEqual(0)
        expect(questionSteps(q, [0, 1, 2]).map((s) => s.target)).toEqual(['lp-picture', ['lp-card-0', 'lp-card-1', 'lp-card-2']])
        // only numbers and signs on screen
        expect((q.picture as { text: string }).text).toMatch(/^[\d +−]+$/)
        if (mode === 'add10') expect(f.op === '+' && ans <= 10).toBe(true)
        if (mode === 'sub10') expect(f.op === '-' && f.a <= 10).toBe(true)
        if (mode === 'mix20') expect(ans).toBeLessThanOrEqual(20)
      }
  })

  it('ramps through the stage, never asks the same fact twice running, and moves the answer', () => {
    for (const seed of SEEDS) {
      const qs = run(stage.providerConfig as G1TowersConfig, seed, 40)
      const fs = qs.map(factOf)
      for (let i = 1; i < fs.length; i++) expect(JSON.stringify(fs[i]) === JSON.stringify(fs[i - 1]), `item ${i}`).toBe(false)
      if (mode !== 'mix20') {
        // small numbers to add on (or take away) first: 2 or less, then 3 or less
        expect(fs.slice(0, 2).every((f) => f.b <= 2)).toBe(true)
        expect(fs.slice(2, 4).every((f) => f.b <= 3)).toBe(true)
      } else {
        expect(fs.slice(0, 2).every((f) => factAnswer(f) <= 10)).toBe(true)
        // then past ten, taking turns (never three of one kind in a row)
        expect(fs.slice(2).every((f) => (f.op === '+' ? f.a + f.b > 10 : f.a > 10))).toBe(true)
        for (let i = 2; i < fs.length; i++) expect(fs[i].op === fs[i - 1].op && fs[i].op === fs[i - 2].op, `ops at ${i}`).toBe(false)
      }
      const at = qs.map((q) => q.options.indexOf(q.answer))
      for (let i = 2; i < at.length; i++) expect(at[i] === at[i - 1] && at[i] === at[i - 2]).toBe(false)
      for (let k = 0; k < 3; k++) expect(at.filter((x) => x === k).length).toBeGreaterThan(4)
    }
  })
})
