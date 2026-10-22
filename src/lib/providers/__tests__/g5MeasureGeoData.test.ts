import { describe, it, expect, vi, afterEach } from 'vitest'
import { createProvider, type ProviderConfig } from '..'
import type { Problem, ProblemVisual } from '../../problem'
import { seededRng } from '../../random'
import { G5_ASN, G5_SHAPE_ITEMS } from '../content/g5Shapes'
import { UNIT_PAIRS } from '../g5Measure'
import { SKILLS, skillOf } from '../../../tutoring/skills'

/**
 * 5th grade (phase 3): Measurement Marsh, Geometry Grove and Data Delta.
 * Every mode is drawn many times over many seeds, and every question is solved
 * again here from its own words and picture (never from the provider's code):
 * one right option, no NaN, sensible ranges, text that fits a button.
 */

const SEEDS = 12
const DRAWS = 150
const BAD = /undefined|NaN|\bnull\b|\[object|Infinity/

afterEach(() => vi.restoreAllMocks())

function draw(config: ProviderConfig, seed: string, n = DRAWS): Problem[] {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(seed))
  const p = createProvider(config)
  const out: Problem[] = []
  for (let i = 0; i < n; i++) out.push(p.next() as Problem)
  vi.restoreAllMocks()
  return out
}

function many(config: ProviderConfig): Problem[] {
  return Array.from({ length: SEEDS }, (_, s) => draw(config, `g5mgd:${JSON.stringify(config)}:${s}`)).flat()
}

/** A clean, fair multiple choice whose text fits on the screen. */
function fair(p: Problem): string[] {
  const errs: string[] = []
  const texts = [p.prompt, p.hint ?? '', ...p.options.map(String)]
  for (const t of texts) {
    if (BAD.test(t)) errs.push(`bad token: ${t}`)
    if (/ {2}/.test(t)) errs.push(`double space: ${t}`)
    if (t !== t.trim()) errs.push(`untrimmed: "${t}"`)
  }
  if (p.options.length < 3 || p.options.length > 4) errs.push(`${p.options.length} options`)
  if (new Set(p.options.map(String)).size !== p.options.length) errs.push(`duplicate options ${JSON.stringify(p.options)}`)
  if (p.options.filter((o) => o === p.answer).length !== 1) errs.push(`answer ${JSON.stringify(p.answer)} not exactly once in ${JSON.stringify(p.options)}`)
  for (const o of p.options) {
    if (typeof o === 'number' && !(Number.isFinite(o) && o >= 0)) errs.push(`option ${o}`)
    if (String(o).length > 45) errs.push(`option too long for a button: ${o}`)
  }
  if (p.prompt.length > 230) errs.push(`prompt too long (${p.prompt.length})`)
  if (p.prompt.includes('\n')) errs.push('newline in prompt')
  if (!SKILLS[skillOf(p).id]) errs.push(`unregistered skill ${skillOf(p).id}`)
  return errs
}

const num = (s: string) => Number(s.replace(/,/g, ''))
const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 3 })
/** "3/8", "1 1/4" (no-break space), "2" → a number. */
function frac(s: string): number {
  const m = /^(?:(\d+)[  ])?(\d+)\/(\d+)$/.exec(s)
  if (m) return Number(m[1] ?? 0) + Number(m[2]) / Number(m[3])
  return /^\d+$/.test(s) ? Number(s) : NaN
}
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
/** A fraction is written in simplest form. */
function simplest(s: string): boolean {
  const m = /(\d+)\/(\d+)$/.exec(s)
  return !m || (gcd(Number(m[1]), Number(m[2])) === 1 && Number(m[1]) < Number(m[2]))
}

// ── Measurement Marsh ────────────────────────────────────────────────────────

