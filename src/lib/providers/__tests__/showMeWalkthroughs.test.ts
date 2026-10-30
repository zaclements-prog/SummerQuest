import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Problem, WalkStep, WalkVisual } from '../../problem'
import { seededRng } from '../../random'
import { clockTime, countUpHops, formatMoney, makeMeasurementProvider, minuteChunks, moneyWalkthrough, timeWalkthrough } from '../measurement'
import { makePlaceValueRoundingProvider, roundWalkthrough } from '../placeValueRounding'
import { voiceText } from '../../../voice/registry'

/**
 * "Show me how": every walkthrough is built from the problem's own numbers,
 * so its steps always add up to the real answer, and it stops one step short:
 * the last step hands the problem back without stating the answer.
 */

const SEEDS = 600

/** `count` problems, each from its own seeded Math.random. */
function problems(make: () => { next(): Problem | Promise<Problem> }, tag: string, count = SEEDS): Problem[] {
  const out: Problem[] = []
  for (let i = 0; i < count; i++) {
    const rng = seededRng(`${tag}-${i}`)
    const spy = vi.spyOn(Math, 'random').mockImplementation(rng)
    out.push(make().next() as Problem)
    spy.mockRestore()
  }
  return out
}

afterEach(() => vi.restoreAllMocks())

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0)
const last = (w: WalkStep[]) => w[w.length - 1]
function kind<K extends WalkVisual['kind']>(v: WalkVisual, k: K): Extract<WalkVisual, { kind: K }> {
  expect(v.kind).toBe(k)
  return v as Extract<WalkVisual, { kind: K }>
}

/** Shared shape rules: steps say something, one last "your turn" step, fixed lines say exactly their clip. */
function checkShape(w: WalkStep[] | undefined) {
  expect(w && w.length >= 2).toBe(true)
  for (const [i, s] of w!.entries()) {
    expect(s.say.trim().length).toBeGreaterThan(0)
    expect(!!s.yourTurn).toBe(i === w!.length - 1)
    if (s.voice) expect(voiceText(s.voice)).toBe(s.say)
  }
  expect(last(w!).say).toMatch(/Your turn!$/)
}

describe('elapsed time walkthrough', () => {
  const ps = problems(() => makeMeasurementProvider({ type: 'time' }), 'time')

  it('jumps from the start time and adds up to the answer, over many seeds', () => {
    for (const p of ps) {
      const w = p.showMe!
      checkShape(w)
      const m = /^It is (\d+):(\d\d)\. What time will it be in (?:(\d) hours? and )?(\d+) minutes\?$/.exec(p.prompt)!
      expect(m, p.prompt).not.toBeNull()
      const start = Number(m[1]) * 60 + Number(m[2])
      const hours = Number(m[3] ?? 0)
      const minutes = Number(m[4])
      const v = kind(last(w).visual, 'timeJumps')
      expect(v.start).toBe(start)
      expect(v.pending).toBeGreaterThan(0)
      // the whole hours come first, one at a time…
      expect(v.jumps.slice(0, hours)).toEqual(Array(hours).fill(60))
      // …then the minutes (the last chunk is the child's)
      expect(sum(v.jumps.slice(hours)) + v.pending!).toBe(minutes)
      expect(clockTime(start + sum(v.jumps) + v.pending!)).toBe(p.answer)
      // every step draws on the same plan: what's done so far, then the pending hop
      for (const s of w) {
        const sv = kind(s.visual, 'timeJumps')
        expect(sv.plan).toEqual([...v.jumps, v.pending])
        expect(sv.plan!.slice(0, sv.jumps.length)).toEqual(sv.jumps)
      }
      // the opening step says the prompt's start time
      expect(w[0].say).toContain(`${m[1]}:${m[2]}`)
    }
  })

  it('each step says the times it lands on, and no step says the answer', () => {
    for (const p of ps) {
      const w = p.showMe!
      for (const s of w) {
        const v = kind(s.visual, 'timeJumps')
        const to = /to (\d+:\d\d)\.$/.exec(s.say)
        if (to) expect(to[1]).toBe(clockTime(v.start + sum(v.jumps)))
        // (the end time lies strictly after every landing shown, under 3 hours on: never repeated)
        expect(s.say).not.toMatch(new RegExp(`(^|[^\\d])${p.answer}\\b`))
      }
      expect(kind(last(w).visual, 'timeJumps').pending).toBeDefined()
    }
  })

  it('crosses the hour in friendly chunks and wraps past 12', () => {
    expect(minuteChunks(45, 30)).toEqual([15, 15])
    expect(minuteChunks(0, 45)).toEqual([30, 15])
    expect(minuteChunks(0, 30)).toEqual([30])
    expect(minuteChunks(45, 15)).toEqual([15])
    const w = timeWalkthrough(10 * 60, 2, 30)
    expect(w.map((s) => s.say)).toEqual([
      'We start at 10:00.',
      'Jump 1 hour: 10:00 to 11:00.',
      'Jump 1 more hour: 11:00 to 12:00.',
      'Now the minutes: 30 more.',
      'So what time will it be? Your turn!',
    ])
    // minutes only: one jump shown, the rest for the child
    expect(timeWalkthrough(6 * 60 + 5, 0, 15).map((s) => s.say)).toEqual([
      'We start at 6:05.',
      'Jump 10 minutes: 6:05 to 6:15.',
      'Then 5 more minutes.',
      'So what time will it be? Your turn!',
    ])
    const x = timeWalkthrough(11 * 60 + 45, 1, 30) // 11:45 → 12:45 → +15 → 1:00 → +15 = 1:15
    expect(x.map((s) => s.say).slice(1, 4)).toEqual([
      'Jump 1 hour: 11:45 to 12:45.',
      'Jump 15 minutes to the next hour: 12:45 to 1:00.',
      'Then 15 more minutes.',
    ])
    expect(kind(last(x).visual, 'timeJumps')).toEqual({ kind: 'timeJumps', start: 705, jumps: [60, 15], pending: 15, plan: [60, 15, 15] })
  })
})

