import type { Problem } from '../problem'

/**
 * Pure logic for Times Grove (docs/superpowers/specs/2026-10-16-times-grove-
 * design.md). No three.js, no DOM: the array mechanics are unit-tested here
 * before anything renders.
 *
 * A planting order prompt describes an array ("3 rows of 4"); the answer is
 * HOW MANY trees that is. The game maps each option total to a pre-grown
 * plot — the answer is a place, not a word. Candidates share one dimension
 * with the target on purpose, so picking the right plot means reading BOTH
 * "how many rows" and "how many in each row".
 */

export interface GroveShape {
  rows: number
  cols: number
  total: number
}

const shape = (rows: number, cols: number): GroveShape => ({ rows, cols, total: rows * cols })

/**
 * The three plots for a round: the target first, then two structural
 * siblings — same rows / one column wider, and one row deeper / same
 * columns. All three totals are distinct (rows==cols siblings would tie, so
 * the second sibling goes two rows deeper instead). Dims stay ≥ 1.
 */
export function groveCandidates(rows: number, cols: number): [GroveShape, GroveShape, GroveShape] {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) {
    throw new Error(`bad grove shape ${rows}×${cols}`)
  }
  const wideCol = rows * (cols + 1)
  const deepRow = (rows + (rows === cols ? 2 : 1)) * cols
  if (wideCol === deepRow) throw new Error(`grove candidates tie for ${rows}×${cols}`)
  return [shape(rows, cols), shape(rows, cols + 1), shape(deepRow / cols, cols)]
}

/** Which plot is the one with this total? Throws on an orphan option. */
export function shapeForTotal(shapes: readonly GroveShape[], total: number): GroveShape {
  const hit = shapes.find((s) => s.total === total)
  if (!hit) throw new Error(`no grove shape grows ${total}`)
  return hit
}

export const GROUP_PLURAL: Record<number, string> = {
  2: 'twos',
  3: 'threes',
  4: 'fours',
  5: 'fives',
  6: 'sixes',
  7: 'sevens',
  8: 'eights',
  9: 'nines',
}

/** How the chant says one group of size n, e.g. n=4 → "four". */
export function groupWord(n: number): string {
  return GROUP_PLURAL[n] ?? `${n}s`
}

/** One group of size n, said while pointing at a SINGLE group: "1 four". */
export function groupWordOne(n: number): string {
  return groupWord(n).replace(/s$/, '')
}

/**
 * The count-in-groups chant as the kid crosses its rows. After k rows you
 * have counted k groups of `cols`; the full chant lands on the total.
 * Pure: never mutates anything, hint-safe (digits + plain words only).
 */
export function groveChant(rows: number, cols: number, through: number): string {
  if (through < 1 || through > rows) throw new Error(`chant row ${through} of ${rows}`)
  const word = groupWord(cols)
  const one = groupWordOne(cols)
  const parts: string[] = []
  for (let i = 1; i <= through; i++) parts.push(`${i} ${i === 1 ? one : word}`)
  const tail = through === rows ? ` — ${rows * cols}!` : '…'
  return `${parts.join(', ')}${tail}`
}

/** Win copy for a correct plot, with the commutativity beat when it applies. */
export function groveWinLine(rows: number, cols: number): string {
  const total = rows * cols
  const base = `${groveChant(rows, cols, rows)} You planted ${rows} rows of ${cols} — ${total} trees!`
  return rows === cols ? base : `${base} And ${cols} rows of ${rows} would plant the same ${total}!`
}

/** Wrong-plot copy: a mini-lesson about the shape you actually walked. */
export function groveBadHint(s: GroveShape): string {
  return `That grove is ${s.rows} rows of ${s.cols} — that many is ${s.total}, not this order. Check both numbers and try again!`
}

export const GROVE_ROUNDS = 5

export interface GroveRound {
  prompt: string
  shape: GroveShape
  siblings: [GroveShape, GroveShape, GroveShape]
  factId?: string
}

/** A provider Problem (numeric answer, array visual) → a grove round. */
export function parseGroveRound(p: Pick<Problem, 'prompt' | 'answer' | 'visual' | 'factId'>): GroveRound {
  if (p.visual?.kind !== 'array') throw new Error('grove problem needs an array visual')
  const rows = p.visual.rows
  const cols = p.visual.cols
  const total = rows * cols
  if (p.answer !== total) {
    throw new Error(`grove answer ${p.answer} does not match ${rows}×${cols}`)
  }
  return { prompt: p.prompt, shape: shape(rows, cols), siblings: groveCandidates(rows, cols), factId: p.factId }
}

/** Stars from clean first-try clears: the arena/forge 20 / 60 / 100 % shape. */
export function groveStarThresholds(total: number): [number, number, number] {
  return [Math.max(1, Math.ceil(total * 0.2)), Math.ceil(total * 0.6), total]
}

export function groveStars(correctFirstTry: number, total: number): number {
  const [t1, t2, t3] = groveStarThresholds(total)
  return correctFirstTry >= t3 ? 3 : correctFirstTry >= t2 ? 2 : correctFirstTry >= t1 ? 1 : 0
}