const WORD: Record<string, string> = {}
const UNIT_OF: Record<string, string> = {
  millimeter: 'mm', centimeter: 'cm', meter: 'm', kilometer: 'km', gram: 'g', kilogram: 'kg', milliliter: 'mL', liter: 'L',
  inch: 'in', foot: 'ft', yard: 'yd', ounce: 'oz', pound: 'lb', minute: 'min', hour: 'h',
  millimeters: 'mm', centimeters: 'cm', meters: 'm', kilometers: 'km', grams: 'g', kilograms: 'kg', milliliters: 'mL', liters: 'L',
  inches: 'in', feet: 'ft', yards: 'yd', ounces: 'oz', pounds: 'lb', minutes: 'min', hours: 'h',
}
for (const [w, u] of Object.entries(UNIT_OF)) WORD[u] = WORD[u] ?? w
/** How many of `small` make one `big`, worked out from the unit table (both directions). */
function factor(big: string, small: string): number | undefined {
  return UNIT_PAIRS.find((p) => p.big === big && p.small === small)?.f
}

function solveMeasure(p: Problem): unknown {
  const v = p.visual
  const boxes = v?.kind === 'prism' ? v.boxes : []
  const vol = boxes.reduce((s, b) => s + b.l * b.w * b.h, 0)
  let m: RegExpExecArray | null
  switch (p.subtopic) {
    case 'cubes':
    case 'composed':
      expect(boxes.length, p.prompt).toBe(p.subtopic === 'cubes' ? 1 : 2)
      return vol
    case 'lwh': {
      m = /is (\d+) \w+ long, (\d+) \w+ wide and (\d+) \w+ tall/.exec(p.prompt)
      const [l, w, h] = m!.slice(1).map(Number)
      expect([boxes[0].l, boxes[0].w, boxes[0].h]).toEqual([l, w, h])
      return l * w * h
    }
    case 'Bh': {
      m = /area of (\d+) square \w+\. The prism is (\d+) \w+ tall/.exec(p.prompt)
      const [B, h] = m!.slice(1).map(Number)
      expect(boxes[0].l * boxes[0].w).toBe(B)
      expect(boxes[0].h).toBe(h)
      return B * h
    }
    case 'missingEdge': {
      m = /volume of (\d+) cubic \w+\. Its base is (\d+) \w+ long and (\d+) \w+ wide/.exec(p.prompt)
      const [V, l, w] = m!.slice(1).map(Number)
      expect(V % (l * w)).toBe(0)
      return V / (l * w)
    }
    case 'toSmall':
    case 'toBig': {
      m = /^([\d,.]+) (\w+) = \? (\w+)$/.exec(p.prompt)
      const [n, from, to] = [num(m![1]), UNIT_OF[m![2]], UNIT_OF[m![3]]]
      const f = factor(from, to)
      if (f) return fmt(n * f)
      const g = factor(to, from)!
      expect(g, p.prompt).toBeDefined()
      return fmt(n / g)
    }
    case 'fromMixed': {
      m = /^(\d+) (\w+) (\d+) (\w+) = \? (\w+)$/.exec(p.prompt)
      const f = factor(UNIT_OF[m![2]], UNIT_OF[m![4]])!
      expect(UNIT_OF[m![4]]).toBe(UNIT_OF[m![5]])
      return fmt(Number(m![1]) * f + Number(m![3]))
    }
    case 'remainder': {
      m = /^Write ([\d,]+) (\w+) in (\w+) and (\w+)\.$/.exec(p.prompt)
      const n = num(m![1])
      const big = UNIT_OF[m![3]]
      const small = UNIT_OF[m![2]]
      const f = factor(big, small)!
      expect(n % f).not.toBe(0)
      return `${Math.floor(n / f)} ${big} ${n % f} ${small}`
    }
    case 'story':
      return solveStory(p.prompt)
  }
  throw new Error(`unknown measurement question ${p.subtopic}: ${p.prompt}`)
}

