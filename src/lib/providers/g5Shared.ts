import { randInt, shuffle } from '../random'

/**
 * Small helpers shared by the 5th-grade Multiplication Mesa, Division Dunes and
 * Word Problem Woods providers (g5Mult, g5Div, g5Expr).
 */

/** A whole number the US way: 12,345 (never the German 12.345, whatever the tablet's locale). */
export function fmt(n: number): string {
  return n.toLocaleString('en-US')
}

/** A random element. */
export function pick<T>(xs: readonly T[]): T {
  return xs[Math.floor(Math.random() * xs.length)]
}

/** A weighted choice between labelled options. */
export function weighted<T extends string>(table: readonly (readonly [T, number])[]): T {
  const total = table.reduce((s, [, w]) => s + w, 0)
  let r = Math.random() * total
  for (const [k, w] of table) {
    r -= w
    if (r < 0) return k
  }
  return table[table.length - 1][0]
}

/**
 * Four number choices, written the US way: the answer and three different
 * wrong ones. Wrong ones come from `candidates` first (each a real
 * misconception), skipping repeats, the answer itself and anything that isn't
 * a positive whole number; then from `fill` (close slips) until there are three.
 */
export function numberOptions(answer: number, candidates: number[], fill: () => number = () => answer + randInt(1, 9)): { options: string[]; answer: string } {
  const seen = new Set<number>([answer])
  const wrong: number[] = []
  const take = (n: number) => {
    if (wrong.length >= 3 || !Number.isInteger(n) || n <= 0 || seen.has(n)) return
    seen.add(n)
    wrong.push(n)
  }
  for (const c of candidates) take(c)
  for (let i = 0; wrong.length < 3 && i < 60; i++) take(fill())
  for (let k = 1; wrong.length < 3; k++) take(answer + k)
  return { options: shuffle([answer, ...wrong]).map(fmt), answer: fmt(answer) }
}

/**
 * Text choices: the answer and up to three distinct wrong ones (the first
 * three that differ from the answer and from each other), shuffled.
 */
export function textOptions(answer: string, wrong: string[]): { options: string[]; answer: string } {
  const seen = new Set<string>([answer])
  const out: string[] = []
  for (const w of wrong) {
    if (out.length >= 3 || seen.has(w)) continue
    seen.add(w)
    out.push(w)
  }
  return { options: shuffle([answer, ...out]), answer }
}

/** 10 to the nth power, written with a superscript: 10³. */
const SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹']
export function pow10Text(n: number): string {
  return `10${String(n)
    .split('')
    .map((d) => SUP[Number(d)])
    .join('')}`
}
