import { describe, expect, it } from 'vitest'
import { compare, toNumber } from '../../numbers'
import { seededRng } from '../../random'
import { createProvider } from '../../providers'
import { effectiveConfig } from '../../gradeTiers'
import {
  BELLY_FULL,
  EDIBLE_SHARE,
  NEAR_EDIBLE,
  NEAR_TOO_BIG,
  PARK,
  ROUNDS,
  canEat,
  cloudLadder,
  decimalPlaces,
  expressionFor,
  gobbleBestKey,
  gobbleSkill,
  gobbleStars,
  introLine,
  burpLines,
  makePark,
  makeSnack,
  nextRound,
  scaffoldNow,
  snackPoints,
  stepPark,
  type Decision,
  type GobbleConfig,
  type SnackValue,
} from '..'
import { voiceText } from '../../../voice/registry'
import type { Problem } from '../../problem'
import { playBot } from './bot'

/** Every band's set, with the grade reach the tiers give it. */
const CONFIGS: GobbleConfig[] = [
  { set: 'k' },
  { set: 'g1' },
  { set: 'whole', maxPlace: 1000 },
  { set: 'whole', maxPlace: 10000 },
  { set: 'whole', maxPlace: 100000 },
  { set: 'frac', maxDen: 8 },
  { set: 'frac', maxDen: 12 },
  { set: 'dec' },
  { set: 'fracDec' },
]
const name = (c: GobbleConfig) => `${c.set}${c.maxPlace ?? c.maxDen ?? ''}`

/** The value an expression's text works out to (+, −, × on whole numbers with thousands commas). */
function evalExpr(text: string): number {
  const m = /^([\d,]+) ([+−×]) ([\d,]+)$/.exec(text)
  if (!m) throw new Error(`not an expression: ${text}`)
  const a = Number(m[1].replace(/,/g, ''))
  const b = Number(m[3].replace(/,/g, ''))
  return m[2] === '+' ? a + b : m[2] === '−' ? a - b : a * b
}

/** The value a snack's text shows, read back independently of its stored value. */
function readText(s: SnackValue): number {
  if (s.form === 'expr') return evalExpr(s.text)
  if (s.form === 'fraction') {
    const [n, d] = s.text.split('/').map(Number)
    expect(s.frac).toEqual({ n, d })
    return n / d
  }
  return Number(s.text.replace(/,/g, ''))
}

describe('the ladders', () => {
  it.each(CONFIGS.map((c) => [name(c), c] as const))('%s: climbs strictly, at least five rungs', (_n, cfg) => {
    const ladder = cloudLadder(cfg)
    expect(ladder.length).toBeGreaterThanOrEqual(5)
    for (let i = 1; i < ladder.length; i++) expect(compare(ladder[i - 1].value, ladder[i].value)).toBe(-1)
    for (const v of ladder) expect(toNumber(v.value)).toBeGreaterThan(0)
  })

  it('kindergarten stays within 10 with room for bigger snacks; 2nd grade below 1,000; fractions within the grade’s denominators', () => {
    expect(cloudLadder({ set: 'k' }).map((v) => v.value.n)).toEqual([4, 5, 6, 7, 8])
    expect(cloudLadder({ set: 'whole', maxPlace: 1000 }).every((v) => toNumber(v.value) < 1000)).toBe(true)
    expect(cloudLadder({ set: 'whole', maxPlace: 10000 }).some((v) => toNumber(v.value) >= 1000)).toBe(true)
    // 4th grade starts past the facts, still within the thousands
    expect(toNumber(cloudLadder({ set: 'whole', maxPlace: 100000 })[0].value)).toBeGreaterThanOrEqual(50)
    expect(cloudLadder({ set: 'whole', maxPlace: 100000 }).every((v) => toNumber(v.value) < 10000)).toBe(true)
    for (const d of [8, 10, 12]) expect(cloudLadder({ set: 'frac', maxDen: d }).every((v) => v.frac!.d <= d)).toBe(true)
    // 5th grade's mix alternates the form, so each number asks for the other form on its snacks
    const forms = cloudLadder({ set: 'fracDec' }).map((v) => v.form)
    for (let i = 1; i < forms.length; i++) expect(forms[i]).not.toBe(forms[i - 1])
  })
})

