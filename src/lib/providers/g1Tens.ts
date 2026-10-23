import type { ProblemProvider } from '../problem'
import type { ListenProblem } from '../../games/listenPlay/types'
import { signFor, tensAnswer, tensOf, onesOf, TENS_SIGNS, type BuildTensSpec, type G1TensActivitySpec, type TensAsk, type TensSpec } from '../../games/listenPlay/activities/tensSpecs'
import { G1_COUNT_MAX, G1_NEXT_FIRST, G1_TEN_LESS_MIN, G1_TEN_MORE_MAX, G1_TENS_MAX, G1_TENS_MIN, buildable } from '../../voice/packs/g1-tens'
import { voiceText } from '../../voice/registry'
import type { VoiceRef } from '../../voice/types'
import { randInt } from '../random'
import { makePositionGuard, pickOne } from './kShared'

/**
 * 1st grade place value (Tens Plateau; 1.NBT.1–3, 1.NBT.5), voice-first, for
 * the Listen & Play shell. A rod is a ten and a cube is a one; every question
 * is answered through the `tens` and `buildTens` activities
 * (src/games/listenPlay/activities, see ./tensSpecs there):
 *
 * - `tensOnes` ("Tens and ones", the concept): how many rods and cubes, make a
 *   number on the mat, which blocks show a number, how many tens in a number;
 * - `compare` ("Bigger or smaller", practice): which number is bigger or
 *   smaller, the sign > < = that fits (blocks under the numbers to start
 *   with), ten more and ten less;
 * - `to120` ("Count to 120", the mastery): what comes next, past 100 and up to
 *   120, plus how many, comparing and ten more / less without the blocks'
 *   help.
 *
 * Wrong cards are the mistakes a 1st grader makes: the digits swapped (63 for
 * 36), a ten off (46), one more instead of ten more (35 for 44), the decade
 * counted wrong (60 or 80 after 69), 102 for 120.
 */

export type G1TensMode = 'tensOnes' | 'compare' | 'to120'

export interface G1TensConfig {
  mode?: G1TensMode
}

type Item =
  | { q: 'howMany'; lo: number; hi: number; scaffold: boolean }
  | { q: 'build'; lo: number; hi: number }
  | { q: 'shows' | 'tensIn'; lo: number; hi: number }
  | { q: 'tenMore' | 'tenLess'; lo: number; hi: number }
  | { q: 'tenEither'; lo: number; hi: number }
  | { q: 'bigger' | 'smaller' | 'sign'; pair: 'tens' | 'ones' | 'swap' | 'any'; scaffold: boolean }
  /** decade: the answer is a ten (69 → 70: the count crosses into the next ten). */
  | { q: 'next'; lo: number; hi: number; decade?: boolean }

const PLAN: Record<G1TensMode, Item[]> = {
  tensOnes: [
    { q: 'howMany', lo: 21, hi: 49, scaffold: true },
    { q: 'build', lo: 21, hi: 59 },
    { q: 'shows', lo: 23, hi: 69 },
    { q: 'tensIn', lo: 24, hi: 79 },
    { q: 'howMany', lo: 41, hi: 89, scaffold: true },
    { q: 'build', lo: 51, hi: 98 },
  ],
  compare: [
    { q: 'bigger', pair: 'tens', scaffold: true },
    { q: 'tenMore', lo: 21, hi: 69 },
    { q: 'sign', pair: 'tens', scaffold: true },
    { q: 'smaller', pair: 'ones', scaffold: true },
    { q: 'tenLess', lo: 31, hi: 89 },
    { q: 'sign', pair: 'any', scaffold: false },
  ],
  to120: [
    { q: 'next', lo: 27, hi: 97, decade: true },
    { q: 'next', lo: 97, hi: 117 },
    { q: 'howMany', lo: 11, hi: 99, scaffold: false },
    { q: 'sign', pair: 'swap', scaffold: false },
    { q: 'next', lo: 100, hi: G1_COUNT_MAX - 3 },
    { q: 'tenEither', lo: 21, hi: 89 },
  ],
}

const SKILL = {
  tensOnes: { id: 'g1-tens-ones', label: 'tens and ones' },
  compare: { id: 'g1-compare-2digit', label: 'comparing two-digit numbers' },
  tenMore: { id: 'g1-ten-more-less', label: 'ten more and ten less' },
  count: { id: 'g1-count-120', label: 'counting to 120' },
} as const

const PRAISE: VoiceRef[] = [{ line: 'g1-tens/tensPro' }, { line: 'g1-tens/bigNumbers' }]

