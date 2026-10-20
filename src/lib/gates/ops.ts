import {
  DIVIDE,
  MINUS,
  TIMES,
  add,
  formatValue,
  int,
  mul,
  numberWords,
  rat,
  speakValue,
  sub,
  type Rational,
} from '../numbers'

/**
 * One gate's operation on the parade count. Every gate means the same thing:
 * the count that walks through comes out as `applyOp(op, count)`.
 */
export type GateOp =
  | { kind: 'add'; k: number }
  | { kind: 'sub'; k: number }
  | { kind: 'mul'; k: number }
  | { kind: 'div'; k: number }
  /** × a fraction or decimal: "×½", "×1.5". */
  | { kind: 'scale'; r: Rational; form: 'fraction' | 'decimal' }
  /** "¾ of us invite a friend": count + r × count. */
  | { kind: 'join'; r: Rational; form: 'fraction' | 'decimal' }

export type OpKind = GateOp['kind']

/** The exact count after the gate (may be fractional: callers check wholeness). */
export function applyOp(op: GateOp, count: number): Rational {
  const n = int(count)
  switch (op.kind) {
    case 'add':
      return add(n, int(op.k))
    case 'sub':
      return sub(n, int(op.k))
    case 'mul':
      return mul(n, int(op.k))
    case 'div':
      return rat(count, op.k)
    case 'scale':
      return mul(n, op.r)
    case 'join':
      return add(n, mul(n, op.r))
  }
}

/** The number printed on the gate (what a child compares at a glance). */
export function opOperand(op: GateOp): Rational {
  return op.kind === 'scale' || op.kind === 'join' ? op.r : int(op.k)
}

/** The gate's sign in big type, plus an optional small second line. */
export function opLabelParts(op: GateOp): { main: string; sub?: string } {
  switch (op.kind) {
    case 'add':
      return { main: `+${op.k}` }
    case 'sub':
      return { main: `${MINUS}${op.k}` }
    case 'mul':
      return { main: `${TIMES}${op.k}` }
    case 'div':
      return { main: `${DIVIDE}${op.k}` }
    case 'scale':
      return { main: `${TIMES}${formatValue(op.r, op.form)}` }
    case 'join':
      return { main: `+${formatValue(op.r, op.form)}`, sub: 'of us bring a friend' }
  }
}

/** One-line label ("×½", "+12", "+¾ of us"). */
export function opLabel(op: GateOp): string {
  const p = opLabelParts(op)
  return op.kind === 'join' ? `${p.main} of us` : p.main
}

/**
 * What the narrator says for the gate. `listen` (K–1) says "take away" for
 * minus; everyone else hears the math words.
 */
export function opSpeech(op: GateOp, mode: 'listen' | 'read' = 'read'): string {
  switch (op.kind) {
    case 'add':
      return `plus ${numberWords(op.k)}`
    case 'sub':
      return `${mode === 'listen' ? 'take away' : 'minus'} ${numberWords(op.k)}`
    case 'mul':
      return `times ${numberWords(op.k)}`
    case 'div':
      return `divided by ${numberWords(op.k)}`
    case 'scale':
      return `times ${speakValue(op.r, op.form)}`
    case 'join':
      return `${speakValue(op.r, op.form)} of us bring a friend`
  }
}

/** A stable identity for the operation ("mul:3", "scale:1/2:fraction"). */
export function opKey(op: GateOp): string {
  return op.kind === 'scale' || op.kind === 'join' ? `${op.kind}:${op.r.n}/${op.r.d}:${op.form}` : `${op.kind}:${op.k}`
}

/** The decimal text of a decimal-form operand ("0.25"), else null. */
export function decimalOperand(op: GateOp): string | null {
  return (op.kind === 'scale' || op.kind === 'join') && op.form === 'decimal' ? formatValue(op.r, 'decimal') : null
}