describe('the snacks: never ambiguous, always on the side asked, read the same as they are stored', () => {
  it.each(CONFIGS.map((c) => [name(c), c] as const))('%s: 300 seeds × every rung × both sides × the difficulty ramp', (_n, cfg) => {
    const ladder = cloudLadder(cfg)
    const families = new Set<string>()
    for (let seed = 0; seed < 300; seed++) {
      const rng = seededRng(`snacks-${name(cfg)}-${seed}`)
      const cloud = ladder[seed % ladder.length]
      for (const d of [0, 0.25, 0.5, 0.75, 1]) {
        for (const edible of [true, false]) {
          const s = makeSnack(cfg, cloud, edible, d, rng)
          const where = `${cloud.text} vs ${s.text} (d ${d})`
          // never the same size as the cloud (the rule is "smaller than")
          expect(compare(s.value, cloud.value), where).not.toBe(0)
          expect(canEat(s, cloud), where).toBe(edible)
          // what it says is what it is
          expect(readText(s), where).toBeCloseTo(toNumber(s.value), 9)
          expect(toNumber(s.value), where).toBeGreaterThan(0)
          families.add(s.family)
          if (cfg.set === 'k') {
            expect(s.form).toBe('dots')
            expect(s.value.n, where).toBeGreaterThanOrEqual(1)
            expect(s.value.n, where).toBeLessThanOrEqual(10)
            // early on, never the cloud's neighbour
            if (d < 0.3) expect(Math.abs(s.value.n - cloud.value.n), where).toBeGreaterThanOrEqual(2)
          }
          if (cfg.set === 'g1') {
            expect(s.value.n, where).toBeGreaterThanOrEqual(10)
            expect(s.value.n, where).toBeLessThanOrEqual(99)
            if (d < 0.35) expect(Math.floor(s.value.n / 10), where).not.toBe(Math.floor(cloud.value.n / 10))
          }
          if (cfg.set === 'whole') {
            expect(s.value.d).toBe(1)
            expect(s.value.n, where).toBeLessThan(Math.min(cfg.maxPlace!, 10000) * 2)
          }
          if (cfg.set === 'frac') {
            expect(s.form).toBe('fraction')
            expect(s.frac!.d, where).toBeLessThanOrEqual(cfg.maxDen!)
            // the families 3.NF.3d and 4.NF.2 ask for; early on, the same denominator whenever there is one
            if (d < 0.3 && s.family !== 'sameDen') expect(['sameNum', 'benchmark']).toContain(s.family)
          }
          if (cfg.set === 'dec') {
            expect(s.form).toBe('decimal')
            expect(decimalPlaces(s.value), where).toBeLessThanOrEqual(d < 0.35 ? 2 : 3)
          }
          if (cfg.set === 'fracDec' && s.form === 'fraction') expect(s.frac!.n, where).toBeLessThan(s.frac!.d)
        }
      }
    }
    // each band shows its comparisons (the traps come up)
    const want: Record<string, string[]> = {
      k: ['far', 'near'],
      g1: ['far', 'sameTens', 'flip'],
      whole: ['far', 'near', 'sameLead', 'expr'],
      frac: ['sameDen', 'sameNum', 'benchmark'],
      dec: ['far', 'longer', 'near'],
      fracDec: ['far', 'cross'],
    }
    for (const f of want[cfg.set]) expect([...families], `${name(cfg)} has ${f}`).toContain(f)
  }, 60_000)

  it('the same seed gives the same snacks', () => {
    for (const cfg of CONFIGS) {
      const cloud = cloudLadder(cfg)[2]
      const a = seededRng('same')
      const b = seededRng('same')
      for (let i = 0; i < 20; i++) expect(makeSnack(cfg, cloud, i % 2 === 0, i / 20, a)).toEqual(makeSnack(cfg, cloud, i % 2 === 0, i / 20, b))
    }
  })

  it('expressions work out to their number, in friendly forms', () => {
    const rng = seededRng('expr')
    for (let t = 2; t <= 9999; t += t < 120 ? 1 : 37) {
      const e = expressionFor(t, rng)
      if (e === null) continue
      expect(evalExpr(e), e).toBe(t)
      // no zero parts, no negative takeaways
      expect(e).not.toMatch(/(^| )0( |$)/)
    }
    expect(expressionFor(1, rng)).toBeNull()
  })
})

