import { randInt } from '../../random'

/**
 * Word Problem Woods, 5th grade (5.OA.1–2 with 5.NBT.5–6): the multi-step
 * story bank and the "write the expression" phrases. Every story is a
 * template: `make()` draws its numbers, `text` tells it, `expr` is the
 * expression that solves it (worked out by the expression reader, so the
 * answer is never typed by hand), and `wrong` are the expressions kids
 * really write for it (a step left out, the wrong operation, the numbers in
 * the wrong place).
 */

export type Nums = Record<string, number>

export interface WoodsStory {
  id: string
  make: () => Nums
  text: (n: Nums) => string
  expr: (n: Nums) => string
  wrong: (n: Nums) => string[]
}

export const WOODS_STORIES: WoodsStory[] = [
  {
    id: 'markers',
    make: () => ({ p: randInt(4, 12), m: randInt(12, 36), g: randInt(11, 40) }),
    text: (n) => `A class buys ${n.p} packs of ${n.m} markers and gives ${n.g} markers away. How many markers does the class have left?`,
    expr: (n) => `${n.p} × ${n.m} − ${n.g}`,
    wrong: (n) => [`${n.p} × ${n.m} + ${n.g}`, `${n.p} × ${n.m}`, `${n.p} + ${n.m} − ${n.g}`],
  },
  {
    id: 'tickets',
    make: () => ({ x: randInt(6, 14), y: randInt(15, 25), k: randInt(3, 12), a: randInt(2, 6) }),
    text: (n) => `Tickets cost $${n.x} for kids and $${n.y} for adults. How many dollars do ${n.k} kids and ${n.a} adults pay in all?`,
    expr: (n) => `${n.k} × ${n.x} + ${n.a} × ${n.y}`,
    wrong: (n) => [`(${n.k} + ${n.a}) × ${n.x}`, `${n.k} × ${n.y} + ${n.a} × ${n.x}`, `(${n.k} + ${n.a}) × ${n.y}`],
  },
  {
    id: 'share',
    make: () => {
      const f = randInt(3, 8)
      const e = randInt(6, 25)
      const k = randInt(4, 15)
      return { t: f * e + k, k, f }
    },
    text: (n) => `Mia has ${n.t} stickers. She keeps ${n.k} and shares the rest equally among ${n.f} friends. How many stickers does each friend get?`,
    expr: (n) => `(${n.t} − ${n.k}) ÷ ${n.f}`,
    wrong: (n) => [`(${n.t} + ${n.k}) ÷ ${n.f}`, `${n.t} − ${n.k}`, `${n.t} ÷ ${n.f}`],
  },
  {
    id: 'savings',
    make: () => {
      const s = randInt(6, 15)
      const w = randInt(8, 20)
      return { s, w, c: randInt(25, Math.min(60, s * w - 10)) }
    },
    text: (n) => `Leo saves $${n.s} each week for ${n.w} weeks. Then he spends $${n.c} on a bike helmet. How many dollars does he have left?`,
    expr: (n) => `${n.s} × ${n.w} − ${n.c}`,
    wrong: (n) => [`${n.s} × ${n.w} + ${n.c}`, `${n.s} + ${n.w} − ${n.c}`, `${n.s} × ${n.w}`],
  },
  {
    id: 'garden',
    make: () => ({ r: randInt(12, 24), p: randInt(13, 28), e: randInt(15, 60) }),
    text: (n) => `A garden has ${n.r} rows of ${n.p} lettuce plants. Rabbits eat ${n.e} of the plants. How many plants are left?`,
    expr: (n) => `${n.r} × ${n.p} − ${n.e}`,
    wrong: (n) => [`${n.r} × ${n.p} + ${n.e}`, `${n.r} × ${n.p}`, `${n.r} × (${n.p} − ${n.e})`],
  },
  {
    id: 'crayons',
    make: () => {
      const n = randInt(3, 8)
      const c = n * randInt(3, 6)
      return { b: randInt(4, 12), c, n }
    },
    text: (n) => `There are ${n.b} boxes with ${n.c} crayons in each box. The crayons are shared equally among ${n.n} tables. How many crayons does each table get?`,
    expr: (n) => `${n.b} × ${n.c} ÷ ${n.n}`,
    wrong: (n) => [`${n.b} × ${n.c}`, `${n.b} + ${n.c} ÷ ${n.n}`, `${n.b} × ${n.c} − ${n.n}`],
  },
  {
    id: 'laps',
    make: () => ({ w: randInt(150, 400), l: randInt(4, 12), m: randInt(200, 450) }),
    text: (n) => `Ana warms up by running ${n.w} meters. Then she swims ${n.l} laps of ${n.m} meters each. How many meters does she go in all?`,
    expr: (n) => `${n.w} + ${n.l} × ${n.m}`,
    wrong: (n) => [`(${n.w} + ${n.l}) × ${n.m}`, `${n.l} × ${n.m}`, `${n.w} × ${n.l} + ${n.m}`],
  },
  {
    id: 'bakery',
    make: () => {
      const b = randInt(4, 8)
      const t = randInt(4, 9)
      const c = randInt(12, 24)
      const total = t * c
      let s = randInt(10, Math.floor(total / 2))
      s += (total - s) % b
      return { t, c, s, b }
    },
    text: (n) => `A bakery bakes ${n.t} trays of ${n.c} cookies. It sells ${n.s} cookies and packs the rest in bags of ${n.b}. How many bags does it fill?`,
    expr: (n) => `(${n.t} × ${n.c} − ${n.s}) ÷ ${n.b}`,
    wrong: (n) => [`(${n.t} × ${n.c} + ${n.s}) ÷ ${n.b}`, `${n.t} × ${n.c} − ${n.s}`, `${n.t} × ${n.c} ÷ ${n.b}`],
  },
  {
    id: 'teams',
    make: () => ({ n: randInt(14, 48), k: randInt(2, 5) }),
    text: (n) => `The Hawks scored ${n.n} points. The Owls scored ${n.k} times as many points as the Hawks. How many points did the two teams score together?`,
    expr: (n) => `${n.n} + ${n.k} × ${n.n}`,
    wrong: (n) => [`${n.k} × ${n.n}`, `${n.n} + ${n.k}`, `${n.n} × ${n.k} + ${n.k}`],
  },
  {
    id: 'pool',
    make: () => {
      const r = randInt(12, 45)
      const m = randInt(8, 30)
      const h = randInt(50, 400)
      return { T: h + r * m, h, r }
    },
    text: (n) => `A pool holds ${n.T} liters. It already has ${n.h} liters in it, and a hose adds ${n.r} liters a minute. How many minutes until it is full?`,
    expr: (n) => `(${n.T} − ${n.h}) ÷ ${n.r}`,
    wrong: (n) => [`${n.T} − ${n.h}`, `(${n.T} + ${n.h}) ÷ ${n.r}`, `${n.T} ÷ ${n.r}`],
  },
  {
    id: 'trip',
    make: () => ({ m: randInt(120, 380), d: randInt(3, 7), w: randInt(25, 95) }),
    text: (n) => `A family drives ${n.m} miles a day for ${n.d} days, then ${n.w} more miles to the beach. How many miles do they drive in all?`,
    expr: (n) => `${n.m} × ${n.d} + ${n.w}`,
    wrong: (n) => [`${n.m} × (${n.d} + ${n.w})`, `${n.m} + ${n.d} + ${n.w}`, `${n.m} × ${n.d}`],
  },
  {
    id: 'store',
    make: () => {
      const q = randInt(3, 9)
      const p = randInt(3, 9)
      return { q, p, P: q * p + randInt(5, 40) }
    },
    text: (n) => `Sam buys ${n.q} notebooks for $${n.p} each and pays with $${n.P}. How many dollars of change does he get?`,
    expr: (n) => `${n.P} − ${n.q} × ${n.p}`,
    wrong: (n) => [`${n.q} × ${n.p}`, `${n.P} − ${n.q} − ${n.p}`, `${n.P} + ${n.q} × ${n.p}`],
  },
]

