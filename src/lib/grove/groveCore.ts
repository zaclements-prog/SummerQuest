import type { Problem } from '../problem'
import { hitScore, type HitScore } from '../../games/_juice/score'

/**
 * Pure logic for Times Grove (docs/superpowers/specs/2026-10-16-times-grove-
 * design.md + the 2026-10-17 fun pass). No three.js, no DOM: the array
 * mechanics are unit-tested here before anything renders.
 *
 * A planting order describes an array ("3 rows of 4"). Since the fun pass the
 * kid BUILDS it: the planting field grows a rectangle of saplings from its
 * corner seed bag to wherever the kid stands (walk right = a longer row, walk
 * down = another equal row snaps in), and standing still roots it. The built
 * shape is judged against the order (`judgePlanting`): exact, turned (the
 * same array rotated — commutativity, still right) or wrong (and it shows its
 * own count). The older three-plot helpers (`groveCandidates`, …) remain for
 * the provider's options and the chant copy.
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

// ── the planting field ───────────────────────────────────────────────────────

/**
 * The field the kid plants in, in the grove's local frame (+x runs right
 * across the screen, +z toward the camera). Tile (0, 0) — the seed bag — is the
 * top-left corner; rows count down the screen, columns count to the right, the
 * way kids read and write.
 */
export const FIELD = { rows: 7, cols: 7, pitch: 0.82 } as const

export interface Tile {
  r: number
  c: number
}

/** Local (x, z) of tile (0, 0)'s centre (the field is centred on the origin). */
export function fieldOrigin(): [number, number] {
  return [-((FIELD.cols - 1) / 2) * FIELD.pitch, -((FIELD.rows - 1) / 2) * FIELD.pitch]
}

/** Local (x, z) of a tile centre. */
export function tileCenter(r: number, c: number): [number, number] {
  const [x0, z0] = fieldOrigin()
  return [x0 + c * FIELD.pitch, z0 + r * FIELD.pitch]
}

/**
 * The tile under a point, with hysteresis: while the kid stands near a tile
 * border the tile only changes once they are `margin` units into the new one
 * (no flicker of saplings popping in and out). Off the field → null.
 */
export function tileAt(lx: number, lz: number, prev: Tile | null, margin = 0.14): Tile | null {
  const [x0, z0] = fieldOrigin()
  const fc = (lx - x0) / FIELD.pitch
  const fr = (lz - z0) / FIELD.pitch
  const half = 0.5
  if (fc < -half || fr < -half || fc > FIELD.cols - half || fr > FIELD.rows - half) return null
  let c = Math.min(FIELD.cols - 1, Math.max(0, Math.round(fc)))
  let r = Math.min(FIELD.rows - 1, Math.max(0, Math.round(fr)))
  if (prev) {
    const m = margin / FIELD.pitch
    // stay on the previous tile until clearly inside a neighbour
    if (Math.abs(fc - prev.c) < half + m) c = prev.c
    if (Math.abs(fr - prev.r) < half + m) r = prev.r
    if (r === prev.r && c === prev.c) return prev
  }
  return { r, c }
}

export interface Planted {
  rows: number
  cols: number
}

/** The rectangle planted from the seed bag (0, 0) to the kid's tile, inclusive. */
export function plantedShape(tile: Tile | null): Planted | null {
  return tile ? { rows: tile.r + 1, cols: tile.c + 1 } : null
}

/** Shapes still being laid out (a single row or column) never root on their own. */
export function isCommittable(p: Planted | null): p is Planted {
  return !!p && p.rows >= 2 && p.cols >= 2
}

// ── orders and judging ──────────────────────────────────────────────────────

/**
 * - `order`: plant exactly `rows` rows of `cols`;
 * - `missing`: plant `rows` rows that make `total` trees (find the row size: rows × ? = total);
 * - `total`: plant `total` trees in equal rows, any way that works (factor pairs);
 * - `finale`: a big order against the bloom clock, worth double.
 */
export type GroveTaskKind = 'order' | 'missing' | 'total' | 'finale'

export interface GroveTask {
  kind: GroveTaskKind
  rows: number
  cols: number
  total: number
  /** Show row/column numbers on the field edges (warm-ups: the scaffold fades after). */
  labels: boolean
  /** Seconds of "bloom clock": answering inside it earns a speed bonus. */
  par: number
  base: number
}

export type Verdict = 'exact' | 'turned' | 'wrong'

/**
 * Judge a rooted shape against the task. A turned array (4 rows of 3 for "3
 * rows of 4") plants the same trees: it counts as right — that IS the
 * commutativity lesson — and the game says so out loud.
 */
export function judgePlanting(task: Pick<GroveTask, 'kind' | 'rows' | 'cols' | 'total'>, p: Planted): Verdict {
  if (task.kind === 'total') return p.rows >= 2 && p.cols >= 2 && p.rows * p.cols === task.total ? 'exact' : 'wrong'
  if (p.rows === task.rows && p.cols === task.cols) return 'exact'
  if (p.rows === task.cols && p.cols === task.rows) return 'turned'
  return 'wrong'
}