describe('the park', () => {
  const kids = (cfg: GobbleConfig) => cfg.set === 'k' || cfg.set === 'g1'

  it.each(CONFIGS.map((c) => [name(c), c] as const))('%s: 40 seeded sessions with a bot: fair near the cloud, ends, nothing lost', (_n, cfg) => {
    for (let seed = 0; seed < 40; seed++) {
      const miss = [0, 0.15, 0.35][seed % 3]
      const rep = playBot(cfg, { seed: `park-${name(cfg)}-${seed}`, listen: kids(cfg), miss, think: kids(cfg) ? 2.5 : 1.8 })
      const { run } = rep
      // every park ended (a tidy park, or the clock), and the session with it
      expect(rep.roundSeconds, `seed ${seed}`).toHaveLength(ROUNDS)
      // fairness: at every check after the first, edible and too-big snacks near the cloud
      for (const n of rep.nearCounts) {
        expect(n.e, `seed ${seed}`).toBeGreaterThanOrEqual(NEAR_EDIBLE)
        expect(n.b, `seed ${seed}`).toBeGreaterThanOrEqual(NEAR_TOO_BIG)
      }
      // never an all-edible park (no trivial late rounds), never one with nothing to eat
      const sorted = [...rep.shares].sort((a, b) => a - b)
      expect(sorted[Math.floor(sorted.length * 0.95)], `seed ${seed}`).toBeLessThanOrEqual(0.8)
      expect(sorted[Math.floor(sorted.length * 0.05)], `seed ${seed}`).toBeGreaterThanOrEqual(0.2)
      // decisions: an eat is right, a burp is wrong, each judged against the cloud's number then
      for (const d of run.decisions) expect(canEat(d.snack, d.cloud)).toBe(d.right)
      const eats = rep.events.filter((e) => e.kind === 'eat').length
      expect(run.eaten).toBe(eats)
      expect(run.decisions.filter((d) => d.right)).toHaveLength(eats)
      // the score only ever grows; the cloud never shrinks and stays in the park
      let score = 0
      for (const e of rep.events) if (e.kind === 'eat') expect((score += e.points)).toBeGreaterThan(0)
      expect(run.score).toBeGreaterThanOrEqual(score)
      expect(run.cloud.r).toBeGreaterThanOrEqual(PARK.cloudR0)
      expect(run.cloud.r).toBeLessThanOrEqual(PARK.cloudRMax)
      expect(Math.abs(run.cloud.x)).toBeLessThanOrEqual(PARK.half)
      expect(Math.abs(run.cloud.z)).toBeLessThanOrEqual(PARK.half)
      // it grew: up the ladder (to the top at most)
      expect(run.cloud.rung).toBeGreaterThan(0)
      expect(run.cloud.rung).toBeLessThan(run.ladder.length)
      const grows = rep.events.filter((e) => e.kind === 'grow')
      for (const g of grows) if (g.kind === 'grow' && !g.top) expect(compare(g.from.value, g.to.value)).toBe(-1)
    }
  }, 60_000)

  it('a careful player’s parks last about a minute; grades 2–5 have an 80 s clock, K–1 none', () => {
    for (const cfg of CONFIGS) {
      const k = kids(cfg)
      const secs = Array.from({ length: 10 }, (_, i) => playBot(cfg, { seed: `pace-${i}`, listen: k, miss: 0.15, think: k ? 4 : 3 }).roundSeconds).flat()
      const avg = secs.reduce((a, b) => a + b, 0) / secs.length
      expect(avg, name(cfg)).toBeGreaterThan(40)
      expect(avg, name(cfg)).toBeLessThanOrEqual(81)
      if (!k) expect(Math.max(...secs)).toBeLessThanOrEqual(80.1)
    }
    const run = makePark({ set: 'k' }, { seed: 'clock', listen: true })
    expect(run.plans.every((p) => p.seconds === null)).toBe(true)
    const run2 = makePark({ set: 'dec' }, { seed: 'clock', listen: false, seconds: 70 })
    expect(run2.plans.every((p) => p.seconds === 70)).toBe(true)
  }, 60_000)

  it('the first park is easy and the difficulty ramps across the session', () => {
    const run = makePark({ set: 'g1' }, { seed: 'ramp', listen: true })
    expect(run.plans.map((p) => p.start)).toEqual([...run.plans.map((p) => p.start)].sort((a, b) => a - b))
    expect(run.plans[0].start).toBe(0)
    // the first park's opening snacks: no close calls (different tens)
    for (const s of run.snacks) expect(Math.floor(s.snack.value.n / 10)).not.toBe(Math.floor(run.cloud.value.value.n / 10))
  })

  it('a fresh park is seeded around the cloud, spaced out, about EDIBLE_SHARE edible', () => {
    for (let i = 0; i < 50; i++) {
      const run = makePark({ set: 'frac', maxDen: 10 }, { seed: `seed-${i}`, listen: false })
      const alive = run.snacks.filter((s) => s.alive)
      expect(alive).toHaveLength(PARK.slots)
      const share = alive.filter((s) => canEat(s.snack, run.cloud.value)).length / alive.length
      expect(Math.abs(share - EDIBLE_SHARE)).toBeLessThanOrEqual(0.15)
      for (const s of alive) {
        expect(Math.hypot(s.x - run.cloud.x, s.z - run.cloud.z)).toBeGreaterThan(run.cloud.r + PARK.snackR)
        expect(Math.abs(s.x)).toBeLessThan(PARK.half)
        expect(Math.abs(s.z)).toBeLessThan(PARK.half)
      }
    }
  })

  it('bumping a too-big snack head-on is one burp (not one a frame), a graze is none, and it bounces the cloud off', () => {
    const run = makePark({ set: 'k' }, { seed: 'bump', listen: true })
    const big = run.snacks.find((s) => !canEat(s.snack, run.cloud.value))!
    // clear the way: everything else far off
    for (const s of run.snacks) if (s !== big) s.alive = false
    for (const s of run.snacks) s.respawnAt = 1e9
    run.nextCheck = 1e9
    run.cloud.x = big.x
    run.cloud.z = big.z + 5
    run.input.target = { x: big.x, z: big.z }
    const evs = []
    for (let i = 0; i < 90; i++) evs.push(...stepPark(run, 1 / 30))
    const burps = evs.filter((e) => e.kind === 'burp')
    expect(burps).toHaveLength(1)
    expect(run.decisions).toHaveLength(1)
    expect(run.decisions[0].right).toBe(false)
    // pushed back out, not inside the snack
    expect(Math.hypot(run.cloud.x - big.x, run.cloud.z - big.z)).toBeGreaterThanOrEqual(run.cloud.r + PARK.snackR * 0.7 - 1e-6)
    // nothing eaten is lost by a burp
    expect(run.score).toBe(0)
    expect(run.eaten).toBe(0)

    // a slow slide along it: no burp
    const run2 = makePark({ set: 'k' }, { seed: 'graze', listen: true })
    const big2 = run2.snacks.find((s) => !canEat(s.snack, run2.cloud.value))!
    for (const s of run2.snacks) if (s !== big2) s.alive = false
    for (const s of run2.snacks) s.respawnAt = 1e9
    run2.nextCheck = 1e9
    run2.cloud.x = big2.x + run2.cloud.r + PARK.snackR * 0.7 - 0.05
    run2.cloud.z = big2.z + 3
    run2.input.target = { x: run2.cloud.x, z: big2.z - 3 }
    const evs2 = []
    for (let i = 0; i < 90; i++) evs2.push(...stepPark(run2, 1 / 30))
    expect(evs2.filter((e) => e.kind === 'burp')).toHaveLength(0)
  })

  it('eating fills the belly by the snack’s share of the cloud’s number; a full belly climbs one rung', () => {
    const run = makePark({ set: 'k' }, { seed: 'belly', listen: true })
    run.nextCheck = 1e9
    const at = run.cloud.value
    let eaten = 0
    while (run.cloud.rung === 0 && eaten < 30) {
      const s = run.snacks.find((x) => x.alive && canEat(x.snack, run.cloud.value))!
      run.cloud.x = s.x
      run.cloud.z = s.z
      stepPark(run, 1 / 30)
      eaten++
    }
    expect(run.cloud.rung).toBe(1)
    expect(compare(run.cloud.value.value, at.value)).toBe(1)
    expect(run.cloud.belly).toBeLessThan(BELLY_FULL)
    // (snacks under 4: each fills 1/4 to 3/4 of a "4", so 4–10 bites)
    expect(eaten).toBeGreaterThanOrEqual(4)
    expect(eaten).toBeLessThanOrEqual(10)
  })

  it('the next park keeps the number, the size and the score', () => {
    const rep = playBot({ set: 'dec' }, { seed: 'keep', listen: false, miss: 0, maxSeconds: 40 })
    const run = rep.run
    const before = { value: run.cloud.value, r: run.cloud.r, score: run.score, eaten: run.eaten }
    run.over = true
    nextRound(run)
    expect(run.cloud.value).toBe(before.value)
    expect(run.cloud.r).toBe(before.r)
    expect(run.score).toBe(before.score)
    expect(run.eaten).toBe(before.eaten)
    expect(run.roundEaten).toBe(0)
    expect(run.roundFrom).toBe(run.decisions.length)
  })
})

