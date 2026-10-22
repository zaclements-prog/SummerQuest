import type { Problem } from '../problem'
import { areaModel, cellDistractors, cellHint, totalDistractors, type AreaModel } from '../providers/g5Mult'
import { hitScore, type HitScore } from '../../games/_juice/score'
import { fmt } from '../providers/g5Shared'

/**
 * Pure logic for Times Grove's 5th-grade mode, the area-model grove (K–5
 * plan, grade-5 contract: "Times Grove: area models"; 5.NBT.5). No three.js.
 *
 * Each order is a product like 23 × 14. The field is laid out as its area
 * model: 23 split into 20 + 3 down the side, 14 into 10 + 4 across the top,
 * one plot per partial product. Plot by plot, the keeper asks for its
 * partial product ("20 × 4 = ?") and three seed posts offer one each; the kid
 * walks to a post and stands still to plant it. A right post grows the plot;
 * a wrong one wilts, says what it really is, and the kid tries another. When
 * every plot is planted, the posts offer totals: the right total is the harvest.
 * Orders: a small warm-up, a 2-digit by 2-digit order, and a giant 3-digit by
 * 2-digit finale (six plots).
 */

export type AreaStepKind = 'cell' | 'total'

export interface AreaStep {
  kind: AreaStepKind
  /** Row and column of the plot asked (cell steps). */
  i: number
  j: number
  answer: number
  /** The three post numbers (the answer once), in post order. */
  posts: number[]
}

export interface AreaOrder {
  kind: 'warm' | 'main' | 'finale'
  model: AreaModel
  steps: AreaStep[]
}

export const AREA_ROUNDS = 3
export const POST_COUNT = 3

