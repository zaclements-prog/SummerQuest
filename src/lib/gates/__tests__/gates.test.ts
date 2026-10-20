import { describe, expect, it } from 'vitest'
import { seededRng } from '../../random'
import { isInteger } from '../../numbers'
import {
  OP_SETS,
  applyOp,
  bestSide,
  decide,
  detectTrap,
  makeGatePair,
  maxFactorFor,
  minGap,
  opSetFor,
  pairKey,
  scaffoldCheck,
  smartTally,
  type GatePair,
  type GateState,
  type OpSetId,
} from '..'

/**
 * Property tests: thousands of seeded states per band, every guarantee checked
 * on every pair (docs/superpowers/specs/2026-10-19-trending-games-plan.md,
 * "Shared foundation": whole results, the declared winner really is better,
 * traps and ties at their rates, sides balanced, no repeated pair back to back).
 */

const SETS = Object.keys(OP_SETS) as OpSetId[]
const PER_SET = 4000

/**
 * Realistic states for each band: counts from the floor up to where a growing
 * parade is full (log-uniform, like a level's doubling climb).
 */
function randomState(set: OpSetId, r: () => number, i: number): GateState {
  const cfg = OP_SETS[set]
  const ri = (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1))
  const floor = set === 'addSub' ? ri(1, 3) : ri(2, 6)
  const hi: Record<OpSetId, number> = { addSub: 17, mulAdd: 100, divSub: 96, mulFrac: 150, fracDec: 499 }
  const top = Math.min(cfg.cap - 3, hi[set])
  const count = Math.min(top, Math.max(floor, Math.round(floor * Math.pow(top / floor, r()))))
  return {
    count,
    opSet: set,
    floor,
    ceiling: r() < 0.5 ? undefined : ri(count, cfg.cap),
    difficulty: ri(0, 2) as 0 | 1 | 2,
    index: i,
    prevKey: null,
    seed: `prop-${set}-${i}`,
    maxFactor: r() < 0.3 ? 5 : undefined,
    cap: set === 'mulAdd' && r() < 0.5 ? 100 : undefined,
  }
}

function checkPair(s: GateState, p: GatePair) {
  const cfg = OP_SETS[s.opSet]
  const cap = Math.min(cfg.cap, s.cap ?? cfg.cap)
  const ctx = `${s.opSet} count ${s.count} floor ${s.floor}: ${p.left.label}=${p.left.result} | ${p.right.label}=${p.right.result}`
  for (const g of [p.left, p.right]) {
    // whole numbers only, and the label's operation really gives that result
    const exact = applyOp(g.op, s.count)
    expect(isInteger(exact), ctx).toBe(true)
    expect(exact.n, ctx).toBe(g.result)
    expect(g.result, ctx).toBeGreaterThanOrEqual(Math.max(0, s.floor))
    expect(g.result, ctx).toBeLessThanOrEqual(cap)
    expect(g.label.length, ctx).toBeGreaterThan(0)
    expect(g.speech.length, ctx).toBeGreaterThan(0)
  }
  // never two identical gates
  expect(p.left.label === p.right.label && p.left.sub === p.right.sub, ctx).toBe(false)
  // the declared winner really is better (ties are exactly equal)
  if (p.winner === 'tie') expect(p.left.result, ctx).toBe(p.right.result)
  else {
    const w = p.winner === 'left' ? p.left : p.right
    const l = p.winner === 'left' ? p.right : p.left
    expect(w.result, ctx).toBeGreaterThan(l.result)
    expect(p.gap, ctx).toBe(w.result - l.result)
    // the minimum gap for the difficulty (fallback pairs only promise a winner)
    if (p.maker !== 'fallback') {
      expect(p.gap, ctx).toBeGreaterThanOrEqual(minGap(cfg, s.difficulty, w.result))
      expect(p.gap, ctx).toBeLessThanOrEqual(cfg.maxRel[s.difficulty] * w.result)
    }
    expect(p.trap, ctx).toBe(detectTrap(w.op, l.op))
  }
  expect(p.key).toBe(pairKey(p.left.op, p.right.op))
  expect(p.goal).toBe(p.left.result < s.count && p.right.result < s.count ? 'keep' : 'more')
}