describe('scoring, stars, scaffold', () => {
  it('a snack scores more the closer it is to the cloud’s number, plus a streak bonus', () => {
    const cloud = cloudLadder({ set: 'k' })[4] // 8
    const s = (n: number) => ({ ...cloud, value: { n, d: 1 }, family: 'far' }) as SnackValue
    expect(snackPoints(s(1), cloud, 0)).toBeLessThan(snackPoints(s(7), cloud, 0))
    expect(snackPoints(s(7), cloud, 0)).toBeLessThanOrEqual(20)
    expect(snackPoints(s(7), cloud, 5)).toBe(snackPoints(s(7), cloud, 0) + 10)
    expect(snackPoints(s(7), cloud, 50)).toBe(snackPoints(s(7), cloud, 5))
  })

  it('stars count smart bites; a played session earns at least one', () => {
    expect(gobbleStars(0, 0)).toBe(1)
    expect(gobbleStars(17, 20)).toBe(3)
    expect(gobbleStars(13, 20)).toBe(2)
    expect(gobbleStars(5, 20)).toBe(1)
  })

  it('near chance over the last ten turns the pictures on; doing well turns them off', () => {
    const cloud = cloudLadder({ set: 'g1' })[0]
    const d = (right: boolean): Decision => ({ right, cloud, snack: { ...cloud, family: 'far' } })
    expect(scaffoldNow([d(true), d(false)], false)).toBe(false)
    expect(scaffoldNow(Array.from({ length: 10 }, (_, i) => d(i % 2 === 0)), false)).toBe(true)
    expect(scaffoldNow(Array.from({ length: 10 }, (_, i) => d(i % 4 !== 0)), true)).toBe(false)
  })

  it('each stage keeps its own best', () => {
    expect(gobbleBestKey('pv-gobble')).not.toBe(gobbleBestKey('frac-gobble'))
    expect(gobbleBestKey(undefined)).toBe('sq-best-gobble-garden-v1')
  })
})

