import { afterEach, describe, expect, it, vi } from 'vitest'
import { add, compare, gcd, mul, parseRational, rat, sub, type Rational } from '../../numbers'
import { seededRng } from '../../random'
import type { Problem } from '../../problem'
import { createProvider, type ProviderConfig } from '..'
import { SKILLS, skillOf } from '../../../tutoring/skills'
import { forgeSumFacts, makeForgeSumProvider } from '../g5Fractions'
import { expandedText } from '../g5Decimals'
import { decName, decText, roundMilli } from '../fracDecKit'

/**
 * Grade 5 Fraction Falls, Place Value Plateau and Tower Battlefront gates:
 * every problem re-solved here from its own prompt (independently of the
 * generator), one correct option, nothing NaN, sensible sizes, short text.
 */

const DRAWS = 1500
const BAD = /NaN|undefined|null|Infinity|\[object/

afterEach(() => vi.restoreAllMocks())

function draw(config: ProviderConfig, n = DRAWS, seed = 'g5'): Problem[] {
  vi.spyOn(Math, 'random').mockImplementation(seededRng(`${seed}-${JSON.stringify(config)}`))
  const p = createProvider(config)
  const out: Problem[] = []
  for (let i = 0; i < n; i++) out.push(p.next() as Problem)
  vi.restoreAllMocks()
  return out
}

/** A fraction / mixed number / whole as printed ("2 1/3" uses a no-break space). */
const R = (s: string): Rational => parseRational(s.replace(/ /g, ' ').replace('−', '-'))
const FRAC = String.raw`(\d+(?: \d+\/\d+)?|\d+\/\d+)`

/** Decimal text → whole thousandths, exactly (no floats). */
function milli(s: string): number {
  const t = s.replace(/[$,]/g, '')
  const m = /^(\d+)(?:\.(\d{1,3}))?$/.exec(t)
  if (!m) throw new Error(`not a decimal: ${s}`)
  return Number(m[1]) * 1000 + Number((m[2] ?? '').padEnd(3, '0'))
}
const DEC = String.raw`(\d[\d,]*(?:\.\d+)?)`

function wellFormed(p: Problem) {
  const where = `${p.prompt} | ${JSON.stringify(p.options)} → ${JSON.stringify(p.answer)}`
  expect(p.options.length, where).toBeGreaterThanOrEqual(3)
  expect(p.options.filter((o) => o === p.answer).length, where).toBe(1)
  expect(new Set(p.options.map(String)).size, where).toBe(p.options.length)
  for (const t of [p.prompt, p.hint ?? '', p.explanation ?? '', ...p.options.map(String)]) {
    expect(BAD.test(t), where).toBe(false)
    expect(/ {2}/.test(t), where).toBe(false)
  }
  // fits a quiz card and its buttons
  expect(p.prompt.length, where).toBeLessThanOrEqual(120)
  for (const o of p.options) expect(String(o).length, where).toBeLessThanOrEqual(36)
  expect(SKILLS[skillOf(p).id], `unregistered skill ${skillOf(p).id}`).toBeDefined()
}

/** No two options are the same amount (so only the key is right). */
function oneAmount(p: Problem, value: (s: string) => Rational | number) {
  const vals = p.options.map((o) => value(String(o)))
  const key = value(String(p.answer))
  const same = vals.filter((v) => (typeof v === 'number' ? v === key : compare(v, key as Rational) === 0))
  expect(same.length, `${p.prompt} ${JSON.stringify(p.options)}`).toBe(1)
}

const eqR = (a: Rational, b: Rational) => compare(a, b) === 0

/** Re-solve a fraction problem from its prompt; returns the true answer's value (or a text key). */
function solveFraction(p: Problem): Rational | string | number | null {
  let m: RegExpExecArray | null
  if ((m = new RegExp(`^${FRAC} ([+−×]) ${FRAC} = \\?$`).exec(p.prompt))) {
    const [a, b] = [R(m[1]), R(m[3])]
    return m[2] === '+' ? add(a, b) : m[2] === '−' ? sub(a, b) : mul(a, b)
  }
  if ((m = new RegExp(`^${FRAC} × (\\d+) = \\?$`).exec(p.prompt)) || (m = new RegExp(`^(\\d+) × ${FRAC} = \\?$`).exec(p.prompt))) return mul(R(m[1]), R(m[2]))
  if ((m = /^(\d+) ÷ (\d+) = \?$/.exec(p.prompt))) return rat(Number(m[1]), Number(m[2]))
  if ((m = /^What is the least common denominator of (\d+)\/(\d+) and (\d+)\/(\d+)\?$/.exec(p.prompt))) {
    const [b, d] = [Number(m[2]), Number(m[4])]
    return (b * d) / gcd(b, d)
  }
  if ((m = new RegExp(`^Without adding: is ${FRAC} \\+ ${FRAC} more or less than 1\\?$`).exec(p.prompt))) {
    const s = add(R(m[1]), R(m[2]))
    expect(compare(s, rat(1))).not.toBe(0)
    return compare(s, rat(1)) > 0 ? 'more than 1' : 'less than 1'
  }
  if ((m = /^(\d+)\/(\d+) \? (\d+)\/(\d+)$/.exec(p.prompt))) {
    const c = compare(rat(+m[1], +m[2]), rat(+m[3], +m[4]))
    return c < 0 ? '<' : c > 0 ? '>' : '='
  }
  if ((m = /^Which division means the same as (\d+)\/(\d+)\?$/.exec(p.prompt))) return `${m[1]} ÷ ${m[2]}`
  if ((m = /^(\d+) people share a (\d+)-pound sack of rice equally\./.exec(p.prompt))) {
    const q = Math.floor(Number(m[2]) / Number(m[1]))
    return `${q} and ${q + 1}`
  }
  if ((m = /^There are (\d+) students in a club\. (\d+)\/(\d+) of them/.exec(p.prompt))) return mul(rat(+m[1]), rat(+m[2], +m[3]))
  if ((m = /^(\d+) (?:pizzas|pounds of clay|liters of lemonade|granola bars) are (?:shared|poured|split) equally (?:by|into|among) (\d+) /.exec(p.prompt))) return rat(+m[1], +m[2])
  // the add / subtract / multiply stories: two fractions in the text
  const fr = [...p.prompt.matchAll(/(\d+)\/(\d+)/g)].map((x) => rat(+x[1], +x[2]))
  if (fr.length === 2) {
    if (/in all|liquid|did he read/.test(p.prompt)) return add(fr[0], fr[1])
    if (/left\?|more did/.test(p.prompt)) return sub(fr[0], fr[1])
    if (/of the recipe|area/.test(p.prompt)) return mul(fr[0], fr[1])
  }
  return null
}

function checkFraction(p: Problem) {
  const want = solveFraction(p)
  expect(want, `unsolved prompt: ${p.prompt}`).not.toBeNull()
  if (typeof want === 'string' || typeof want === 'number') {
    expect(p.answer, p.prompt).toBe(want)
    return
  }
  const got = R(String(p.answer))
  expect(eqR(got, want!), `${p.prompt}: ${p.answer}`).toBe(true)
  // printed in simplest form: the text is exactly how the value prints
  const a = String(p.answer)
  if (a.includes('/')) {
    const [n, d] = a.split(/ /).pop()!.split('/').map(Number)
    expect(gcd(n, d), `${a} not simplest`).toBe(1)
    expect(n).toBeLessThan(d)
  }
  oneAmount(p, (s) => R(s))
  for (const o of p.options) expect(R(String(o)).n, `${p.prompt}: ${o}`).toBeGreaterThan(0)
}

describe('g5Fractions', () => {
  for (const mode of ['addSub', 'timesShare', 'mixed'] as const) {
    it(`${mode}: every answer re-solves, one correct option, simplest form`, () => {
      const subs = new Set<string>()
      for (const p of draw({ kind: 'g5Fractions', mode })) {
        wellFormed(p)
        checkFraction(p)
        subs.add(p.subtopic!)
        if (p.visual?.kind === 'fractionArea') {
          const [a, b] = p.prompt.match(/\d+\/\d+/g)!.map((t) => R(t))
          expect(p.visual.a).toEqual({ numerator: a.n, denominator: a.d })
          expect(p.visual.b).toEqual({ numerator: b.n, denominator: b.d })
        }
      }
      if (mode === 'addSub') expect([...subs].sort()).toEqual(['add', 'add-mixed', 'add-story', 'estimate', 'lcd', 'subtract', 'subtract-mixed', 'subtract-story'])
      if (mode === 'timesShare') {
        for (const s of ['frac-x-frac', 'frac-x-whole', 'frac-of-set', 'divide-as-fraction', 'share-story', 'share-between', 'which-division']) expect(subs.has(s), s).toBe(true)
      }
      if (mode === 'mixed') expect(subs.has('compare')).toBe(true)
    })
  }

  it('unlike denominators everywhere in + and −, and mixed numbers show up', () => {
    let mixed = 0
    for (const p of draw({ kind: 'g5Fractions', mode: 'addSub' }, 600)) {
      const m = new RegExp(`^${FRAC} [+−] ${FRAC} = \\?$`).exec(p.prompt)
      if (!m) continue
      expect(R(m[1]).d, p.prompt).not.toBe(R(m[2]).d)
      if (/ /.test(p.prompt)) mixed++
    }
    expect(mixed).toBeGreaterThan(50)
  })

  it('the misconception distractors appear: adding tops and bottoms, flipping a division', () => {
    let tb = 0
    let flip = 0
    for (const p of draw({ kind: 'g5Fractions', mode: 'mixed' })) {
      const m = /^(\d+)\/(\d+) \+ (\d+)\/(\d+) = \?$/.exec(p.prompt)
      if (m && p.options.some((o) => eqR(R(String(o)), rat(+m[1] + +m[3], +m[2] + +m[4])))) tb++
      const d = /^(\d+) ÷ (\d+) = \?$/.exec(p.prompt)
      if (d && p.options.some((o) => eqR(R(String(o)), rat(+d[2], +d[1])))) flip++
    }
    expect(tb).toBeGreaterThan(20)
    expect(flip).toBeGreaterThan(10)
  })

  it("the forge's facts: unlike, simplest, a common denominator ≤ 12, a sum under one bar", () => {
    const facts = forgeSumFacts(12)
    expect(facts.length).toBeGreaterThan(30)
    for (const [a, b] of facts) {
      expect(a.d).not.toBe(b.d)
      expect((a.d * b.d) / gcd(a.d, b.d)).toBeLessThanOrEqual(12)
      expect(compare(add(a, b), rat(1))).toBeLessThan(0)
    }
    vi.spyOn(Math, 'random').mockImplementation(seededRng('forge'))
    const p = makeForgeSumProvider(12)
    const seen = new Set<string>()
    for (let i = 0; i < facts.length; i++) {
      const q = p.next() as Problem
      wellFormed(q)
      checkFraction(q)
      seen.add(q.prompt)
    }
    // one pass of the deck serves every fact once
    expect(seen.size).toBe(facts.length)
  })
})

// ── decimals ─────────────────────────────────────────────────────────────────

/** Re-solve a decimal problem: the answer as thousandths, or a text key. */
function solveDecimal(p: Problem): number | string | null {
  let m: RegExpExecArray | null
  const t = p.prompt
  if ((m = new RegExp(`^${DEC} ([+−×÷]) ${DEC} = \\?$`).exec(t))) {
    const [a, b] = [milli(m[1]), milli(m[3])]
    if (m[2] === '+') return a + b
    if (m[2] === '−') return a - b
    if (m[2] === '×') return (a * b) / 1000
    return (a * 1000) / b
  }
  if ((m = new RegExp(`^${DEC} ([×÷]) 10([¹²³]) = \\?$`).exec(t))) {
    const k = '¹²³'.indexOf(m[3]) + 1
    const a = milli(m[1])
    return m[2] === '×' ? a * 10 ** k : a / 10 ** k
  }
  if ((m = new RegExp(`^Round ${DEC} to the nearest (whole number|tenth|hundredth)\\.$`).exec(t))) return roundMilli(milli(m[1]), { 'whole number': 1000, tenth: 100, hundredth: 10 }[m[2]]!)
  if ((m = new RegExp(`^${DEC} \\? ${DEC}$`).exec(t))) {
    const [a, b] = [milli(m[1]), milli(m[2])]
    return a < b ? '<' : a > b ? '>' : '='
  }
  if ((m = /^Which number is (.+)\?$/.exec(t)) && /^[\d .+]+$/.test(m[1])) return m[1].split(' + ').reduce((s, x) => s + milli(x), 0)
  if ((m = /^Which number is (.+)\?$/.exec(t)) && !/greatest|least/.test(t)) return m[1] // a name: checked below
  if ((m = new RegExp(`^How do you read ${DEC}\\?$`).exec(t))) return decName(milli(m[1]))
  if ((m = new RegExp(`^Which shows ${DEC} in expanded form\\?$`).exec(t))) return expandedText(milli(m[1]))
  if ((m = new RegExp(`^(?:In ${DEC}, what is the value of the (\\d)\\?|What is the value of the (\\d) in ${DEC}\\?)$`).exec(t))) {
    const num = m[1] ?? m[4]
    const d = m[2] ?? m[3]
    const s = num.replace(/,/g, '')
    const [w, f = ''] = s.split('.')
    const all = w + f
    expect(all.split(d).length - 1, t).toBe(1)
    const i = w.indexOf(d)
    if (i >= 0) return Number(d) * 1000 * 10 ** (w.length - 1 - i)
    const j = f.indexOf(d)
    return Number(d) * 10 ** (2 - j)
  }
  if ((m = /^In ([\d.]+), the (\d) in the (\w+) place is how many times the \2 in the (\w+) place\?$/.exec(t))) {
    const P = ['ones', 'tenths', 'hundredths', 'thousandths']
    const gap = P.indexOf(m[4]) - P.indexOf(m[3])
    return gap === 1 ? '10' : gap === 2 ? '100' : gap === -1 ? '1/10' : '1/100'
  }
  if (/^Which number is the (greatest|least)\?$/.test(t)) {
    const v = p.options.map((o) => milli(String(o)))
    return /greatest/.test(t) ? Math.max(...v) : Math.min(...v)
  }
  if ((m = /costs \$([\d.]+) and a pen costs \$([\d.]+)\./.exec(t))) return milli(m[1]) + milli(m[2])
  if ((m = /^You have \$([\d.]+)\. You spend \$([\d.]+)\./.exec(t))) return milli(m[1]) - milli(m[2])
  if ((m = /^Which decimal equals (\d+)\/(\d+)\?$/.exec(t))) return (Number(m[1]) * 1000) / Number(m[2])
  return null
}

function checkDecimal(p: Problem) {
  const want = solveDecimal(p)
  expect(want, `unsolved prompt: ${p.prompt}`).not.toBeNull()
  if (typeof want === 'number') {
    expect(Number.isInteger(want), p.prompt).toBe(true)
    expect(milli(String(p.answer)), `${p.prompt}: ${p.answer}`).toBe(want)
    oneAmount(p, milli)
  } else if (/^Which number is (.+)\?$/.test(p.prompt)) {
    // a name → the numeral whose name it is
    const name = /^Which number is (.+)\?$/.exec(p.prompt)![1]
    expect(decName(milli(String(p.answer))), p.prompt).toBe(name)
    oneAmount(p, milli)
  } else {
    expect(p.answer, p.prompt).toBe(want)
  }
}

describe('g5Decimals', () => {
  for (const mode of ['place', 'roundOps', 'mixed'] as const) {
    it(`${mode}: every answer re-solves exactly (whole thousandths), one correct option`, () => {
      const subs = new Set<string>()
      for (const p of draw({ kind: 'g5Decimals', mode })) {
        wellFormed(p)
        checkDecimal(p)
        subs.add(p.subtopic!)
        // to thousandths at most, and no float noise anywhere
        for (const o of [p.prompt, ...p.options.map(String)]) expect(/\.\d{4,}/.test(o), o).toBe(false)
      }
      if (mode === 'place')
        for (const s of ['name-to-numeral', 'numeral-to-name', 'expanded-to-standard', 'standard-to-expanded', 'digit-value', 'ten-times', 'compare', 'greatest']) expect(subs.has(s), s).toBe(true)
      if (mode === 'roundOps') for (const s of ['round-tenth', 'round-hundredth', 'round-whole', 'add', 'subtract', 'add-money', 'times-100', 'divide-1000', 'multiply-tt', 'divide-dd']) expect(subs.has(s), s).toBe(true)
    })
  }

  it('the longer decimal is often the smaller one, and trailing zeros make "="', () => {
    let trap = 0
    let zeros = 0
    for (const p of draw({ kind: 'g5Decimals', mode: 'place' })) {
      const m = /^([\d.]+) \? ([\d.]+)$/.exec(p.prompt)
      if (!m) continue
      if (p.answer === '=') zeros++
      const [a, b] = [m[1], m[2]]
      const longer = a.length > b.length ? a : b
      if (a.length !== b.length && milli(longer) < milli(longer === a ? b : a)) trap++
    }
    expect(trap).toBeGreaterThan(50)
    expect(zeros).toBeGreaterThan(5)
  })

  it('names and formatting are exact', () => {
    expect(decText(3472)).toBe('3.472')
    expect(decText(3400)).toBe('3.4')
    expect(decText(3000, 1)).toBe('3.0')
    expect(decText(3450000)).toBe('3,450')
    expect(decName(3420)).toBe('three and forty-two hundredths')
    expect(decName(7)).toBe('seven thousandths')
    expect(decName(5100)).toBe('five and one tenth')
    expect(expandedText(4306)).toBe('4 + 0.3 + 0.006')
    expect(expandedText(14050)).toBe('10 + 4 + 0.05')
  })
})

describe('g5Gates (Tower Battlefront)', () => {
  it('fraction and decimal questions, short, each re-solved', () => {
    const subs = new Set<string>()
    for (const p of draw({ kind: 'g5Gates' })) {
      wellFormed(p)
      expect(p.prompt.length, p.prompt).toBeLessThanOrEqual(70)
      subs.add(p.subtopic!)
      const t = p.prompt
      let m: RegExpExecArray | null
      if ((m = /^(\d+)\/(\d+) = \?\/(\d+)$/.exec(t))) expect(Number(p.answer) * +m[2]).toBe(+m[1] * +m[3])
      else if ((m = /^(\d+)\/(\d+) \+ (\d+)\/(\d+) = \?$/.exec(t))) {
        expect(eqR(R(String(p.answer)), add(rat(+m[1], +m[2]), rat(+m[3], +m[4])))).toBe(true)
        oneAmount(p, R)
      } else if ((m = /^Which makes \d+ bigger: × ([\d.]+) or × ([\d.]+)\?$/.exec(t))) expect(p.answer).toBe(`× ${milli(m[1]) > 1000 ? m[1] : m[2]}`)
      else if ((m = /^Which is more: 1\/(\d+) of (\d+) or 1\/(\d+) of \2\?$/.exec(t))) expect(p.answer).toBe(`1/${Math.min(+m[1], +m[3])} of ${m[2]}`)
      else if (/^\d+\/\d+ \? \d+\/\d+$/.test(t)) checkFraction(p)
      else checkDecimal(p)
    }
    for (const s of ['compare', 'equivalent', 'add-like', 'add-unlike', 'digit-value', 'compare-decimals', 'fraction-to-decimal', 'scale', 'unit-of-group']) expect(subs.has(s), s).toBe(true)
  })
})