function solveStory(s: string): string {
  const n = (re: RegExp) => (re.exec(s)?.slice(1) ?? []).map(num)
  let a: number[]
  if ((a = n(/ribbon ([\d,]+) meters? long and cuts off ([\d,]+) centimeters/)).length) return fmt(a[0] * 100 - a[1])
  if ((a = n(/has ([\d,]+) pounds? of trail mix and fills bags that hold ([\d,]+) ounces/)).length) return fmt((a[0] * 16) / a[1])
  if ((a = n(/uses ([\d,]+) milliliters of juice\. How many liters of juice do ([\d,]+) pitchers/)).length) return fmt((a[0] * a[1]) / 1000)
  if ((a = n(/track is ([\d,]+) meters\. How many laps does \w+ run to go ([\d,]+) kilometers?/)).length) return fmt((a[1] * 1000) / a[0])
  if ((a = n(/movie is ([\d,]+) hours? ([\d,]+) minutes long/)).length) return fmt(a[0] * 60 + a[1])
  if ((a = n(/ran ([\d,]+) kilometers\. \w+ ran ([\d,]+) meters/)).length) return fmt(a[0] * 1000 - a[1])
  if ((a = n(/jug holds ([\d,]+) liters of water\. Each cup holds ([\d,]+) milliliters/)).length) return fmt((a[0] * 1000) / a[1])
  if ((a = n(/weighs ([\d,]+) ounces\. How many pounds do ([\d,]+) kittens/)).length) return fmt((a[0] * a[1]) / 16)
  throw new Error(`unknown story: ${s}`)
}

describe('g5Measure (Measurement Marsh)', () => {
  for (const mode of ['volume', 'convert', 'mixed'] as const) {
    it(`${mode}: every answer re-solved, one right option, fair and tidy`, () => {
      const seen = new Set<string>()
      for (const p of many({ kind: 'g5Measure', mode })) {
        expect(fair(p), p.prompt).toEqual([])
        expect(p.answer, p.prompt).toEqual(solveMeasure(p))
        seen.add(p.subtopic!)
        if (typeof p.answer === 'number') {
          expect(Number.isInteger(p.answer), p.prompt).toBe(true)
          expect(p.answer, p.prompt).toBeGreaterThan(0)
          expect(p.answer, p.prompt).toBeLessThanOrEqual(1000)
        }
        // whole-number answers stay whole where the units say so
        if (p.subtopic === 'story' || p.subtopic === 'fromMixed') expect(Number.isFinite(num(String(p.answer))), p.prompt).toBe(true)
        // no unit conversion in a speed round needs a picture
        if (mode === 'convert') expect(p.visual, p.prompt).toBeUndefined()
        else if (['cubes', 'composed', 'Bh', 'lwh'].includes(p.subtopic!)) expect(p.visual?.kind).toBe('prism')
      }
      const want = { volume: ['cubes', 'lwh', 'Bh', 'composed'], convert: ['toSmall', 'toBig', 'fromMixed', 'remainder'], mixed: ['cubes', 'lwh', 'Bh', 'composed', 'missingEdge', 'story', 'toSmall', 'toBig'] }[mode]
      for (const w of want) expect(seen, w).toContain(w)
    })
  }

  it('wrong options come from real slips: one layer, the cubes you can see, base-ten time', () => {
    const vol = many({ kind: 'g5Measure', mode: 'volume' })
    const cubes = vol.filter((p) => p.subtopic === 'cubes')
    // the cubes you can see (everything minus the hidden core) is often offered
    const seenSlip = cubes.filter((p) => {
      const b = (p.visual as Extract<ProblemVisual, { kind: 'prism' }>).boxes[0]
      return p.options.includes(b.l * b.w * b.h - (b.l - 1) * (b.w - 1) * (b.h - 1))
    })
    expect(seenSlip.length / cubes.length).toBeGreaterThan(0.5)
    const conv = many({ kind: 'g5Measure', mode: 'convert' }).filter((p) => p.subtopic === 'remainder' && /minutes in hours/.test(p.prompt))
    expect(conv.length).toBeGreaterThan(5)
    for (const p of conv) {
      const n = num(/Write ([\d,]+)/.exec(p.prompt)![1])
      if (n >= 100) expect(p.options, p.prompt).toContain(`${Math.floor(n / 100)} h ${n % 100} min`)
    }
  })
})

// ── Geometry Grove ───────────────────────────────────────────────────────────

const pairOf = (s: string) => {
  const m = /^\((\d+), (\d+)\)$/.exec(s)
  return m ? { x: Number(m[1]), y: Number(m[2]) } : null
}