describe('skills, the provider and the voice', () => {
  it('counts toward the skill ids the zones already use', () => {
    expect(gobbleSkill('k').id).toBe('k-compare-numbers')
    expect(gobbleSkill('g1').id).toBe('g1-compare-2digit')
    expect(gobbleSkill('whole').id).toBe('pv-identify')
    expect(gobbleSkill('frac', { family: 'sameDen' }).id).toBe('frac-cmp-likeden')
    expect(gobbleSkill('frac', { family: 'sameNum' }).id).toBe('frac-cmp-unlikeden')
    expect(gobbleSkill('dec').id).toBe('g5-dec-compare')
    expect(gobbleSkill('fracDec').id).toBe('g5-frac-compare')
  })

  it('the provider: seeded, its answer right, scaled by the grade', () => {
    for (const cfg of CONFIGS) {
      const a = createProvider({ kind: 'gobble', ...cfg, seed: 's' } as never)
      const b = createProvider({ kind: 'gobble', ...cfg, seed: 's' } as never)
      for (let i = 0; i < 40; i++) {
        const p = a.next() as Problem
        expect(p).toEqual(b.next())
        expect(p.options).toContain(p.answer)
        const m = /The cloud is (.+)\. Can it eat (.+)\?/.exec(p.prompt)!
        expect(m).not.toBeNull()
      }
    }
    expect(effectiveConfig({ kind: 'gobble', set: 'whole' }, 2)).toEqual({ kind: 'gobble', set: 'whole', maxPlace: 1000 })
    expect(effectiveConfig({ kind: 'gobble', set: 'whole' }, 3)).toEqual({ kind: 'gobble', set: 'whole', maxPlace: 10000 })
    expect(effectiveConfig({ kind: 'gobble', set: 'whole' }, 4)).toEqual({ kind: 'gobble', set: 'whole', maxPlace: 100000 })
    expect(effectiveConfig({ kind: 'gobble', set: 'frac' }, 2)).toEqual({ kind: 'gobble', set: 'frac', maxDen: 8 })
    expect(effectiveConfig({ kind: 'gobble', set: 'k' }, 0)).toEqual({ kind: 'gobble', set: 'k' })
  })

  it('every line it says is in the gobble-garden pack (K–1 hears the numbers)', () => {
    for (const cfg of [{ set: 'k' }, { set: 'g1' }] as GobbleConfig[]) {
      for (const cloud of cloudLadder(cfg)) {
        expect(voiceText(introLine(cloud, true))).toContain(String(cloud.value.n))
        const snack = makeSnack(cfg, cloud, false, 0.5, seededRng('v'))
        const lines = burpLines(snack, cloud, true)
        expect(lines.map((l) => voiceText(l))).toEqual(['Too big, burp!', `${snack.value.n} is bigger than ${cloud.value.n}.`])
      }
    }
    // grades 2–5 read the numbers: the fixed lines
    expect(voiceText(introLine(cloudLadder({ set: 'dec' })[0], false))).toMatch(/smaller than its number/)
    expect(burpLines(cloudLadder({ set: 'dec' })[1], cloudLadder({ set: 'dec' })[0], false)).toEqual([{ line: 'gobble-garden/tooBig' }])
  })
})