describe('making change walkthrough', () => {
  const ps = problems(() => makeMeasurementProvider({ type: 'money' }), 'money')

  it('counts up from the cost to what was paid; the hops add up to the answer, over many seeds', () => {
    for (const p of ps) {
      const w = p.showMe!
      checkShape(w)
      const m = /^Something costs \$(\d+)\.(\d\d)\. You pay with \$(\d+)\./.exec(p.prompt)!
      const cost = Number(m[1]) * 100 + Number(m[2])
      const paid = Number(m[3]) * 100
      const v = kind(last(w).visual, 'countUp')
      expect([v.cost, v.paid]).toEqual([cost, paid])
      expect(v.askTotal).toBe(true)
      const counted = sum(v.hops.map((h) => h.each * h.count))
      expect(cost + counted).toBe(paid)
      expect(formatMoney(counted)).toBe(p.answer)
      // each "That makes $x" is the running total
      let cur = cost
      for (const s of w.slice(1, -1)) {
        const hv = kind(s.visual, 'countUp')
        const h = hv.hops[hv.hops.length - 1]
        cur += h.each * h.count
        expect(s.say).toContain(`That makes ${formatMoney(cur)}.`)
      }
      // the last step asks; it never says how much
      expect(last(w).say).not.toMatch(/\$|\d/)
    }
  })

  it('uses real coins and bills, in the shopkeeper order', () => {
    expect(countUpHops(365, 500)).toEqual([
      { coin: 'dime', each: 10, count: 1 },
      { coin: 'quarter', each: 25, count: 1 },
      { coin: 'dollar', each: 100, count: 1 },
    ])
    expect(countUpHops(21, 1000).map((h) => `${h.count}×${h.coin}`)).toEqual(['4×penny', '3×quarter', '4×dollar', '1×five'])
    expect(moneyWalkthrough(365, 500).map((s) => s.say)).toEqual([
      "It costs $3.65. Let's count up to the $5.00 we paid, like a shopkeeper!",
      'Add a dime. That makes $3.75.',
      'Add a quarter. That makes $4.00.',
      'Add a 1 dollar bill. That makes $5.00.',
      'So how much did we count up? Add them! Your turn!',
    ])
  })
})

describe('rounding walkthrough', () => {
  for (const [maxPlace, roundTo] of [[1000, 10], [10000, 100], [100000, 1000]] as const) {
    it(`nearest ${roundTo}: the number sits between the two round numbers and the closer one is the answer`, () => {
      const ps = problems(() => makePlaceValueRoundingProvider({ maxPlace, roundTo }), `round${roundTo}`)
      for (const p of ps) {
        const w = p.showMe!
        checkShape(w)
        const v = kind(last(w).visual, 'roundLine')
        expect(p.prompt).toContain(v.n.toLocaleString('en-US'))
        expect(v.hi - v.lo).toBe(roundTo)
        expect(v.lo % roundTo).toBe(0)
        expect(v.n).toBeGreaterThanOrEqual(v.lo)
        expect(v.n).toBeLessThan(v.hi)
        // closer to (halfway goes up) is the answer
        expect(v.n - v.lo >= v.hi - v.n ? v.hi : v.lo).toBe(p.answer)
        // the deciding digit agrees: 5 or more ↔ the upper one
        const digit = Math.floor(v.n / v.digitAt!) % 10
        expect(digit >= 5 ? v.hi : v.lo).toBe(p.answer)
        // the final step never names a number (let alone which one)
        expect(last(w).say).not.toMatch(/\d/)
      }
    })
  }

  it('reads like a lesson', () => {
    expect(roundWalkthrough(4327, 100).map((s) => s.say)).toEqual([
      '4,327 is between 4,300 and 4,400.',
      'Halfway between them is 4,350.',
      'Here is 4,327 on the line.',
      "Look at the tens digit: it's a 2.",
      'So which hundred is it closer to? Your turn!',
    ])
    expect(roundWalkthrough(4350, 100)[3].say).toBe("Look at the tens digit: it's a 5. 4,350 is exactly halfway!")
    expect(roundWalkthrough(340, 10).map((s) => s.say)).toEqual([
      'Find 340 on the number line, between 340 and 350.',
      "Look at the ones digit: it's a 0. 340 sits right on a ten!",
      'So what does it round to? Your turn!',
    ])
  })
})

describe('only the demo question types carry a walkthrough', () => {
  it('area and perimeter have none (yet)', () => {
    for (const p of problems(() => makeMeasurementProvider({ type: 'area' }), 'area', 20)) expect(p.showMe).toBeUndefined()
    for (const p of problems(() => makeMeasurementProvider({ type: 'perimeter' }), 'perim', 20)) expect(p.showMe).toBeUndefined()
  })
})