function solveGeometry(p: Problem): unknown {
  const v = p.visual?.kind === 'coordPlane' ? p.visual : undefined
  let m: RegExpExecArray | null
  switch (p.subtopic) {
    case 'read': {
      const label = /point (\w)\?$/.exec(p.prompt)![1]
      const pt = v!.points.find((q) => q.label === label)!
      return `(${pt.x}, ${pt.y})`
    }
    case 'find': {
      const t = pairOf(/at (\(\d+, \d+\))\?$/.exec(p.prompt)![1])!
      const hits = v!.points.filter((q) => q.x === t.x && q.y === t.y)
      expect(hits).toHaveLength(1)
      // the swap trap is on the grid
      expect(v!.points.some((q) => q.x === t.y && q.y === t.x)).toBe(true)
      return hits[0].label
    }
    case 'move': {
      m = /Move (\d+) units? right and (\d+) units? up/.exec(p.prompt)
      const [a, b] = m!.slice(1).map(Number)
      const s = /^Start at (\(\d+, \d+\))/.exec(p.prompt)
      const o = s ? pairOf(s[1])! : { x: 0, y: 0 }
      return `(${o.x + a}, ${o.y + b})`
    }
    case 'axes': {
      if (/\(0, 0\) called/.test(p.prompt)) return 'the origin'
      if ((m = /at \((\d+), (\d+)\)\. Which axis/.exec(p.prompt))) return Number(m[1]) === 0 ? 'the y-axis' : (expect(Number(m[2])).toBe(0), 'the x-axis')
      if ((m = /pair \((\d+), (\d+)\), what does the (\d+) tell/.exec(p.prompt))) {
        // (when both numbers are the same, either reading is true: never asked)
        expect(m[1]).not.toBe(m[2])
        return m[3] === m[1] ? 'how far to go across from the origin' : 'how far to go up from the origin'
      }
      const onX = /on the x-axis\?$/.test(p.prompt)
      const ok = p.options.map(String).filter((o) => {
        const q = pairOf(o)!
        return onX ? q.y === 0 : q.x === 0
      })
      expect(ok, p.prompt).toHaveLength(1)
      return ok[0]
    }
    case 'distance': {
      m = /at \((\d+), (\d+)\) and the .+ is at \((\d+), (\d+)\)\. How many blocks/.exec(p.prompt)
      const [x1, y1, x2, y2] = m!.slice(1).map(Number)
      expect(x1 === x2 || y1 === y2).toBe(true)
      expect(v!.points.map((q) => [q.x, q.y])).toEqual([
        [x1, y1],
        [x2, y2],
      ])
      return String(Math.abs(x1 - x2) + Math.abs(y1 - y2))
    }
    case 'graph': {
      // every point sits on a grid line
      for (const q of v!.points) expect((q.y / (v!.yStep ?? 1)) % 1, p.prompt).toBe(0)
      const askX = /(?:In|On|At) which|After how many/.test(p.prompt)
      if (askX) {
        const y = Number(/ (\d+) (?:inches|dollars|miles|pages)/.exec(p.prompt)![1])
        return String(v!.points.find((q) => q.y === y)!.x)
      }
      const k = Number(/(?:week|after|day) (\d+)/.exec(p.prompt)![1])
      return String(v!.points.find((q) => q.x === k)!.y)
    }
    case 'quadrilateral': {
      const right = /four right angles/.test(p.prompt)
      const equal = /four sides of/.test(p.prompt)
      return right && equal ? 'square' : right ? 'rectangle' : equal ? 'rhombus' : 'parallelogram'
    }
    case 'triangle': {
      if ((m = /angles of (\d+)°, (\d+)° and (\d+)°/.exec(p.prompt))) {
        const a = m.slice(1).map(Number)
        expect(a[0] + a[1] + a[2]).toBe(180)
        for (const x of a) expect(x).toBeGreaterThan(0)
        const big = Math.max(...a)
        return big === 90 ? 'right' : big > 90 ? 'obtuse' : 'acute'
      }
      m = /sides of (\d+) cm, (\d+) cm and (\d+) cm/.exec(p.prompt)
      const s = m!.slice(1).map(Number).sort((x, y) => x - y)
      expect(s[0] + s[1]).toBeGreaterThan(s[2]) // a real triangle
      return s[0] === s[2] ? 'equilateral' : s[0] === s[1] || s[1] === s[2] ? 'isosceles' : 'scalene'
    }
    case 'hierarchy': {
      const asn = G5_ASN.find((a) => p.prompt === `Always, sometimes or never? ${a.text}`)
      if (asn) return asn.answer
      const item = G5_SHAPE_ITEMS.find((i) => i.question === p.prompt && i.options.every((o) => p.options.includes(o)))!
      return item.options[0]
    }
  }
  throw new Error(`unknown geometry question ${p.subtopic}: ${p.prompt}`)
}

