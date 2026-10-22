import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeG1TensProvider, swapped, type G1TensMode } from '../g1Tens'
import { seededRng } from '../../random'
import type { ListenProblem } from '../../../games/listenPlay/types'
import { isTensSpec, tensLines, tensOf, type TensSpec } from '../../../games/listenPlay/activities/tensSpecs'
import { voiceText } from '../../../voice/registry'
import type { VoiceRef } from '../../../voice/types'
import { SKILLS } from '../../../tutoring/skills'
import { buildable, tensCountText, tensOnesSaid } from '../../../voice/packs/g1-tens'
import { g1TensProblems } from './g1Checks'

/**
 * Tens Plateau (1st grade, 1.NBT.1–3, 1.NBT.5): many seeds of every stage,
 * each question checked against what it shows and says (./g1Checks), every
 * line it can say recorded, and the round ramping up as planned.
 */

afterEach(() => vi.restoreAllMocks())
// (many seeds of every stage: a busy machine needs more than the default 5 s)
vi.setConfig({ testTimeout: 60000 })

const MODES: G1TensMode[] = ['tensOnes', 'compare', 'to120']
const SEEDS = 40

function round(mode: G1TensMode, seed: string, n = 12): ListenProblem[] {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(seed))
  const p = makeG1TensProvider({ mode })
  return Array.from({ length: n }, () => p.next())
}

const said = (ref: VoiceRef) => voiceText(ref)

describe.each(MODES)('Tens Plateau provider: %s', (mode) => {
  it('every question is right and fair over many seeds (worked out again from the blocks and the words)', () => {
    for (let s = 0; s < SEEDS; s++) {
      for (const q of round(mode, `g1tens:${mode}:${s}`)) {
        const where = `${q.prompt} ${JSON.stringify(q.activity)}`
        expect(g1TensProblems(q), where).toEqual([])
        expect(q.topic).toBe('g1Tens')
        expect(SKILLS[q.skill!.id], q.skill?.id).toBeDefined()
      }
    }
  })

  it('everything is said: the question (its caption is the prompt), every card, every help line, the praise', () => {
    for (let s = 0; s < 10; s++) {
      for (const q of round(mode, `g1tens-voice:${mode}:${s}`)) {
        expect(said(q.speech!)).toBe(q.prompt)
        expect(isTensSpec(q.activity)).toBe(true)
        for (const ref of tensLines(q.speech, q.activity as TensSpec)) expect(() => said(ref), JSON.stringify(ref)).not.toThrow()
        for (const ref of q.praise ?? []) said(ref)
      }
    }
  })

  it('moves the answer around: never in the same place three times running', () => {
    for (let s = 0; s < 10; s++) {
      // (a build has no cards: the ones around it are still checked as a run)
      const at = round(mode, `g1tens-place:${mode}:${s}`, 30)
        .filter((q) => q.options.length > 0)
        .map((q) => q.options.indexOf(q.answer))
      for (let i = 2; i < at.length; i++) expect(at[i] === at[i - 1] && at[i] === at[i - 2], `positions ${at.slice(i - 2, i + 1)}`).toBe(false)
    }
  })
})

describe('Tens Plateau: each stage ramps up gently', () => {
  const asks = (mode: G1TensMode, seed: string) => round(mode, seed, 6).map((q) => (q.activity as TensSpec).ask ?? 'build')

  it('Tens and ones: how many (scaffolded), build, which shows, how many tens, how many, build', () => {
    for (let s = 0; s < 10; s++) {
      const qs = round('tensOnes', `ramp1:${s}`, 6)
      expect(asks('tensOnes', `ramp1:${s}`)).toEqual(['howMany', 'build', 'shows', 'tensIn', 'howMany', 'build'])
      const first = qs[0].activity as TensSpec
      expect(first.scaffold).toBe(true)
      expect(first.n).toBeLessThanOrEqual(49)
      expect(qs[0].prompt).toBe('How many? Count the tens, then the ones.')
      // builds never end in 0 or 1 ones (every one is a "make" line that is recorded)
      for (const q of qs) if (q.activity?.kind === 'buildTens') expect(buildable(q.answer as number)).toBe(true)
    }
  })

  it('Bigger or smaller: blocks under the numbers to start with; the last sign has none', () => {
    for (let s = 0; s < 10; s++) {
      const qs = round('compare', `ramp2:${s}`, 6)
      expect(asks('compare', `ramp2:${s}`)).toEqual(['bigger', 'tenMore', 'sign', 'smaller', 'tenLess', 'sign'])
      const specs = qs.map((q) => q.activity as TensSpec)
      expect(specs.slice(0, 4).filter((x) => x.ask !== 'tenMore').every((x) => x.scaffold)).toBe(true)
      expect(specs[5].scaffold).toBe(false)
      // the first comparison's tens differ; "smaller" compares the same tens (the ones decide)
      expect(tensOf(specs[0].n)).not.toBe(tensOf(specs[0].m!))
      expect(tensOf(specs[3].n)).toBe(tensOf(specs[3].m!))
    }
  })

  it('Count to 120: crossing a ten first, then past one hundred, with how many, a sign and a ten more or less', () => {
    for (let s = 0; s < 10; s++) {
      const qs = round('to120', `ramp3:${s}`, 6)
      const specs = qs.map((q) => q.activity as TensSpec)
      expect(specs.map((x) => (x.ask === 'tenLess' ? 'tenMore' : x.ask))).toEqual(['next', 'next', 'howMany', 'sign', 'next', 'tenMore'])
      expect(specs[0].n % 10).toBe(0) // 27, 28, 29 → 30
      expect(specs[1].n).toBeGreaterThanOrEqual(100)
      expect(specs[4].n).toBeGreaterThanOrEqual(103)
      expect(specs[4].n).toBeLessThanOrEqual(120)
      expect(specs[2].scaffold).toBe(false)
    }
  })
})

describe('Tens Plateau voice lines', () => {
  it('say tens and ones the way a 1st-grade teacher does', () => {
    expect(tensOnesSaid(36)).toBe('Three tens and six ones: thirty-six.')
    expect(tensOnesSaid(40)).toBe('Four tens: forty.')
    expect(tensOnesSaid(12)).toBe('One ten and two ones: twelve.')
    expect(tensOnesSaid(100)).toBe('Ten tens: one hundred!')
    expect(tensCountText(3)).toBe('Ten, twenty, thirty.')
    expect(tensCountText(1)).toBe('Ten.')
    expect(said({ line: 'g1-tens/next-98' })).toBe('Ninety-eight, ninety-nine, one hundred. What comes next?')
    expect(said({ line: 'g1-tens/make-36' })).toBe('Make thirty-six: three tens and six ones! Then tap the check.')
    expect(said({ template: 'g1-tens/number', slots: { n: 120 } })).toBe('120!')
  })

  it('swapping the digits makes another two-digit number, or nothing', () => {
    expect(swapped(36)).toBe(63)
    expect(swapped(40)).toBeNull()
    expect(swapped(44)).toBeNull()
    expect(swapped(91)).toBe(19)
  })
})
