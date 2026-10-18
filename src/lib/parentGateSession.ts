/**
 * The grown-up check's memory for this run of the app only. Nothing here is
 * ever saved, so closing the app always closes the gate. One shared record,
 * so closing and reopening the check (or trying the 👨‍👩‍👧 button, then the
 * /parent link) can't dodge a lockout. Rules: src/lib/parentGate.ts.
 */
import { newGate, passStillOpen, type GateState } from './parentGate'

let passedAt: number | null = null
let gate: GateState | null = null

/** Has a grown-up passed the check in the last 10 minutes? */
export function parentGateOpen(now = Date.now()): boolean {
  return passStillOpen(passedAt, now)
}

/** A grown-up just answered right: keep the gate open for the next 10 minutes. */
export function markParentGatePassed(now = Date.now()) {
  passedAt = now
}

/** The gate's current question, misses and lock. */
export function currentGate(): GateState {
  return (gate ??= newGate())
}

export function saveGate(next: GateState) {
  gate = next
}

/** Tests only: forget every pass, miss and lock. */
export function resetParentGateForTests() {
  passedAt = null
  gate = null
}