describe('g5Geometry (Geometry Grove)', () => {
  for (const mode of ['coordinates', 'classify', 'mixed'] as const) {
    it(`${mode}: every answer re-solved, one right option, fair and tidy`, () => {
      const seen = new Set<string>()
      for (const p of many({ kind: 'g5Geometry', mode })) {
        expect(fair(p), p.prompt).toEqual([])
        expect(p.answer, p.prompt).toEqual(solveGeometry(p))
        seen.add(p.subtopic!)
        if (p.visual?.kind === 'coordPlane') {
          for (const q of p.visual.points) {
            expect(q.x).toBeGreaterThanOrEqual(0)
            expect(q.x).toBeLessThanOrEqual(p.visual.xMax)
            expect(q.y).toBeGreaterThanOrEqual(0)
            expect(q.y).toBeLessThanOrEqual(p.visual.yMax)
          }
          expect(p.visual.xMax / (p.visual.xStep ?? 1)).toBeLessThanOrEqual(12)
          expect(p.visual.yMax / (p.visual.yStep ?? 1)).toBeLessThanOrEqual(12)
        }
      }
      const want = { coordinates: ['read', 'find', 'move', 'axes', 'distance', 'graph'], classify: ['hierarchy', 'quadrilateral', 'triangle'], mixed: ['read', 'hierarchy', 'graph', 'triangle'] }[mode]
      for (const w of want) expect(seen, w).toContain(w)
    })
  }

  it('reading a point always offers the swapped pair (x and y mixed up)', () => {
    for (const p of many({ kind: 'g5Geometry', mode: 'coordinates' }).filter((q) => q.subtopic === 'read')) {
      const a = pairOf(String(p.answer))!
      expect(p.options, p.prompt).toContain(`(${a.y}, ${a.x})`)
    }
  })

  it('the hand-written family tree: every item has one answer among four different options', () => {
    expect(G5_ASN.length).toBeGreaterThanOrEqual(20)
    expect(G5_SHAPE_ITEMS.length).toBeGreaterThanOrEqual(15)
    for (const it of G5_SHAPE_ITEMS) expect(new Set(it.options).size, it.question).toBe(4)
    for (const a of G5_ASN) expect(a.text.split('___')).toHaveLength(2)
    const counts = { always: 0, sometimes: 0, never: 0 }
    for (const a of G5_ASN) counts[a.answer]++
    for (const k of Object.values(counts)) expect(k).toBeGreaterThanOrEqual(5)
  })
})

// ── Data Delta ───────────────────────────────────────────────────────────────

