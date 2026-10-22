import type { Problem, ProblemProvider } from '../problem'
import { add, compare, gcd, int, mul, rat, sub, type Rational } from '../numbers'
import { randInt, shuffle } from '../random'
import { MINUS, fracOptions, fracText, lcm, pick, properOf, rawFrac, ratOrNull, weighted } from './fracDecKit'

/**
 * Fraction Falls, 5th grade (CCSS 5.NF.1–4): adding and subtracting fractions
 * and mixed numbers with unlike denominators (by a common denominator),
 * multiplying a fraction by a whole number or a fraction (the area model), and
 * fractions as division (3 ÷ 4 = 3/4, sharing). Every answer is exact (lib/numbers
 * rationals) and printed in simplest form; distractors come from the real
 * misconceptions (adding tops AND bottoms, renaming only one fraction, flipping
 * a division, forgetting to regroup) and never equal the answer in value.
 *
 * Modes (one per stage):
 *  - `addSub`: + and − with unlike denominators, mixed numbers, the least common
 *    denominator, a benchmark estimate, word problems (5.NF.1–2);
 *  - `timesShare`: fraction × fraction (with an area model), fraction × whole,
 *    word problems, and fractions as division (5.NF.3–4);
 *  - `mixed`: all of it, plus comparing unlike fractions (the boss).
 *
 * `makeForgeSumProvider` serves Fraction Forge's grade-5 mode: a + of two unlike
 * fractions whose common denominator fits the forge's gauge.
 */

export type G5FracMode = 'addSub' | 'timesShare' | 'mixed'

export interface G5FractionsConfig {
  mode: G5FracMode
}

export const G5_FRAC_SKILLS = {
  addSub: { id: 'g5-frac-addsub', label: 'adding and subtracting fractions' },
  mult: { id: 'g5-frac-mult', label: 'multiplying fractions' },
  divide: { id: 'g5-frac-divide', label: 'fractions as division' },
  compare: { id: 'g5-frac-compare', label: 'comparing fractions' },
} as const

const TOPIC = 'g5-fractions'

/** A problem before its id and topic are stamped on. */
type Item = Omit<Problem, 'id' | 'topic'>

/** Denominators a 5th grader adds with (5.NF.1). */
const DENOMS = [2, 3, 4, 5, 6, 8, 10, 12]

/** Every unlike pair (b < d) whose least common denominator is at most `maxLcd`. */
export function unlikePairs(maxLcd: number, denoms: readonly number[] = DENOMS): [number, number][] {
  const out: [number, number][] = []
  for (const b of denoms) for (const d of denoms) if (b < d && lcm(b, d) <= maxLcd) out.push([b, d])
  return out
}

const ADD_PAIRS = unlikePairs(24)
const MIXED_PAIRS = unlikePairs(12)

/** An unlike pair in a random order. */
function pairOf(pairs: [number, number][]): [number, number] {
  const [b, d] = pick(pairs)
  return Math.random() < 0.5 ? [b, d] : [d, b]
}

const ft = fracText

// ── adding and subtracting (5.NF.1–2) ────────────────────────────────────────

/** "2/3 + 1/4 = ?" or "3/4 − 1/6 = ?": proper fractions, unlike denominators. */
function addSubProper(op: '+' | '−'): Item {
  let [b, d] = pairOf(ADD_PAIRS)
  let f1 = properOf(b)
  let f2 = properOf(d)
  if (op === '−' && compare(f1, f2) < 0) {
    ;[f1, f2] = [f2, f1]
    ;[b, d] = [d, b]
  }
  const L = lcm(b, d)
  const s = op === '+' ? 1 : -1
  const A = (f1.n * L) / b
  const C = (f2.n * L) / d
  const answer = op === '+' ? add(f1, f2) : sub(f1, f2)
  const { options, answer: key } = fracOptions(
    answer,
    [
      ratOrNull(f1.n + s * f2.n, b + s * d), // tops and bottoms
      ratOrNull(f1.n + s * f2.n, L), // tops, no renaming
      ratOrNull(A + s * f2.n, L), // renamed only the first
      ratOrNull(f1.n + s * C, L), // renamed only the second
      ratOrNull(A + s * C + 1, L),
      ratOrNull(A + s * C - 1, L),
    ],
    (k) => (k % 2 ? add(answer, rat(Math.ceil(k / 2), L)) : sub(answer, rat(k / 2, L))),
  )
  const raw = rawFrac(A + s * C, L)
  const sign = op === '+' ? '+' : MINUS
  return {
    prompt: `${ft(f1)} ${sign} ${ft(f2)} = ?`,
    options,
    answer: key,
    subtopic: op === '+' ? 'add' : 'subtract',
    skill: G5_FRAC_SKILLS.addSub,
    hint: `Use ${L} as the common denominator: ${A}/${L} ${sign} ${C}/${L}.`,
    explanation: `${ft(f1)} = ${A}/${L} and ${ft(f2)} = ${C}/${L}, so the answer is ${raw === key ? key : `${raw} = ${key}`}.`,
  }
}