describe('gate engine: every guarantee on thousands of seeded states', () => {
  for (const set of SETS) {
    it(`${set}: whole results, floor, cap, honest winner, gap, trap labels`, () => {
      const r = seededRng(`states-${set}`)
      for (let i = 0; i < PER_SET; i++) {
        const s = randomState(set, r, i)
        checkPair(s, makeGatePair(s))
      }
    })
  }

  it('is deterministic: the same state gives the same pair', () => {
    const r = seededRng('det')
    for (let i = 0; i < 500; i++) {
      const s = randomState(SETS[i % SETS.length], r, i)
      expect(makeGatePair(s)).toEqual(makeGatePair({ ...s }))
    }
  })
})

describe('gate engine: rates and balance', () => {
  for (const set of SETS) {
    it(`${set}: ties and traps at the set rate, winner side ~50/50, few fallbacks`, () => {
      const cfg = OP_SETS[set]
      const r = seededRng(`rates-${set}`)
      let ties = 0
      let traps = 0
      let left = 0
      let decided = 0
      let fallbacks = 0
      for (let i = 0; i < PER_SET; i++) {
        const s = randomState(set, r, i)
        const p = makeGatePair(s)
        if (p.winner === 'tie') ties++
        else {
          decided++
          if (p.winner === 'left') left++
        }
        if (p.trap) traps++
        if (p.maker === 'fallback') fallbacks++
      }
      const tieRate = ties / PER_SET
      const trapRate = traps / PER_SET
      // A requested tie/trap that doesn't fit the count falls back to a normal pair,
      // so the observed rate sits at or under the set rate (a trap needs room: a big
      // crowd can't host "a big × loses to a +", a prime count has no two divisors).
      // Traps never happen by accident, so it is never above it. The in-play rates
      // are checked in src/lib/parade/__tests__/parade.test.ts.
      if (cfg.tieRate === 0) expect(ties).toBe(0)
      else {
        expect(tieRate).toBeGreaterThan(cfg.tieRate * 0.4)
        expect(tieRate).toBeLessThan(cfg.tieRate * 1.25)
      }
      expect(trapRate).toBeGreaterThan(cfg.trapRate * 0.2)
      expect(trapRate).toBeLessThan(cfg.trapRate * 1.25)
      expect(left / decided).toBeGreaterThan(0.46)
      expect(left / decided).toBeLessThan(0.54)
      // fallbacks ("+1 or +3") are rare; a keep-more set falls back more near its floor,
      // where nothing is left to keep
      expect(fallbacks / PER_SET).toBeLessThan(set === 'divSub' ? 0.2 : 0.1)
    })
  }

  it('every misconception trap shows up somewhere', () => {
    const seen = new Set<string>()
    for (const set of SETS) {
      const r = seededRng(`traps-${set}`)
      for (let i = 0; i < PER_SET; i++) {
        const p = makeGatePair(randomState(set, r, i))
        if (p.trap) seen.add(p.trap)
      }
    }
    expect([...seen].sort()).toEqual(['bigDenominator', 'bigDigit', 'bigDivisor', 'longDecimal', 'timesAlwaysWins', 'timesFractionShrinks'])
  })
})

describe('gate engine: the best choice depends on the count', () => {
  it('× vs +: neither always wins, and the count decides', () => {
    for (const set of ['mulAdd', 'mulFrac'] as OpSetId[]) {
      const r = seededRng(`state-dep-${set}`)
      let mulWins = 0
      let addWins = 0
      let addWinsSmall = 0
      let mulWinsBig = 0
      let small = 0
      let big = 0
      for (let i = 0; i < PER_SET; i++) {
        const s = randomState(set, r, i)
        const p = makeGatePair(s)
        const kinds = [p.left.op.kind, p.right.op.kind]
        if (p.winner === 'tie' || !kinds.includes('mul') || !kinds.includes('add')) continue
        const winKind = (p.winner === 'left' ? p.left : p.right).op.kind
        if (winKind === 'mul') mulWins++
        else addWins++
        if (s.count <= 6) {
          small++
          if (winKind === 'add') addWinsSmall++
        } else if (s.count >= 30) {
          big++
          if (winKind === 'mul') mulWinsBig++
        }
      }
      const share = mulWins / (mulWins + addWins)
      expect(share, set).toBeGreaterThan(0.3)
      expect(share, set).toBeLessThan(0.85)
      // a small crowd is where + wins more; a big crowd is where × wins more
      expect(addWinsSmall / small, set).toBeGreaterThan(addWins / (mulWins + addWins) - 0.05)
      expect(mulWinsBig / big, set).toBeGreaterThan(share)
    }
  })

  it('÷ vs −: either can keep more', () => {
    const r = seededRng('state-dep-div')
    let div = 0
    let sub = 0
    for (let i = 0; i < PER_SET; i++) {
      const p = makeGatePair(randomState('divSub', r, i))
      const kinds = [p.left.op.kind, p.right.op.kind]
      if (p.winner === 'tie' || !kinds.includes('div') || !kinds.includes('sub')) continue
      if ((p.winner === 'left' ? p.left : p.right).op.kind === 'div') div++
      else sub++
    }
    expect(div / (div + sub)).toBeGreaterThan(0.25)
    expect(div / (div + sub)).toBeLessThan(0.75)
  })
})