function solveData(p: Problem): unknown {
  let m: RegExpExecArray | null
  if (p.visual?.kind === 'linePlot') {
    const v = p.visual
    const values = v.counts.flatMap((k, i) => Array.from({ length: k }, () => (v.min + i) / v.denominator))
    const tick = (s: string) => {
      const x = frac(s)
      expect(Number.isFinite(x), s).toBe(true)
      return x
    }
    const asFrac = (x: number) => {
      // simplest mixed number, written like the provider must
      const d = v.denominator
      const t = Math.round(x * d)
      expect(Math.abs(t / d - x)).toBeLessThan(1e-9)
      const g = gcd(t % d, d) || d
      const whole = Math.floor(t / d)
      const r = (t % d) / g
      const den = d / g
      return r === 0 ? String(whole) : whole ? `${whole} ${r}/${den}` : `${r}/${den}`
    }
    switch (p.subtopic) {
      case 'count': {
        const at = tick(/were ([\d / ]+?) (?:inch|inches|cup|cups|yard|yards|liter|liters|pound|pounds) /.exec(p.prompt)![1])
        return String(values.filter((x) => Math.abs(x - at) < 1e-9).length)
      }
      case 'moreThan': {
        const at = tick(/more than ([\d / ]+?) (?:inch|inches|cup|cups|yard|yards|liter|liters|pound|pounds) /.exec(p.prompt)![1])
        return String(values.filter((x) => x > at + 1e-9).length)
      }
      case 'mode': {
        const top = Math.max(...v.counts)
        expect(v.counts.filter((k) => k === top)).toHaveLength(1)
        return asFrac((v.min + v.counts.indexOf(top)) / v.denominator)
      }
      case 'spread':
        return asFrac(Math.max(...values) - Math.min(...values))
      case 'total': {
        const at = tick(/that were ([\d / ]+?) (?:inch|inches|cup|cups|yard|yards|liter|liters|pound|pounds) /.exec(p.prompt)![1])
        return asFrac(values.filter((x) => Math.abs(x - at) < 1e-9).length * at)
      }
      case 'share': {
        const n = Number(/each of the (\d+) get/.exec(p.prompt)![1])
        expect(values).toHaveLength(n)
        return asFrac(values.reduce((a, b) => a + b, 0) / n)
      }
    }
    throw new Error(`unknown line plot question ${p.subtopic}`)
  }
  // patterns: the rules from the words (or the listed terms)
  m = /Pattern A starts at 0 and adds (\d+)\. Pattern B starts at 0 and adds (\d+)\./.exec(p.prompt)
  const lists = /Pattern A: ([\d, ]+)\. Pattern B: ([\d, ]+)\./.exec(p.prompt)
  const [a, b] = m ? [Number(m[1]), Number(m[2])] : [1, 2].map((i) => lists![i].split(', ').map(Number)[1])
  expect(b % a).toBe(0)
  switch (p.subtopic) {
    case 'nextPair':
      return `(${3 * a}, ${3 * b})`
    case 'relation':
      return `${b / a} times as large`
    case 'missing': {
      const x = Number(/pairs is \((\d+), \?\)/.exec(p.prompt)![1])
      return String((x / a) * b)
    }
    case 'graph': {
      const v = p.visual as Extract<ProblemVisual, { kind: 'coordPlane' }>
      const last = v.points[v.points.length - 1]
      for (const q of v.points) expect(q.y * a).toBe(q.x * b)
      return `(${last.x + a}, ${last.y + b})`
    }
  }
  throw new Error(`unknown data question ${p.subtopic}`)
}

describe('g5Data (Data Delta)', () => {
  for (const mode of ['linePlot', 'patterns', 'mixed'] as const) {
    it(`${mode}: every answer re-solved, one right option, fair and tidy`, () => {
      const seen = new Set<string>()
      for (const p of many({ kind: 'g5Data', mode })) {
        expect(fair(p), p.prompt).toEqual([])
        expect(p.answer, p.prompt).toEqual(solveData(p))
        seen.add(p.subtopic!)
        if (p.visual?.kind === 'linePlot') {
          const v = p.visual
          expect([2, 4, 8]).toContain(v.denominator)
          expect(v.counts).toHaveLength(v.max - v.min + 1)
          expect(Math.max(...v.counts)).toBeLessThanOrEqual(6)
          // fraction options are in simplest form
          for (const o of p.options) expect(simplest(String(o)), String(o)).toBe(true)
        }
      }
      const want = { linePlot: ['count', 'mode', 'spread', 'total', 'moreThan', 'share'], patterns: ['nextPair', 'relation', 'missing', 'graph'], mixed: ['count', 'share', 'relation', 'graph'] }[mode]
      for (const w of want) expect(seen, w).toContain(w)
    })
  }

  it('the spread question offers counting the tick marks as whole units, and the share question offers the undivided total', () => {
    const ps = many({ kind: 'g5Data', mode: 'linePlot' })
    const spread = ps.filter((p) => p.subtopic === 'spread')
    const whole = spread.filter((p) => {
      const v = p.visual as Extract<ProblemVisual, { kind: 'linePlot' }>
      const used = v.counts.map((k, i) => (k ? i : -1)).filter((i) => i >= 0)
      return p.options.includes(String(used[used.length - 1] - used[0]))
    })
    expect(whole.length / spread.length).toBeGreaterThan(0.8)
    const share = ps.filter((p) => p.subtopic === 'share')
    expect(share.length).toBeGreaterThan(20)
  })
})