/** "2 1/3 + 1 3/4 = ?" or "3 1/4 − 1 1/2 = ?" (sometimes trading a whole). */
function addSubMixed(op: '+' | '−'): Item {
  const [b, d] = pairOf(MIXED_PAIRS)
  const f1 = properOf(b)
  const f2 = properOf(d)
  const w2 = randInt(1, 3)
  const w1 = op === '−' ? w2 + randInt(1, 3) : randInt(1, 4)
  const m1 = add(int(w1), f1)
  const m2 = add(int(w2), f2)
  const L = lcm(b, d)
  const answer = op === '+' ? add(m1, m2) : sub(m1, m2)
  const fracPart = op === '+' ? add(f1, f2) : sub(f1, f2)
  const regroup = op === '+' ? compare(fracPart, int(1)) >= 0 : compare(fracPart, int(0)) < 0
  const wholes = op === '+' ? w1 + w2 : w1 - w2
  const flipped = sub(f1, f2).n < 0 ? sub(f2, f1) : sub(f1, f2)
  const s = op === '+' ? 1 : -1
  const topsBottoms = ratOrNull(f1.n + s * f2.n, b + s * d)
  const { options, answer: key } = fracOptions(
    answer,
    [
      // subtracting the smaller fraction from the bigger one instead of trading a whole
      op === '−' && regroup ? add(int(wholes), flipped) : null,
      // the carried (or traded) whole forgotten
      regroup ? (op === '+' ? sub(answer, int(1)) : add(answer, int(1))) : null,
      // tops and bottoms added (or subtracted)
      topsBottoms && topsBottoms.n > 0 ? add(int(wholes), topsBottoms) : null,
      add(answer, int(1)),
      answer.n > answer.d ? sub(answer, int(1)) : null,
      add(answer, rat(1, L)),
    ],
    (k) => (k % 2 ? add(answer, rat(Math.ceil(k / 2), L)) : sub(answer, rat(k / 2, L))),
  )
  const sign = op === '+' ? '+' : MINUS
  return {
    prompt: `${ft(m1)} ${sign} ${ft(m2)} = ?`,
    options,
    answer: key,
    subtopic: op === '+' ? 'add-mixed' : 'subtract-mixed',
    skill: G5_FRAC_SKILLS.addSub,
    hint:
      op === '−' && regroup
        ? `${ft(f1)} is less than ${ft(f2)}: trade 1 whole for ${L}/${L} first.`
        : `${op === '+' ? 'Add' : 'Subtract'} the whole numbers, then the fractions (use ${L} as the common denominator).`,
    explanation: `${ft(m1)} ${sign} ${ft(m2)} = ${key}.`,
  }
}

/** "What is the least common denominator of 3/4 and 5/6?" */
function leastCommonDenominator(): Item {
  const [b, d] = pairOf(ADD_PAIRS)
  const f1 = properOf(b)
  const f2 = properOf(d)
  const L = lcm(b, d)
  const wrong = [b + d, b * d, 2 * L, Math.max(b, d), Math.min(b, d)].filter((x) => x !== L)
  const opts = [...new Set(wrong)].slice(0, 3)
  return {
    prompt: `What is the least common denominator of ${ft(f1)} and ${ft(f2)}?`,
    options: shuffle([L, ...opts]),
    answer: L,
    subtopic: 'lcd',
    skill: G5_FRAC_SKILLS.addSub,
    hint: `Count by ${Math.max(b, d)}s until you reach a number ${Math.min(b, d)} also goes into.`,
    explanation: `${L} is the smallest number that both ${b} and ${d} divide evenly.`,
  }
}