/** Every rows × cols arrangement of `total` with both sides in [2, max]. */
export function factorPairs(total: number, max: number = FIELD.rows): [number, number][] {
  const out: [number, number][] = []
  for (let r = 2; r <= max; r++) if (total % r === 0 && total / r >= 2 && total / r <= max) out.push([r, total / r])
  return out
}

/** Really different shapes for a total (a turned array counts once): 12 → 2 (2×6, 3×4). */
export function waysToPlant(total: number, max: number = FIELD.rows): number {
  return factorPairs(total, max).filter(([r, c]) => r <= c).length
}

/** The skip-count chant for a bloom: 4, 8, 12 for 3 rows of 4. */
export function skipCount(rows: number, cols: number): number[] {
  return Array.from({ length: Math.max(0, rows) }, (_, i) => (i + 1) * cols)
}

/** Grade → the biggest factor a grove order may use (the field is 7 × 7). */
export function groveMaxFactor(grade: number | undefined): number {
  return grade === 2 ? 5 : grade === 3 ? 6 : 7
}

const PAR: Record<GroveTaskKind, number> = { order: 18, missing: 24, total: 24, finale: 26 }
export const WARM_PAR = 22
export const ORDER_POINTS = 100
export const FINALE_POINTS = 200

/**
 * A run of `n` orders: one or two small warm-ups with the field's row and
 * column numbers showing, then the middle rounds cycling order → missing
 * number → any equal rows (each a little bigger), and the finale: the biggest
 * order available. `shapes` is the grade's order bank (rows × cols pairs).
 */
export function planGroveRun(n: number, shapes: readonly { rows: number; cols: number }[], rng: () => number = Math.random): GroveTask[] {
  const count = Math.max(1, Math.floor(n))
  const pool = [...shapes].filter((s) => s.rows >= 2 && s.cols >= 2 && s.rows <= FIELD.rows && s.cols <= FIELD.cols)
  if (pool.length === 0) throw new Error('grove run needs at least one order')
  pool.sort((a, b) => a.rows * a.cols - b.rows * b.cols || a.rows - b.rows)
  const pick = (from: { rows: number; cols: number }[]) => from[Math.min(from.length - 1, Math.floor(rng() * from.length))]
  // prefer orders (and totals) the run hasn't used yet: every order should feel new
  const used = new Set<string>()
  const usedTotals = new Set<number>()
  const key = (s: { rows: number; cols: number }) => `${s.rows}x${s.cols}`
  const fresh = (list: { rows: number; cols: number }[]) => {
    const f = list.filter((s) => !used.has(key(s)) && !usedTotals.has(s.rows * s.cols))
    if (f.length) return f
    const g = list.filter((s) => !used.has(key(s)))
    return g.length ? g : list
  }
  const task = (s: { rows: number; cols: number }, kind: GroveTaskKind, labels: boolean, par: number): GroveTask => {
    used.add(key(s))
    usedTotals.add(s.rows * s.cols)
    return { kind, rows: s.rows, cols: s.cols, total: s.rows * s.cols, labels, par, base: kind === 'finale' ? FINALE_POINTS : ORDER_POINTS }
  }

  const warm = count >= 4 ? 2 : count >= 2 ? 1 : 0
  const middle = count - 1 - warm
  const out: GroveTask[] = []
  const third = Math.max(1, Math.ceil(pool.length / 3))
  for (let i = 0; i < warm; i++) out.push(task(pick(fresh(pool.slice(0, third + i))), 'order', true, WARM_PAR))

  // the finale is chosen first — the biggest order there is — so the middle
  // never steals it (or its total)
  const biggest = pool[pool.length - 1].rows * pool[pool.length - 1].cols
  const finale = pick(pool.filter((s) => s.rows * s.cols === biggest))
  used.add(key(finale))
  usedTotals.add(finale.rows * finale.cols)

  const cycle: GroveTaskKind[] = ['order', 'total', 'missing']
  for (let i = 0; i < middle; i++) {
    // middle shapes climb from the lower-middle of the bank toward the top
    const lo = Math.min(pool.length - 1, third)
    const hi = Math.max(lo + 1, pool.length - 2)
    const band = pool.slice(lo, hi)
    const span = band.length ? band : pool
    const at = middle === 1 ? 0.5 : i / (middle - 1)
    const center = Math.round(at * (span.length - 1))
    const near = span.slice(Math.max(0, center - 1), center + 2)
    let kind = cycle[i % cycle.length]
    let s = pick(fresh(near))
    if (kind === 'total') {
      // "12 in equal rows" needs a total with two really different shapes
      // (not just a turned one) — on a 7 × 7 field that's 12: 2 × 6 or 3 × 4
      const multi = pool.filter((x) => waysToPlant(x.rows * x.cols) >= 2)
      if (multi.length) s = pick(fresh(multi))
      else kind = 'order'
    }
    out.push(task(s, kind, false, PAR[kind]))
  }
  out.push(task(finale, 'finale', false, PAR.finale))
  return out
}

/**
 * Points for a rooted, right planting: base + bloom-clock bonus (the share of
 * the clock still left) × the streak multiplier.
 */
export function plantPoints({ task, elapsed, streak }: { task: Pick<GroveTask, 'base' | 'par'>; elapsed: number; streak: number }): HitScore {
  return hitScore({ base: task.base, fractionLeft: 1 - elapsed / task.par, streak })
}
