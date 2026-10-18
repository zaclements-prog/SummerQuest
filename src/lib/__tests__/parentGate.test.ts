import { describe, it, expect } from 'vitest'
import {
  GATE_LOCK_MS,
  GATE_MAX,
  GATE_MIN,
  GATE_PASS_MS,
  isCorrect,
  lockRemainingMs,
  makeQuestion,
  newGate,
  parseAnswer,
  passStillOpen,
  submitAnswer,
  withNewQuestion,
  type GateState,
} from '../parentGate'

/** A deterministic stream of [0, 1) values. */
function seq(...values: number[]) {
  let i = 0
  return () => values[i++ % values.length]
}

const at = (q: { a: number; b: number }) => String(q.a * q.b)

describe('parental gate: questions', () => {
  it('multiplies two numbers from 13–29, never 20', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 2000; i++) {
      const q = makeQuestion()
      for (const n of [q.a, q.b]) {
        expect(n).toBeGreaterThanOrEqual(GATE_MIN)
        expect(n).toBeLessThanOrEqual(GATE_MAX)
        expect(n).not.toBe(20)
        seen.add(n)
      }
      expect(q.a * q.b).toBeGreaterThanOrEqual(169)
      expect(q.a * q.b).toBeLessThanOrEqual(841)
    }
    // every allowed factor turns up (16 of them)
    expect(seen.size).toBe(16)
  })

  it('covers both ends of the range with the dice at their extremes', () => {
    expect(makeQuestion(seq(0, 0))).toEqual({ a: 13, b: 13 })
    expect(makeQuestion(seq(0.9999, 0.9999))).toEqual({ a: 29, b: 29 })
    expect(makeQuestion(seq(7 / 16, 0))).toEqual({ a: 21, b: 13 }) // skips 20
  })

  it('a new question never repeats the last product', () => {
    const prev = { a: 13, b: 13 }
    // the dice offer the same product twice, then something else
    expect(makeQuestion(seq(0, 0, 0, 0, 0.5, 0.5), prev)).toEqual({ a: 22, b: 22 })
  })
})

describe('parental gate: answers', () => {
  it('reads digits only', () => {
    expect(parseAnswer('391')).toBe(391)
    expect(parseAnswer(' 3 91 ')).toBe(391)
    expect(parseAnswer('')).toBeNull()
    expect(parseAnswer('abc')).toBeNull()
    expect(parseAnswer('-5')).toBeNull()
    expect(parseAnswer('3.5')).toBeNull()
    expect(parseAnswer('12345')).toBeNull()
  })

  it('checks the product', () => {
    expect(isCorrect({ a: 17, b: 23 }, '391')).toBe(true)
    expect(isCorrect({ a: 17, b: 23 }, '390')).toBe(false)
    expect(isCorrect({ a: 17, b: 23 }, '')).toBe(false)
  })
})

describe('parental gate: lockout', () => {
  const start: GateState = { question: { a: 17, b: 23 }, wrong: 0, lockedUntil: 0 }

  it('passes on the right answer and clears the misses', () => {
    const { state, result } = submitAnswer({ ...start, wrong: 2 }, '391', 1000)
    expect(result).toBe('pass')
    expect(state.wrong).toBe(0)
    expect(state.lockedUntil).toBe(0)
  })

  it('a blank answer costs nothing', () => {
    const { state, result } = submitAnswer(start, '  ', 1000)
    expect(result).toBe('blank')
    expect(state).toEqual(start)
  })

  it('each miss swaps the question; the third locks it for 30 seconds', () => {
    let s = start
    let r = submitAnswer(s, '1', 1000)
    expect(r.result).toBe('wrong')
    expect(r.state.wrong).toBe(1)
    expect(r.state.question).not.toEqual(s.question)
    s = r.state
    r = submitAnswer(s, '1', 2000)
    expect(r.result).toBe('wrong')
    s = r.state
    r = submitAnswer(s, '1', 3000)
    expect(r.result).toBe('locked')
    expect(r.state.lockedUntil).toBe(3000 + GATE_LOCK_MS)
    expect(lockRemainingMs(r.state, 3000)).toBe(30_000)
    s = r.state

    // while locked even the right answer is refused
    const tooSoon = submitAnswer(s, at(s.question), 3000 + GATE_LOCK_MS - 1)
    expect(tooSoon.result).toBe('locked')
    expect(tooSoon.state).toBe(s)

    // after 30 s it answers again, with a clean slate of misses
    expect(lockRemainingMs(s, 3000 + GATE_LOCK_MS)).toBe(0)
    const miss = submitAnswer(s, '1', 3000 + GATE_LOCK_MS)
    expect(miss.result).toBe('wrong')
    expect(miss.state.wrong).toBe(1)
    expect(submitAnswer(miss.state, at(miss.state.question), 3000 + GATE_LOCK_MS + 5).result).toBe('pass')
  })

  it('reopening keeps the misses and the lock but asks something new', () => {
    const locked: GateState = { question: { a: 17, b: 23 }, wrong: 0, lockedUntil: 99_000 }
    const again = withNewQuestion({ ...locked, wrong: 2 })
    expect(again.wrong).toBe(2)
    expect(again.lockedUntil).toBe(99_000)
    expect(again.question.a * again.question.b).not.toBe(391)
    expect(newGate().wrong).toBe(0)
  })
})

describe('parental gate: the 10-minute pass', () => {
  it('stays open for 10 minutes, then closes', () => {
    expect(passStillOpen(null, 5000)).toBe(false)
    expect(passStillOpen(1000, 1000)).toBe(true)
    expect(passStillOpen(1000, 1000 + GATE_PASS_MS - 1)).toBe(true)
    expect(passStillOpen(1000, 1000 + GATE_PASS_MS)).toBe(false)
  })

  it('closes if the clock goes backwards', () => {
    expect(passStillOpen(10_000, 9_999)).toBe(false)
  })
})
