import type { GateOp } from './ops'

/**
 * Operation sets (docs/superpowers/specs/2026-10-19-trending-games-plan.md, "Gates by band"):
 *
 * - `addSub`:  K–1, counts ≤ 20, shown as dots: "+2 or +5?", make-10 gates.
 * - `mulAdd`:  grades 2–3, × and + within 100: "×3 or +12?".
 * - `divSub`:  ÷ and − (Division Dunes): "÷3 or −10: which keeps more?".
 * - `mulFrac`: grade 4, harder × plus fraction operators: "×½", "+¾ of us".
 * - `fracDec`: grade 5, fraction and decimal operators: "×1.5", "×0.25".
 */
export type OpSetId = 'addSub' | 'mulAdd' | 'divSub' | 'mulFrac' | 'fracDec'

/** The misconception a trap pair is built from. */
export type TrapKind =
  /** K–1: "−5" vs "+2": the bigger digit is a take-away. */
  | 'bigDigit'
  /** A big × on a small crowd loses to a + ("×3" at 4 is 12, "+10" is 14). */
  | 'timesAlwaysWins'
  /** "÷2" vs "÷4": the bigger divisor keeps fewer. */
  | 'bigDivisor'
  /** "×½" (or ×0.5) looks like growth but halves, and loses here. */
  | 'timesFractionShrinks'
  /** "+⅓ of us" vs "+½ of us": a bigger denominator is a smaller piece. */
  | 'bigDenominator'
  /** "×0.25" vs "×0.5": a longer decimal isn't bigger. */
  | 'longDecimal'

export interface Gate {
  op: GateOp
  /** Big print on the gate ("×3", "+¾"). */
  label: string
  /** Optional small second line ("of us bring a friend"). */
  sub?: string
  /** What the narrator says ("times three"). */
  speech: string
  /** The count after walking through (always whole). */
  result: number
}

export type Side = 'left' | 'right'

export interface GatePair {
  left: Gate
  right: Gate
  /** The side whose result is larger, or a tie (both work). */
  winner: Side | 'tie'
  /** `more`: both grow (or stay); `keep`: both shrink — "which keeps more friends?". */
  goal: 'more' | 'keep'
  /** |left.result − right.result| */
  gap: number
  trap: TrapKind | null
  /** Which pair template made it ("mulAdd", "makeTen", "fallback"…). */
  maker: string
  /** Unordered identity of the two operations (no identical pair back to back). */
  key: string
  /** The count the pair was made for. */
  count: number
}

export interface GateState {
  /** The current crowd count. */
  count: number
  opSet: OpSetId
  /** Results never go below this (the level's start count). */
  floor: number
  /**
   * Soft ceiling for this gate's results (≤ the set's cap): a level budgets its
   * growth so the cap is reached near the end, not after two lucky gates. The
   * generator falls back to the hard cap when nothing fits under it.
   */
  ceiling?: number
  /** 0 = wide gaps (warm-up) … 2 = close calls. */
  difficulty: 0 | 1 | 2
  /** Gate number (feeds the seed). */
  index: number
  /** The previous pair's `key`, or null for the first. */
  prevKey: string | null
  seed: string
  /** Largest × / ÷ factor for the grade (defaults per set). */
  maxFactor?: number
  /** A lower count cap than the set's (grade 2 stays within 100). */
  cap?: number
}

/** One choice the child made at a gate pair. */
export interface Decision {
  picked: Side
  /** Picked the larger result (a tie counts: both work). */
  smart: boolean
  tie: boolean
  result: number
  /** What the other gate would have given (the ghost parade). */
  other: number
  pair: GatePair
}