/** "Is 2/5 + 3/4 more or less than 1?" (benchmark reasoning, 5.NF.2). Unlike simplest proper fractions never sum to exactly 1. */
function estimateSum(): Item {
  const [b, d] = pairOf(ADD_PAIRS)
  const f1 = properOf(b)
  const f2 = properOf(d)
  const more = compare(add(f1, f2), int(1)) > 0
  const answer = more ? 'more than 1' : 'less than 1'
  return {
    prompt: `Without adding: is ${ft(f1)} + ${ft(f2)} more or less than 1?`,
    options: shuffle(['more than 1', 'less than 1', 'exactly 1']),
    answer,
    subtopic: 'estimate',
    skill: G5_FRAC_SKILLS.addSub,
    hint: 'Compare each fraction to 1/2. Two pieces bigger than a half make more than 1.',
    explanation: `${ft(f1)} + ${ft(f2)} = ${ft(add(f1, f2))}, which is ${answer}.`,
  }
}

const ADD_STORIES: ((a: string, b: string) => string)[] = [
  (a, b) => `Maya ran ${a} mile on Monday and ${b} mile on Tuesday. How many miles did she run in all?`,
  (a, b) => `A recipe uses ${a} cup of milk and ${b} cup of water. How many cups of liquid is that?`,
  (a, b) => `Leo read for ${a} hour before dinner and ${b} hour after. How many hours did he read?`,
]
const SUB_STORIES: ((a: string, b: string) => string)[] = [
  (a, b) => `A ribbon is ${a} yard long. Jo cuts off ${b} yard. How many yards are left?`,
  (a, b) => `A jug holds ${a} gallon of juice. The class drinks ${b} gallon. How much juice is left?`,
  (a, b) => `Ava's plant grew ${a} inch and Ben's grew ${b} inch. How much more did Ava's grow?`,
]

/** A story with + or − of unlike fractions (5.NF.2). */
function addSubStory(): Item {
  const op = Math.random() < 0.5 ? '+' : '−'
  const base = addSubProper(op)
  const [a, b] = base.prompt.replace(' = ?', '').split(op === '+' ? ' + ' : ` ${MINUS} `)
  const story = pick(op === '+' ? ADD_STORIES : SUB_STORIES)
  return { ...base, prompt: story(a, b), subtopic: op === '+' ? 'add-story' : 'subtract-story' }
}

export function addSubItem(): Item {
  return weighted<() => Item>([
    [3, () => addSubProper('+')],
    [3, () => addSubProper('−')],
    [2, () => addSubMixed('+')],
    [2, () => addSubMixed('−')],
    [1, leastCommonDenominator],
    [1, estimateSum],
    [2, addSubStory],
  ])()
}

// ── multiplying (5.NF.4) ─────────────────────────────────────────────────────

/** "2/3 × 3/4 = ?" with an area model: thirds one way, fourths the other, the overlap is the product. */
function fracTimesFrac(): Item {
  const b = randInt(2, 6)
  const d = randInt(2, 6)
  const f1 = properOf(b)
  const f2 = properOf(d)
  const answer = mul(f1, f2)
  const [a, c] = [f1.n, f2.n]
  const { options, answer: key } = fracOptions(
    answer,
    [ratOrNull(a + c, b + d), ratOrNull(a * d, b * c), ratOrNull(a * c, b + d), ratOrNull(a * c, Math.max(b, d)), ratOrNull(a + c, b * d)],
    (k) => (k % 2 ? add(answer, rat(Math.ceil(k / 2), b * d)) : sub(answer, rat(k / 2, b * d))),
  )
  const raw = rawFrac(a * c, b * d)
  return {
    prompt: `${ft(f1)} × ${ft(f2)} = ?`,
    options,
    answer: key,
    subtopic: 'frac-x-frac',
    skill: G5_FRAC_SKILLS.mult,
    visual: { kind: 'fractionArea', a: { numerator: a, denominator: b }, b: { numerator: c, denominator: d } },
    hint: 'Multiply the tops, then multiply the bottoms.',
    explanation: `${a} × ${c} = ${a * c} and ${b} × ${d} = ${b * d}, so the product is ${raw === key ? key : `${raw} = ${key}`}.`,
  }
}