/**
 * "Write the expression" phrases (5.OA.2): `right` is the expression the words
 * describe; `wrong` keep the same numbers but group them another way. The
 * provider keeps only wrong ones whose value differs from the right one, so
 * exactly one choice means what the words say.
 */
export interface ExprPhrase {
  id: string
  make: () => Nums
  words: (n: Nums) => string
  right: (n: Nums) => string
  wrong: (n: Nums) => string[]
}

export const EXPR_PHRASES: ExprPhrase[] = [
  {
    id: 'addThenTimes',
    make: () => ({ a: randInt(3, 12), b: randInt(3, 12), c: randInt(2, 9) }),
    words: (n) => `Add ${n.a} and ${n.b}, then multiply by ${n.c}.`,
    right: (n) => `${n.c} × (${n.a} + ${n.b})`,
    wrong: (n) => [`${n.c} × ${n.a} + ${n.b}`, `${n.a} + ${n.b} × ${n.c}`, `(${n.c} + ${n.a}) × ${n.b}`],
  },
  {
    id: 'timesThenAdd',
    make: () => ({ a: randInt(3, 9), b: randInt(3, 9), c: randInt(2, 15) }),
    words: (n) => `Multiply ${n.a} by ${n.b}, then add ${n.c}.`,
    right: (n) => `${n.a} × ${n.b} + ${n.c}`,
    wrong: (n) => [`${n.a} × (${n.b} + ${n.c})`, `(${n.a} + ${n.c}) × ${n.b}`, `${n.a} + ${n.b} × ${n.c}`],
  },
  {
    id: 'subtractThenDivide',
    make: () => {
      const c = randInt(2, 6)
      const a = randInt(2, 15)
      return { a, b: a + c * randInt(2, 9), c }
    },
    words: (n) => `Subtract ${n.a} from ${n.b}, then divide by ${n.c}.`,
    right: (n) => `(${n.b} − ${n.a}) ÷ ${n.c}`,
    wrong: (n) => [`${n.b} − ${n.a} ÷ ${n.c}`, `(${n.a} − ${n.b}) ÷ ${n.c}`, `${n.c} ÷ (${n.b} − ${n.a})`],
  },
  {
    id: 'addToProduct',
    make: () => ({ a: randInt(3, 9), b: randInt(3, 9), c: randInt(2, 20) }),
    words: (n) => `Add ${n.c} to the product of ${n.a} and ${n.b}.`,
    right: (n) => `${n.c} + ${n.a} × ${n.b}`,
    wrong: (n) => [`(${n.c} + ${n.a}) × ${n.b}`, `${n.c} × ${n.a} + ${n.b}`, `${n.c} + ${n.a} + ${n.b}`],
  },
  {
    id: 'tripleSum',
    make: () => ({ a: randInt(4, 20), b: randInt(4, 20) }),
    words: (n) => `Triple the sum of ${n.a} and ${n.b}.`,
    right: (n) => `3 × (${n.a} + ${n.b})`,
    wrong: (n) => [`3 × ${n.a} + ${n.b}`, `3 + ${n.a} + ${n.b}`, `${n.a} + 3 × ${n.b}`],
  },
  {
    id: 'doubleDifference',
    make: () => {
      const b = randInt(3, 20)
      return { a: b + randInt(2, 15), b }
    },
    words: (n) => `Double the difference of ${n.a} and ${n.b}.`,
    right: (n) => `2 × (${n.a} − ${n.b})`,
    wrong: (n) => [`2 × ${n.a} − ${n.b}`, `2 + (${n.a} − ${n.b})`, `${n.a} − 2 × ${n.b}`],
  },
  {
    id: 'halfSum',
    make: () => {
      const a = randInt(3, 30)
      return { a, b: randInt(1, 15) * 2 + (a % 2) }
    },
    words: (n) => `Find half of the sum of ${n.a} and ${n.b}.`,
    right: (n) => `(${n.a} + ${n.b}) ÷ 2`,
    wrong: (n) => [`${n.a} + ${n.b} ÷ 2`, `(${n.a} + ${n.b}) × 2`, `${n.a} ÷ 2 + ${n.b}`],
  },
  {
    id: 'divideThenSubtract',
    make: () => {
      const b = randInt(2, 9)
      const q = randInt(4, 12)
      return { a: b * q, b, c: randInt(1, q - 1) }
    },
    words: (n) => `Divide ${n.a} by ${n.b}, then subtract ${n.c}.`,
    right: (n) => `${n.a} ÷ ${n.b} − ${n.c}`,
    wrong: (n) => [`${n.a} ÷ (${n.b} − ${n.c})`, `${n.b} ÷ ${n.a} − ${n.c}`, `${n.a} − ${n.b} ÷ ${n.c}`],
  },
  {
    id: 'sumTimesDifference',
    make: () => {
      const d = randInt(2, 9)
      return { a: randInt(2, 9), b: randInt(2, 9), c: d + randInt(1, 8), d }
    },
    words: (n) => `Multiply the sum of ${n.a} and ${n.b} by the difference of ${n.c} and ${n.d}.`,
    right: (n) => `(${n.a} + ${n.b}) × (${n.c} − ${n.d})`,
    wrong: (n) => [`${n.a} + ${n.b} × ${n.c} − ${n.d}`, `(${n.a} + ${n.b} × ${n.c}) − ${n.d}`, `${n.a} + (${n.b} × ${n.c} − ${n.d})`],
  },
  {
    id: 'bracketed',
    make: () => ({ a: randInt(2, 12), b: randInt(2, 6), c: randInt(2, 6), d: randInt(2, 4) }),
    words: (n) => `Multiply ${n.b} by ${n.c}, add ${n.a}, then multiply the result by ${n.d}.`,
    right: (n) => `${n.d} × [${n.a} + (${n.b} × ${n.c})]`,
    wrong: (n) => [`${n.d} × ${n.a} + ${n.b} × ${n.c}`, `[${n.d} × (${n.a} + ${n.b})] × ${n.c}`, `${n.d} + [${n.a} × (${n.b} + ${n.c})]`],
  },
]

