import type { VoiceRef } from '../../voice/types'
import { G1_PARADE_RANGES as G1 } from '../../voice/packs/g1-parade'
import type { Decision, GatePair, OpSetId } from '../gates'

/**
 * Which `parade` voice line to say at each moment (src/voice/packs/parade.ts).
 * Pure: builds VoiceRefs only, and only with slot values inside the
 * templates' recorded ranges (anything else falls back to a fixed line).
 */

const inRange = (v: number, lo: number, hi: number) => Number.isInteger(v) && v >= lo && v <= hi

export function introLine(goal: 'more' | 'keep', listen: boolean): VoiceRef {
  // (1st grade's − gates: which keeps more)
  if (listen) return goal === 'keep' ? { line: 'g1-parade/introKeep' } : { line: 'parade/introListen' }
  return { line: goal === 'keep' ? 'parade/introKeep' : 'parade/intro' }
}

/** 1st grade's sets (+ and − gates written as numerals): its own prompts say "minus". */
const isG1Set = (opSet: OpSetId | undefined) => opSet === 'add20' || opSet === 'sub20'

/** The question at a gate pair: K–1 hears both gates ("Plus two or plus five?"; 1st grade "Minus three or minus eight?"). */
export function gatePrompt(pair: GatePair, listen: boolean, opSet?: OpSetId): VoiceRef {
  if (listen && isG1Set(opSet)) {
    const [a, b] = [pair.left.op, pair.right.op]
    if (a.kind === 'add' && b.kind === 'add' && inRange(a.k, 1, 10) && inRange(b.k, 1, 10)) return { template: 'parade/plusOrPlus', slots: { a: a.k, b: b.k } }
    const fits = (x: number, y: number, r: { a: readonly [number, number]; b: readonly [number, number] }) => inRange(x, ...r.a) && inRange(y, ...r.b)
    if (a.kind === 'add' && b.kind === 'sub' && fits(a.k, b.k, G1.plusOrMinus)) return { template: 'g1-parade/plusOrMinus', slots: { a: a.k, b: b.k } }
    if (a.kind === 'sub' && b.kind === 'add' && fits(a.k, b.k, G1.minusOrPlus)) return { template: 'g1-parade/minusOrPlus', slots: { a: a.k, b: b.k } }
    if (a.kind === 'sub' && b.kind === 'sub' && fits(a.k, b.k, G1.minusOrMinus)) return { template: 'g1-parade/minusOrMinus', slots: { a: a.k, b: b.k } }
    return { line: pair.goal === 'keep' ? 'parade/keepPrompt' : 'parade/gatePrompt' }
  }
  if (listen) {
    const [a, b] = [pair.left.op, pair.right.op]
    if (a.kind === 'add' && b.kind === 'add' && inRange(a.k, 1, 10) && inRange(b.k, 1, 10))
      return { template: 'parade/plusOrPlus', slots: { a: a.k, b: b.k } }
    if (a.kind === 'add' && b.kind === 'sub' && inRange(a.k, 1, 6) && inRange(b.k, 1, 6))
      return { template: 'parade/plusOrTakeAway', slots: { a: a.k, b: b.k } }
    if (a.kind === 'sub' && b.kind === 'sub' && inRange(a.k, 1, 6) && inRange(b.k, 1, 6))
      return { template: 'parade/takeAwayOrTakeAway', slots: { a: a.k, b: b.k } }
  }
  return { line: pair.goal === 'keep' ? 'parade/keepPrompt' : 'parade/gatePrompt' }
}

/** After a pick: a cheer for a smart one, the ghost-parade line for the other. */
export function afterPick(d: Decision, listen: boolean, cheer: number, opSet?: OpSetId): VoiceRef {
  if (d.tie) return { line: 'parade/bothWork' }
  if (d.smart) return { line: (['parade/smartPick', 'parade/cheerMore', 'parade/cheerGrow', 'parade/cheerThink'] as const)[cheer % 4] }
  const other = d.picked === 'left' ? d.pair.right.op : d.pair.left.op
  // 1st grade's − gates: "Minus three would have left fifteen!"
  if (listen && isG1Set(opSet) && other.kind === 'sub' && inRange(other.k, ...G1.minusWouldHave.a) && inRange(d.other, ...G1.minusWouldHave.n))
    return { template: 'g1-parade/minusWouldHave', slots: { a: other.k, n: d.other } }
  if (listen && other.kind === 'add' && inRange(other.k, 1, 10) && inRange(d.other, 2, 20))
    return { template: 'parade/plusWouldHave', slots: { a: other.k, n: d.other } }
  return { line: 'parade/otherHadMore' }
}

/**
 * K–1: the rematch tip, said: what the other gate would have given at the
 * costliest pick ("Minus one would have left fourteen!"), else how to win
 * ("Tap the gate that gives us more friends.").
 */
export function lossHintLine(worst: Decision | null, opSet: OpSetId): VoiceRef {
  if (worst) return afterPick(worst, true, 0, opSet)
  return introLine(opSet === 'divSub' || opSet === 'sub20' ? 'keep' : 'more', true)
}

/** K–1: the parade's size, said ("We have thirty-six friends!"); null past what's recorded. */
export function friendsLine(n: number): VoiceRef | null {
  return inRange(n, 1, 99) ? { template: 'parade/weHaveFriends', slots: { n } } : null
}

export function cageLine(amount: number): VoiceRef {
  return inRange(amount, 1, 20) ? { template: 'parade/friendsJoin', slots: { n: amount } } : { line: 'parade/cageOpen' }
}

export function finaleLine(margin: number, listen: boolean): VoiceRef {
  if (margin < 0) return { line: 'parade/finaleLose' }
  if (margin === 0) return { line: 'parade/finaleTie' }
  if (listen) return { line: 'parade/weHaveMore' }
  return inRange(margin, 1, 100) ? { template: 'parade/winBy', slots: { n: margin } } : { line: 'parade/finaleWin' }
}