/** "3/4 × 8 = ?" (or "8 × 3/4"): a fraction of a whole number. */
function fracTimesWhole(): Item {
  const b = pick([2, 3, 4, 5, 6, 8, 10])
  const f = properOf(b)
  // half the time the answer is whole (n a multiple of b)
  const n = Math.random() < 0.5 && b <= 6 ? b * randInt(1, Math.floor(12 / b) + 1) : randInt(2, 12)
  const answer = mul(f, int(n))
  const { options, answer: key } = fracOptions(
    answer,
    [int(f.n * n), rat(n, b), f, add(answer, int(1)), compare(answer, int(1)) > 0 ? sub(answer, int(1)) : null],
    (k) => (k % 2 ? add(answer, rat(Math.ceil(k / 2), b)) : sub(answer, rat(k / 2, b))),
  )
  const flip = Math.random() < 0.35
  return {
    prompt: flip ? `${n} × ${ft(f)} = ?` : `${ft(f)} × ${n} = ?`,
    options,
    answer: key,
    subtopic: 'frac-x-whole',
    skill: G5_FRAC_SKILLS.mult,
    hint: `${n} × ${f.n} = ${n * f.n}, then divide by ${b}.`,
    explanation: `${ft(f)} of ${n} is ${n * f.n}/${b} = ${key}.`,
  }
}

/** Multiplying in a story: part of a recipe, the area of a garden, a fraction of a class. */
function multStory(): Item {
  const kind = pick(['recipe', 'garden', 'class'] as const)
  if (kind === 'class') {
    const b = pick([2, 3, 4, 5, 6, 8])
    const f = properOf(b)
    const n = b * randInt(2, Math.max(2, Math.floor(32 / b)))
    const answer = int((n * f.n) / b)
    const { options, answer: key } = fracOptions(answer, [int(n - (n * f.n) / b), int(n / b), int(n * f.n), add(answer, int(1))], (k) => add(answer, int(k + 1)))
    return {
      prompt: `There are ${n} students in a club. ${ft(f)} of them play chess. How many students play chess?`,
      options,
      answer: key,
      subtopic: 'frac-of-set',
      skill: G5_FRAC_SKILLS.mult,
      hint: `Split ${n} into ${b} equal groups, then take ${f.n}.`,
      explanation: `${n} ÷ ${b} = ${n / b}, and ${f.n} × ${n / b} = ${key}.`,
    }
  }
  const base = fracTimesFrac()
  const [a, b] = base.prompt.replace(' = ?', '').split(' × ')
  const prompt =
    kind === 'recipe'
      ? `A recipe needs ${a} cup of sugar. You make ${b} of the recipe. How many cups of sugar do you need?`
      : `A garden bed is ${a} yard long and ${b} yard wide. What is its area in square yards?`
  return { ...base, prompt, subtopic: kind === 'recipe' ? 'mult-story' : 'area-story' }
}

export function multiplyItem(): Item {
  return weighted<() => Item>([
    [4, fracTimesFrac],
    [3, fracTimesWhole],
    [2, multStory],
  ])()
}

// ── fractions as division (5.NF.3) ───────────────────────────────────────────

/** A dividend and divisor whose quotient isn't whole. */
function shareNumbers(maxA = 12): [number, number] {
  for (;;) {
    const b = randInt(2, 10)
    const a = randInt(1, maxA)
    if (a % b !== 0) return [a, b]
  }
}

/** "3 ÷ 4 = ?" → 3/4; "7 ÷ 3 = ?" → 2 1/3. */
function divisionAsFraction(): Item {
  const [a, b] = shareNumbers()
  const answer = rat(a, b)
  const { options, answer: key } = fracOptions(
    answer,
    [rat(b, a), rat(1, b), ratOrNull(a + 1, b), ratOrNull(a - 1, b), a > b ? add(int(Math.floor(a / b)), rat(a % b, a)) : null],
    (k) => add(answer, rat(k, b)),
  )
  return {
    prompt: `${a} ÷ ${b} = ?`,
    options,
    answer: key,
    subtopic: 'divide-as-fraction',
    skill: G5_FRAC_SKILLS.divide,
    hint: `${a} ÷ ${b} is the same as the fraction ${a}/${b}.`,
    explanation: `${a} ÷ ${b} = ${a}/${b}${rawFrac(a, b) === key ? '' : ` = ${key}`}.`,
  }
}

