import type { ProblemVisual } from '../lib/problem'

/**
 * The size a quiz should draw its picture at: small on a phone held sideways,
 * and small for a tall array (more than 6 rows) beside the answers on any
 * sideways screen, where it would otherwise run below the fold.
 */
export function visualSize(visual: ProblemVisual | undefined, short: boolean, sideways: boolean): 'sm' | 'md' {
  if (short) return 'sm'
  if (sideways && visual?.kind === 'array' && visual.rows > 6) return 'sm'
  return 'md'
}