describe('gate engine: sequences', () => {
  it('never repeats a pair back to back along played paths, and respects floor and cap all the way', () => {
    for (const set of SETS) {
      const cfg = OP_SETS[set]
      const r = seededRng(`paths-${set}`)
      for (let run = 0; run < 300; run++) {
        const floor = set === 'addSub' ? 2 : 3 + (run % 3)
        let count = floor + (set === 'divSub' ? 20 : 0)
        let prev: string | null = null
        for (let g = 0; g < 8; g++) {
          const s: GateState = { count, opSet: set, floor, difficulty: (g % 3) as 0 | 1 | 2, index: g, prevKey: prev, seed: `path-${run}` }
          const p = makeGatePair(s)
          checkPair(s, p)
          expect(p.key).not.toBe(prev)
          prev = p.key
          // a random (sometimes weak) pick, like a child
          count = r() < 0.5 ? p.left.result : p.right.result
          if (count > cfg.cap * 0.85) count = Math.max(floor, Math.floor(cfg.cap * 0.3))
          if (set === 'divSub' && count < floor + 6) count += 18
        }
      }
    }
  })
})

describe('bands and bookkeeping', () => {
  it('picks the operation set by grade and zone', () => {
    expect([0, 1, 2, 3, 4, 5].map((g) => opSetFor('mul', g))).toEqual(['addSub', 'addSub', 'mulAdd', 'mulAdd', 'mulFrac', 'fracDec'])
    expect([0, 1, 2, 3, 4, 5].map((g) => opSetFor('div', g))).toEqual(['addSub', 'addSub', 'divSub', 'divSub', 'divSub', 'fracDec'])
    expect(maxFactorFor('mulAdd', 2)).toBe(5)
    expect(maxFactorFor('mulAdd', 3)).toBe(9)
  })

  it('tallies smart picks (a tie counts) and the result of each side', () => {
    const p = makeGatePair({ count: 6, opSet: 'mulAdd', floor: 2, difficulty: 0, index: 0, prevKey: null, seed: 'tally' })
    const best = bestSide(p)
    const d = decide(p, best)
    expect(d.smart).toBe(true)
    expect(d.result).toBe(Math.max(p.left.result, p.right.result))
    const other = best === 'left' ? 'right' : 'left'
    expect(decide(p, other).smart).toBe(p.winner === 'tie')
    expect(smartTally([d, decide(p, other)]).total).toBe(2)
  })

  it('scaffolds at chance level (≤ 55 % smart over the last 10), not before 10 picks', () => {
    const picks = (pattern: string) => pattern.split('').map((c) => ({ smart: c === '1' }))
    expect(scaffoldCheck(picks('000000000')).scaffold).toBe(false) // only 9 so far
    expect(scaffoldCheck(picks('1010101010')).scaffold).toBe(true) // 50 %
    expect(scaffoldCheck(picks('1101101010')).share).toBe(0.6)
    expect(scaffoldCheck(picks('1101101010')).scaffold).toBe(false)
    expect(scaffoldCheck(picks('1100101010')).scaffold).toBe(true) // 50 %
    // only the last 10 count: an early slump doesn't stick
    expect(scaffoldCheck(picks('00000000001111111111')).scaffold).toBe(false)
    expect(scaffoldCheck(picks('11111111110000000000')).scaffold).toBe(true)
  })
})