const SHARE_STORIES: ((a: number, b: number) => string)[] = [
  (a, b) => `${a} pizzas are shared equally by ${b} friends. How much pizza does each friend get?`,
  (a, b) => `${a} pounds of clay are shared equally by ${b} artists. How many pounds does each artist get?`,
  (a, b) => `${a} liters of lemonade are poured equally into ${b} jugs. How many liters go in each jug?`,
  (a, b) => `${a} granola bars are split equally among ${b} hikers. How many bars does each hiker get?`,
]

/** Sharing: "3 pizzas are shared equally by 4 friends…" → 3/4. */
function shareStory(): Item {
  let [aa, b] = shareNumbers(9)
  while (aa < 2) [aa, b] = shareNumbers(9)
  const answer = rat(aa, b)
  const { options, answer: key } = fracOptions(answer, [rat(b, aa), rat(1, b), ratOrNull(aa, b + aa), ratOrNull(aa - 1, b)], (k) => add(answer, rat(k, b)))
  return {
    prompt: pick(SHARE_STORIES)(aa, b),
    options,
    answer: key,
    subtopic: 'share-story',
    skill: G5_FRAC_SKILLS.divide,
    hint: `Sharing ${aa} among ${b} is ${aa} ÷ ${b}, which is ${aa}/${b}.`,
    explanation: `Each one gets ${aa} ÷ ${b} = ${key}.`,
  }
}

/** "9 people share a 50-pound sack of rice equally. Between which two whole numbers…?" (the standard's own example). */
function shareBetween(): Item {
  let n = 0
  let w = 0
  do {
    n = randInt(3, 9)
    w = randInt(20, 60)
  } while (w % n === 0)
  const q = Math.floor(w / n)
  const pair = (x: number) => `${x} and ${x + 1}`
  const answer = pair(q)
  const wrong = [pair(q - 1), pair(q + 1), pair(n), pair(q + 2)].filter((x, i, xs) => x !== answer && xs.indexOf(x) === i && !x.startsWith('0 '))
  return {
    prompt: `${n} people share a ${w}-pound sack of rice equally. Between which two whole numbers of pounds is each share?`,
    options: shuffle([answer, ...wrong.slice(0, 3)]),
    answer,
    subtopic: 'share-between',
    skill: G5_FRAC_SKILLS.divide,
    hint: `Each share is ${w} ÷ ${n}. How many ${n}s fit in ${w}?`,
    explanation: `${w} ÷ ${n} = ${ft(rat(w, n))}, which is between ${q} and ${q + 1}.`,
  }
}

/** "Which division means the same as 5/8?" */
function whichDivision(): Item {
  const [a, b] = shareNumbers()
  const answer = `${a} ÷ ${b}`
  return {
    prompt: `Which division means the same as ${a}/${b}?`,
    options: shuffle([answer, `${b} ÷ ${a}`, `${a} × ${b}`, `${Math.max(a, b)} ${MINUS} ${Math.min(a, b)}`]),
    answer,
    subtopic: 'which-division',
    skill: G5_FRAC_SKILLS.divide,
    hint: 'The top number is what is shared; the bottom is how many share it.',
    explanation: `${a}/${b} means ${a} ÷ ${b}.`,
  }
}

export function shareItem(): Item {
  return weighted<() => Item>([
    [3, divisionAsFraction],
    [3, shareStory],
    [1, shareBetween],
    [1, whichDivision],
  ])()
}

// ── comparing (the boss, the tower gates) ────────────────────────────────────

