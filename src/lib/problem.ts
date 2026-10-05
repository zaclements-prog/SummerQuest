/**
 * Core problem abstraction. Every game consumes problems via a ProblemProvider,
 * so the same game shell (SpeedRun, BossBattle, etc.) works for any subject.
 *
 * Providers can be:
 *   - sync generators (current: math facts created procedurally)
 *   - static pools (e.g. handwritten word problems loaded from JSON)
 *   - LLM-backed caches (future: pre-generated batches refilled in the background)
 *
 * To stay future-proof, every provider call is awaited even if it returns synchronously.
 * Games render a brief loading state when a problem isn't ready yet.
 */

export type ProblemAnswer = string | number

export type ProblemVisual =
  | { kind: 'none' }
  | { kind: 'array'; rows: number; cols: number; itemEmoji?: string; label?: string }
  | { kind: 'fraction'; numerator: number; denominator: number; shape?: 'circle' | 'rect' | 'bar' }
  | {
      kind: 'fractionCompare'
      a: { numerator: number; denominator: number }
      b: { numerator: number; denominator: number }
    }
  | {
      kind: 'placeValueBlocks'
      thousands: number
      hundreds: number
      tens: number
      ones: number
    }
  | { kind: 'numberLine'; min: number; max: number; markers: number[]; target?: number }
  | { kind: 'wordProblem'; text: string; illustration?: string }
  | {
      kind: 'passage'
      passageTitle: string
      passageText: string
      question: string
    }
  | { kind: 'shape'; type: 'rect' | 'square'; width: number; height: number; unit?: string }
  | { kind: 'clock'; hour: number; minute: number }
  | { kind: 'money'; cents: number; showCoins?: boolean }
  | {
      kind: 'barGraph'
      title?: string
      unit?: string
      bars: { label: string; value: number; emoji?: string }[]
    }

export interface Problem {
  id: string
  prompt: string
  options: ProblemAnswer[]
  answer: ProblemAnswer
  visual?: ProblemVisual
  topic: string
  subtopic?: string
  difficulty?: number
  /** Coarse skill bucket for weak-area analytics + tutoring. */
  skill?: { id: string; label: string }
  /**
   * Stable identity of the underlying fact for adaptive practice, e.g. "mult:6x8"
   * (commutative order normalized) or "div:56/8". Set by procedural fact providers;
   * answers to problems with a factId update the child's per-fact record.
   */
  factId?: string
  hint?: string
  explanation?: string
}

export interface ProblemProvider {
  /** Fetch the next problem. May be synchronous (Problem) or async (Promise<Problem>). */
  next(): Promise<Problem> | Problem
  /** Reset internal state (e.g. for retrying a stage). Optional. */
  reset?(): void
  /** Optional: pre-warm a buffer. Useful for LLM-backed providers. */
  preload?(count: number): Promise<void>
  /** Topic identifier for analytics + LLM context. */
  readonly topic: string
}

/**
 * Helper: await a provider's next() result uniformly, regardless of sync/async.
 * Use this everywhere a game consumes a problem.
 */
export async function nextProblem(p: ProblemProvider): Promise<Problem> {
  const result = p.next()
  return result instanceof Promise ? await result : result
}
