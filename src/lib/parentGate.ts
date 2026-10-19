/**
 * The grown-up check ("parental gate") in front of the Parent area and any
 * setting a child could otherwise change. Built for adults to pass and 7–9
 * year olds to fail: the product of two numbers from 13–29 (169–841), typed
 * into a number field. No answer buttons to guess between, no hints; three
 * wrong answers in a row lock it for 30 seconds, and every wrong answer swaps
 * in a new question, so trying numbers one by one gets nowhere.
 *
 * Pure: callers pass the clock and the dice. The in-memory "who passed, and
 * is it locked" record lives in parentGateSession.ts.
 */

/** Smallest factor. */
export const GATE_MIN = 13
/** Largest factor. */
export const GATE_MAX = 29
/** Never ask ×20: it's just ×2 with a zero on the end, which a strong 3rd grader can do. */
const SKIP = 20
/** Wrong answers before the gate locks. */
export const GATE_MAX_WRONG = 3
/** How long the gate stays locked. */
export const GATE_LOCK_MS = 30_000
/** How long a pass keeps the gate open (in memory only, never saved). */
export const GATE_PASS_MS = 10 * 60_000

export interface GateQuestion {
  a: number
  b: number
}

export interface GateState {
  question: GateQuestion
  /** Wrong answers since the last pass or lockout. */
  wrong: number
  /** Locked until this time (ms, Date.now() clock); 0 = not locked. */
  lockedUntil: number
}

/** pass: right answer · wrong: a new question · locked: 3rd miss (or still locked) · blank: nothing typed. */
export type GateResult = 'pass' | 'wrong' | 'locked' | 'blank'

type Rand = () => number

function factor(rand: Rand): number {
  // 16 usable values: 13–19 and 21–29
  const k = Math.min(15, Math.floor(rand() * 16))
  const n = GATE_MIN + k
  return n >= SKIP ? n + 1 : n
}

/** A fresh question, different from `previous` when one is given. */
export function makeQuestion(rand: Rand = Math.random, previous?: GateQuestion): GateQuestion {
  let q = { a: factor(rand), b: factor(rand) }
  for (let i = 0; previous && i < 8 && q.a * q.b === previous.a * previous.b; i++) {
    q = { a: factor(rand), b: factor(rand) }
  }
  return q
}

/** The typed answer as a number: digits only (spaces ignored), else null. */
export function parseAnswer(input: string): number | null {
  const s = input.replace(/\s+/g, '')
  return /^\d{1,4}$/.test(s) ? Number(s) : null
}

export function isCorrect(q: GateQuestion, input: string): boolean {
  return parseAnswer(input) === q.a * q.b
}

export function newGate(rand: Rand = Math.random): GateState {
  return { question: makeQuestion(rand), wrong: 0, lockedUntil: 0 }
}

/** The same gate (misses and lock kept) with a new question: each time it opens. */
export function withNewQuestion(s: GateState, rand: Rand = Math.random): GateState {
  return { ...s, question: makeQuestion(rand, s.question) }
}

/** Milliseconds of lockout left at `now` (0 = not locked). */
export function lockRemainingMs(s: GateState, now: number): number {
  return Math.max(0, s.lockedUntil - now)
}

/** Answer the gate's question at time `now`. */
export function submitAnswer(
  s: GateState,
  input: string,
  now: number,
  rand: Rand = Math.random,
): { state: GateState; result: GateResult } {
  if (lockRemainingMs(s, now) > 0) return { state: s, result: 'locked' }
  // A lock that has run out: start counting again.
  const open = s.lockedUntil ? { ...s, lockedUntil: 0, wrong: 0 } : s
  if (parseAnswer(input) === null) return { state: open, result: 'blank' }
  const next = makeQuestion(rand, open.question)
  if (isCorrect(open.question, input)) return { state: { question: next, wrong: 0, lockedUntil: 0 }, result: 'pass' }
  const wrong = open.wrong + 1
  if (wrong >= GATE_MAX_WRONG) {
    return { state: { question: next, wrong: 0, lockedUntil: now + GATE_LOCK_MS }, result: 'locked' }
  }
  return { state: { question: next, wrong, lockedUntil: 0 }, result: 'wrong' }
}

/**
 * Does a pass at `passedAt` still hold the gate open at `now`? (A clock that
 * went backwards closes it.)
 */
export function passStillOpen(passedAt: number | null, now: number): boolean {
  return passedAt !== null && now >= passedAt && now - passedAt < GATE_PASS_MS
}