/** "3/4 ? 5/8": which sign? Unlike denominators; sometimes equivalent (2/3 = 8/12). */
export function compareItem(): Item {
  let n1: number, d1: number, n2: number, d2: number
  if (Math.random() < 0.2) {
    d1 = randInt(2, 6)
    n1 = properOf(d1).n
    const k = randInt(2, Math.floor(12 / d1))
    ;[n2, d2] = [n1 * k, d1 * k]
    if (Math.random() < 0.5) [n1, d1, n2, d2] = [n2, d2, n1, d1]
  } else {
    do {
      d1 = randInt(2, 12)
      d2 = randInt(2, 12)
      n1 = properOf(d1).n
      n2 = properOf(d2).n
    } while (d1 === d2 || n1 * d2 === n2 * d1)
  }
  const cmp = compare(rat(n1, d1), rat(n2, d2))
  const answer = cmp < 0 ? '<' : cmp > 0 ? '>' : '='
  const L = lcm(d1, d2)
  return {
    prompt: `${rawFrac(n1, d1)} ? ${rawFrac(n2, d2)}`,
    options: shuffle(['<', '>', '=']),
    answer,
    subtopic: 'compare',
    skill: G5_FRAC_SKILLS.compare,
    hint: `Rename both with ${L} as the denominator, then compare the tops.`,
    explanation: `${rawFrac(n1, d1)} = ${rawFrac((n1 * L) / d1, L)} and ${rawFrac(n2, d2)} = ${rawFrac((n2 * L) / d2, L)}, so ${rawFrac(n1, d1)} ${answer} ${rawFrac(n2, d2)}.`,
  }
}

// ── the provider ─────────────────────────────────────────────────────────────

function itemFor(mode: G5FracMode): Item {
  switch (mode) {
    case 'addSub':
      return addSubItem()
    case 'timesShare':
      return Math.random() < 0.55 ? multiplyItem() : shareItem()
    case 'mixed':
      return weighted<() => Item>([
        [4, addSubItem],
        [3, multiplyItem],
        [2, shareItem],
        [1, compareItem],
      ])()
  }
}

export function makeG5FractionsProvider(cfg: G5FractionsConfig): ProblemProvider {
  let serial = 0
  return {
    topic: TOPIC,
    next(): Problem {
      return { id: `g5-frac-${serial++}`, topic: TOPIC, ...itemFor(cfg.mode) }
    },
  }
}

// ── Fraction Forge, grade 5: unlike denominators on the gauge ────────────────

/** Denominators the forge's recipe board draws cleanly. */
const FORGE_DENOMS = [2, 3, 4, 5, 6, 8]

/**
 * Every "a/b + c/d" the forge can serve: unlike denominators, both fractions in
 * simplest form, a common denominator the gauge can show (≤ `maxDenom`), and a
 * sum under one whole (it fits the bar). Both orders.
 */
export function forgeSumFacts(maxDenom: number): [Rational, Rational][] {
  const out: [Rational, Rational][] = []
  for (const [b, d] of unlikePairs(maxDenom, FORGE_DENOMS)) {
    for (let a = 1; a < b; a++) {
      if (gcd(a, b) !== 1) continue
      for (let c = 1; c < d; c++) {
        if (gcd(c, d) !== 1) continue
        if (compare(add(rat(a, b), rat(c, d)), int(1)) >= 0) continue
        out.push([rat(a, b), rat(c, d)], [rat(c, d), rat(a, b)])
      }
    }
  }
  return out
}

/**
 * The forge's orders ("1/2 + 1/3 = ?", answer "5/6"), dealt from a shuffled
 * deck so a run doesn't repeat. A plain multiple-choice provider too.
 */
export function makeForgeSumProvider(maxDenom: number): ProblemProvider {
  const facts = forgeSumFacts(maxDenom)
  let deck: [Rational, Rational][] = []
  let serial = 0
  return {
    topic: TOPIC,
    reset: () => {
      deck = []
    },
    next(): Problem {
      if (deck.length === 0) deck = shuffle(facts)
      const [f1, f2] = deck.pop()!
      const L = lcm(f1.d, f2.d)
      const answer = add(f1, f2)
      const { options, answer: key } = fracOptions(
        answer,
        [ratOrNull(f1.n + f2.n, f1.d + f2.d), ratOrNull(f1.n + f2.n, L), ratOrNull((f1.n * L) / f1.d + f2.n, L), ratOrNull(f1.n + (f2.n * L) / f2.d, L)],
        (k) => add(answer, rat(k, L)),
      )
      return {
        id: `g5-forge-${serial++}`,
        topic: TOPIC,
        prompt: `${ft(f1)} + ${ft(f2)} = ?`,
        options,
        answer: key,
        subtopic: 'forge-add',
        skill: G5_FRAC_SKILLS.addSub,
        hint: `Rename both fractions with ${L} as the denominator first.`,
      }
    },
  }
}