function shuffled<T>(xs: T[], rng: () => number): T[] {
  const out = [...xs]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Three posts: the answer and the first two different real mistakes (else close slips). */
export function postNumbers(answer: number, mistakes: number[], rng: () => number): number[] {
  const wrong: number[] = []
  for (const m of [...mistakes, answer + 10, answer - 10, answer + 1, answer + 100]) {
    if (wrong.length < POST_COUNT - 1 && Number.isInteger(m) && m > 0 && m !== answer && !wrong.includes(m)) wrong.push(m)
  }
  return shuffled([answer, ...wrong], rng)
}

/** One order's steps: every plot (row by row), then the total. */
export function areaSteps(model: AreaModel, rng: () => number): AreaStep[] {
  const steps: AreaStep[] = []
  model.rows.forEach((r, i) =>
    model.cols.forEach((c, j) => {
      // the classic mistakes first, in a random order so each post gets its turn
      const mistakes = shuffled(cellDistractors(r, c).filter((x) => Number.isFinite(x)), rng)
      steps.push({ kind: 'cell', i, j, answer: r * c, posts: postNumbers(r * c, mistakes, rng) })
    }),
  )
  const [diag, ...rest] = totalDistractors(model)
  steps.push({ kind: 'total', i: -1, j: -1, answer: model.total, posts: postNumbers(model.total, [diag, ...shuffled(rest, rng)], rng) })
  return steps
}

/** A factor with no zero digit from a range (so every place gets a plot). */
function factorIn(lo: number, hi: number, rng: () => number): number {
  for (;;) {
    const n = lo + Math.floor(rng() * (hi - lo + 1))
    if (!String(n).includes('0')) return n
  }
}

/** The run: a warm-up (factors under 40), 2-digit by 2-digit orders, and a 3-digit by 2-digit finale. */
export function planAreaRun(rounds: number, rng: () => number = Math.random): AreaOrder[] {
  const n = Math.max(1, Math.floor(rounds))
  const out: AreaOrder[] = []
  for (let k = 0; k < n; k++) {
    const kind: AreaOrder['kind'] = k === n - 1 && n > 1 ? 'finale' : k === 0 ? 'warm' : 'main'
    const a = kind === 'finale' ? factorIn(112, 489, rng) : kind === 'warm' ? factorIn(12, 39, rng) : factorIn(41, 98, rng)
    const b = kind === 'warm' ? factorIn(12, 29, rng) : factorIn(12, 98, rng)
    const model = areaModel(a, b)
    out.push({ kind, model, steps: areaSteps(model, rng) })
  }
  return out
}

/** What the keeper asks on a step: "20 × 4 = ?" or "Total = ?". */
export function stepAsk(order: AreaOrder, step: AreaStep): string {
  return step.kind === 'cell' ? `${fmt(order.model.rows[step.i])} × ${fmt(order.model.cols[step.j])} = ?` : `${fmt(order.model.a)} × ${fmt(order.model.b)} = ?`
}

/** The Problem a step is recorded as (progress, the coach): an area-model question. */
export function areaStepProblem(order: AreaOrder, step: AreaStep, id: string): Problem {
  const { model } = order
  const cell = step.kind === 'cell'
  return {
    id,
    prompt: cell
      ? `In the area model for ${fmt(model.a)} × ${fmt(model.b)}, what is ${fmt(model.rows[step.i])} × ${fmt(model.cols[step.j])}?`
      : `Add the partial products. What is ${fmt(model.a)} × ${fmt(model.b)}?`,
    options: step.posts.map(fmt),
    answer: fmt(step.answer),
    visual: {
      kind: 'areaModel',
      rows: model.rows,
      cols: model.cols,
      cells: model.cells.map((row, i) => row.map((v, j) => (cell && i === step.i && j === step.j ? null : v))),
      ...(cell ? {} : { total: null }),
    },
    topic: 'g5-multiplication',
    subtopic: cell ? 'area-cell' : 'area-total',
    difficulty: model.rows.length,
    skill: { id: 'g5-mult-area', label: 'area models and partial products' },
    hint: cell ? cellHint(model.rows[step.i], model.cols[step.j]) : `Add every plot: ${model.cells.flat().map(fmt).join(' + ')}.`,
  }
}

/** What a wrong post says: what that number really is not. */
export function wrongPostLine(order: AreaOrder, step: AreaStep, picked: number): string {
  if (step.kind === 'total') return `${fmt(picked)} isn't ${fmt(order.model.a)} × ${fmt(order.model.b)}. Add every plot!`
  const r = order.model.rows[step.i]
  const c = order.model.cols[step.j]
  return `${fmt(r)} × ${fmt(c)} isn't ${fmt(picked)}. Count the zeros!`
}

/** Stars from first-try steps, the arena/forge 20 / 60 / 100 % shape. */
export function areaStars(firstTry: number, total: number): number {
  const t1 = Math.max(1, Math.ceil(total * 0.2))
  const t2 = Math.ceil(total * 0.6)
  return firstTry >= total ? 3 : firstTry >= t2 ? 2 : firstTry >= t1 ? 1 : 0
}

export const PLOT_POINTS = 60
export const TOTAL_POINTS = 150
export const STEP_PAR = 20

export function plotPoints({ total, elapsed, streak }: { total: boolean; elapsed: number; streak: number }): HitScore {
  return hitScore({ base: total ? TOTAL_POINTS : PLOT_POINTS, fractionLeft: 1 - elapsed / STEP_PAR, streak })
}

// ── layout (the grove's local frame: +x right, +z toward the camera) ─────────

/** The plot area on the field (top part), and the posts in a row below it. */
export const AREA_PLOT = { x0: -2.55, x1: 2.55, z0: -2.6, z1: 0.75 } as const
export const POSTS: [number, number][] = [
  [-1.85, 2.05],
  [0, 2.05],
  [1.85, 2.05],
]
export const POST_R = 0.62
export const AREA_SPAWN: [number, number] = [0, 1.15]

/** Relative sizes of a part: bigger places get bigger plots (not to scale; a 3 next to a 20 would be a sliver). */
export function partWeight(n: number): number {
  const d = String(n).length
  return d >= 3 ? 1.6 : d === 2 ? 1.25 : 0.8
}

/** Plot rectangles [x0, x1, z0, z1] for a model, row-major. */
export function plotRects(model: Pick<AreaModel, 'rows' | 'cols'>): [number, number, number, number][][] {
  const W = AREA_PLOT.x1 - AREA_PLOT.x0
  const H = AREA_PLOT.z1 - AREA_PLOT.z0
  const cw = model.cols.map(partWeight)
  const rh = model.rows.map(partWeight)
  const cs = cw.reduce((a, b) => a + b, 0)
  const rs = rh.reduce((a, b) => a + b, 0)
  const xs: number[] = [AREA_PLOT.x0]
  cw.forEach((w) => xs.push(xs[xs.length - 1] + (w / cs) * W))
  const zs: number[] = [AREA_PLOT.z0]
  rh.forEach((h) => zs.push(zs[zs.length - 1] + (h / rs) * H))
  return model.rows.map((_, i) => model.cols.map((__, j) => [xs[j], xs[j + 1], zs[i], zs[i + 1]] as [number, number, number, number]))
}

/** Which post (if any) the kid stands at. */
export function postAt(lx: number, lz: number): number | null {
  for (let k = 0; k < POSTS.length; k++) if (Math.hypot(lx - POSTS[k][0], lz - POSTS[k][1]) < POST_R) return k
  return null
}