/**
 * Expression shapes for "work it out" (5.OA.1): grouping symbols, the order
 * of operations, brackets around parentheses. Numbers are drawn until every
 * step is a whole number and the answer is a friendly size.
 */
export const EVAL_SHAPES: ((r: (lo: number, hi: number) => number) => string)[] = [
  (r) => `${r(2, 30)} + ${r(2, 9)} × ${r(2, 9)}`,
  (r) => `(${r(2, 15)} + ${r(2, 15)}) × ${r(2, 9)}`,
  (r) => `${r(2, 9)} × (${r(8, 20)} − ${r(1, 7)})`,
  (r) => `${r(40, 90)} − ${r(2, 9)} × ${r(2, 9)}`,
  (r) => `(${r(20, 80)} − ${r(2, 19)}) ÷ ${r(2, 9)}`,
  (r) => `${r(12, 72)} ÷ ${r(2, 9)} + ${r(2, 9)} × ${r(2, 9)}`,
  (r) => `[${r(2, 6)} × (${r(2, 9)} + ${r(2, 9)})] − ${r(2, 20)}`,
  (r) => `${r(2, 6)} × [${r(15, 30)} − (${r(2, 7)} + ${r(2, 7)})]`,
  (r) => `(${r(3, 12)} + ${r(3, 12)}) × (${r(8, 15)} − ${r(1, 7)})`,
  (r) => `${r(10, 40)} + ${r(2, 9)} × ${r(2, 9)} − ${r(2, 20)}`,
  (r) => `[(${r(2, 12)} + ${r(2, 12)}) × ${r(2, 6)}] ÷ ${r(2, 6)}`,
  (r) => `${r(2, 4)} × [${r(2, 10)} + (${r(2, 6)} × ${r(2, 6)})]`,
  (r) => `${r(24, 96)} ÷ (${r(8, 15)} − ${r(2, 7)})`,
]