/** 36 → 63; null when swapping makes no other two-digit number (40 → 4, 44 → 44). */
export function swapped(n: number): number | null {
  const t = tensOf(n)
  const o = onesOf(n)
  return o === 0 || o === t ? null : o * 10 + t
}

/** A ten off: ten more, or ten less when that would leave two digits. */
const tenOff = (n: number) => (n + 10 <= G1_TENS_MAX ? n + 10 : n - 10)

export function makeG1TensProvider(cfg: G1TensConfig = {}): Omit<ProblemProvider, 'next'> & { next(): ListenProblem } {
  const mode = cfg.mode ?? 'tensOnes'
  const plan = PLAN[mode]
  const places = makePositionGuard()
  let asked = 0
  let serial = 0
  let lastN = -1

  /** The numbers this round has asked about: a round never asks about one twice (while others fit). */
  const used = new Set<number>()

  /** A number in [lo, hi], not the last one asked (nor, mostly, one this round asked), passing `ok` (when one can). */
  function pickN(lo: number, hi: number, ok: (n: number) => boolean = () => true): number {
    for (let tries = 0; tries < 60; tries++) {
      const n = randInt(lo, hi)
      if (n !== lastN && ok(n) && (tries >= 40 || !used.has(n))) {
        lastN = n
        used.add(n)
        return n
      }
    }
    const n = randInt(lo, hi)
    lastN = n
    return n
  }

  const problem = (subtopic: TensAsk | 'build', skill: keyof typeof SKILL, speech: VoiceRef, spec: G1TensActivitySpec, options: (number | string)[]): ListenProblem => ({
    id: `g1tens-${serial++}`,
    topic: 'g1Tens',
    subtopic,
    difficulty: spec.n,
    skill: SKILL[skill],
    praise: PRAISE,
    speech,
    prompt: voiceText(speech),
    options,
    answer: tensAnswer(spec),
    activity: spec,
  })

  /** Three different numeral cards: the answer and two near misses, arranged so the answer moves around. */
  function numeralCards(answer: number, misses: number[]): number[] {
    const out = [answer]
    for (const m of misses) if (!out.includes(m) && m >= 0 && m <= G1_COUNT_MAX) out.push(m)
    // (a fallback never needed by the plans above: one more, one less)
    for (let d = 1; out.length < 3; d++) for (const m of [answer + d, answer - d]) if (out.length < 3 && !out.includes(m) && m >= 1 && m <= G1_COUNT_MAX) out.push(m)
    return places.arrange(out, answer)
  }

  function make(it: Item): ListenProblem {
    switch (it.q) {
      case 'howMany': {
        const n = pickN(it.lo, it.hi, (x) => swapped(x) !== null)
        const cards = numeralCards(n, [swapped(n) ?? n + 1, tenOff(n)])
        const spec: TensSpec = { kind: 'tens', ask: 'howMany', n, cards, scaffold: it.scaffold }
        return problem('howMany', 'tensOnes', { line: it.scaffold ? 'g1-tens/howMany' : 'g1-tens/howManyPlain' }, spec, cards)
      }
      case 'build': {
        const n = pickN(Math.max(G1_TENS_MIN, it.lo), Math.min(G1_TENS_MAX, it.hi), buildable)
        const spec: BuildTensSpec = { kind: 'buildTens', n }
        // (answered by building it and ✓: the activity checks the blocks)
        // "Make thirty-six!": the tens and ones are said only as help, after a miss (BuildTens)
        return problem('build', 'tensOnes', { template: 'g1-tens/makeIt', slots: { n } }, spec, [])
      }
      case 'shows': {
        const n = pickN(it.lo, it.hi, (x) => swapped(x) !== null)
        const cards = numeralCards(n, [swapped(n)!, tenOff(n)])
        const spec: TensSpec = { kind: 'tens', ask: 'shows', n, cards }
        return problem('shows', 'tensOnes', { template: 'g1-tens/shows', slots: { n } }, spec, cards)
      }
      case 'tensIn': {
        const n = pickN(it.lo, it.hi, (x) => onesOf(x) !== 0 && onesOf(x) !== tensOf(x))
        const t = tensOf(n)
        const cards = places.arrange([t, onesOf(n), t * 10], t)
        const spec: TensSpec = { kind: 'tens', ask: 'tensIn', n, cards }
        return problem('tensIn', 'tensOnes', { template: 'g1-tens/tensIn', slots: { n } }, spec, cards)
      }
      case 'tenMore':
      case 'tenLess':
      case 'tenEither': {
        const ask = it.q === 'tenEither' ? pickOne(['tenMore', 'tenLess'] as const) : it.q
        const lo = Math.max(it.lo, ask === 'tenLess' ? G1_TEN_LESS_MIN : G1_TENS_MIN)
        const hi = Math.min(it.hi, ask === 'tenMore' ? G1_TEN_MORE_MAX : G1_TENS_MAX)
        // (the ones never 0: "ten more than 40" is the K count by tens; and not the same as the tens, so 1 more ≠ 10 more as numerals look)
        const n = pickN(lo, hi, (x) => onesOf(x) !== 0)
        const want = ask === 'tenMore' ? n + 10 : n - 10
        const cards = numeralCards(want, ask === 'tenMore' ? [n + 1, n - 10] : [n - 1, n + 10])
        const spec: TensSpec = { kind: 'tens', ask, n, cards }
        return problem(ask, 'tenMore', { template: `g1-tens/${ask}`, slots: { n } }, spec, cards)
      }
      case 'bigger':
      case 'smaller':
      case 'sign': {
        let [a, b] = pair(it.pair, it.q === 'sign')
        if (it.q === 'sign') {
          // (the signs keep their order, > < =: the numbers swap sides instead, to move the answer around)
          if (places.wouldRepeat(TENS_SIGNS.indexOf(signFor(a, b)))) [a, b] = [b, a]
          const spec: TensSpec = { kind: 'tens', ask: 'sign', n: a, m: b, cards: TENS_SIGNS, scaffold: it.scaffold }
          return problem('sign', 'compare', { line: 'g1-tens/sign' }, spec, [...TENS_SIGNS])
        }
        // the bigger one first or second, by the position guard
        const cards = places.arrange([a, b], it.q === 'bigger' ? Math.max(a, b) : Math.min(a, b))
        const spec: TensSpec = { kind: 'tens', ask: it.q, n: cards[0], m: cards[1], cards, scaffold: it.scaffold }
        return problem(it.q, 'compare', { line: `g1-tens/${it.q}` }, spec, cards)
      }
      case 'next': {
        // the three said start at `a`; the answer is a + 3
        const a = pickN(Math.max(G1_NEXT_FIRST, it.lo), Math.min(G1_COUNT_MAX - 3, it.hi), (x) => !it.decade || (x + 3) % 10 === 0)
        const n = a + 3
        const misses = n === G1_COUNT_MAX ? [110, 102] : n % 10 === 0 ? [n - 10, n + 10] : [n + 1, n - 1]
        const cards = numeralCards(n, misses)
        const spec: TensSpec = { kind: 'tens', ask: 'next', n, cards }
        return problem('next', 'count', { line: `g1-tens/next-${a}` }, spec, cards)
      }
    }
  }

  /** Two numbers to compare: tens that differ, the same tens (the ones decide), digits swapped, or any (now and then the same number). */
  function pair(kind: 'tens' | 'ones' | 'swap' | 'any', signs: boolean): [number, number] {
    if (kind === 'any' && signs && randInt(1, 5) === 1) {
      const n = pickN(G1_TENS_MIN, G1_TENS_MAX, (x) => onesOf(x) !== 0)
      return [n, n]
    }
    const k = kind === 'any' ? pickOne(['tens', 'ones', 'swap'] as const) : kind
    for (let tries = 0; tries < 80; tries++) {
      const a = pickN(G1_TENS_MIN + 1, G1_TENS_MAX)
      let b: number
      if (k === 'swap') {
        const s = swapped(a)
        if (s === null || s < G1_TENS_MIN) continue
        b = s
      } else if (k === 'ones') {
        b = tensOf(a) * 10 + randInt(1, 9)
      } else {
        b = randInt(2, 9) * 10 + randInt(0, 9)
      }
      if (b === a || b < G1_TENS_MIN || b > G1_TENS_MAX) continue
      if (k === 'tens' && tensOf(a) === tensOf(b)) continue
      if (k === 'ones' && onesOf(a) === 0 && onesOf(b) === 0) continue
      return [a, b]
    }
    return [42, 24]
  }

  return {
    topic: 'g1Tens',
    reset() {
      asked = 0
      serial = 0
      lastN = -1
      used.clear()
      places.reset()
    },
    next(): ListenProblem {
      const i = asked < plan.length ? asked : Math.floor(plan.length / 2) + ((asked - plan.length) % Math.ceil(plan.length / 2))
      asked++
      const p = make(plan[i])
      const at = p.options.indexOf(p.answer)
      if (at >= 0) places.note(at)
      return p
    },
  }
}

