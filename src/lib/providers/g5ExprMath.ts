/**
 * A tiny reader for the numerical expressions 5th grade writes (5.OA.1–2):
 * whole numbers, + − × ÷, parentheses ( ) and brackets [ ]. It works out an
 * expression the right way (grouping first, then × and ÷ left to right, then
 * + and − left to right), and the ways kids get it wrong, which is where the
 * Word Problem Woods' wrong choices come from:
 *
 * - `leftToRight`: straight across, ignoring grouping and the order of operations;
 * - `noGrouping`: the order of operations, but the parentheses and brackets ignored;
 * - `groupsLeftToRight`: grouping first, then straight across (+ before × if it comes first).
 */

export type Op = '+' | '−' | '×' | '÷'
export type ExprNode = { n: number } | { op: Op; l: ExprNode; r: ExprNode }

const OPS: Record<string, Op> = { '+': '+', '-': '−', '−': '−', '×': '×', '*': '×', '÷': '÷', '/': '÷' }

/** Numbers (US commas allowed), operators and brackets. Throws on anything else. */
export function tokenize(s: string): string[] {
  const out: string[] = []
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (ch === ' ') {
      i++
      continue
    }
    if (/\d/.test(ch)) {
      let j = i
      while (j < s.length && /[\d,]/.test(s[j]) && !(s[j] === ',' && !/\d/.test(s[j + 1] ?? ''))) j++
      out.push(s.slice(i, j).replace(/,/g, ''))
      i = j
      continue
    }
    if (ch in OPS) out.push(OPS[ch])
    else if ('()[]'.includes(ch)) out.push(ch)
    else throw new Error(`not an expression character "${ch}" in "${s}"`)
    i++
  }
  return out
}

/** Parse with the order of operations (`flat` = every operator the same rank: straight left to right). */
export function parseExpr(s: string, { flat = false, dropGroups = false }: { flat?: boolean; dropGroups?: boolean } = {}): ExprNode {
  const toks = tokenize(s).filter((t) => !dropGroups || !'()[]'.includes(t))
  let at = 0
  const peek = () => toks[at]
  const take = () => toks[at++]
  const close: Record<string, string> = { '(': ')', '[': ']' }
  function factor(): ExprNode {
    const t = take()
    if (t === undefined) throw new Error(`expression ends early: "${s}"`)
    if (t === '(' || t === '[') {
      const e = expr()
      if (take() !== close[t]) throw new Error(`unclosed ${t} in "${s}"`)
      return e
    }
    if (!/^\d+$/.test(t)) throw new Error(`expected a number, got "${t}" in "${s}"`)
    return { n: Number(t) }
  }
  function term(): ExprNode {
    let l = factor()
    while (peek() === '×' || peek() === '÷') l = { op: take() as Op, l, r: factor() }
    return l
  }
  function flatExpr(): ExprNode {
    let l = factor()
    while (peek() && peek() in OPS) l = { op: take() as Op, l, r: factor() }
    return l
  }
  function expr(): ExprNode {
    if (flat) return flatExpr()
    let l = term()
    while (peek() === '+' || peek() === '−') l = { op: take() as Op, l, r: term() }
    return l
  }
  const e = expr()
  if (at !== toks.length) throw new Error(`left over "${toks.slice(at).join(' ')}" in "${s}"`)
  return e
}

export function evalNode(e: ExprNode): number {
  if ('n' in e) return e.n
  const l = evalNode(e.l)
  const r = evalNode(e.r)
  return e.op === '+' ? l + r : e.op === '−' ? l - r : e.op === '×' ? l * r : l / r
}

/** The value, read the right way. */
export function evalExpr(s: string): number {
  return evalNode(parseExpr(s))
}

/** The value when every step stays a whole number, never below zero (else NaN): what a 5th grader can do. */
export function exactValue(s: string): number {
  const walk = (e: ExprNode): number => {
    if ('n' in e) return e.n
    const v = evalNode({ op: e.op, l: { n: walk(e.l) }, r: { n: walk(e.r) } })
    return Number.isInteger(v) && v >= 0 ? v : NaN
  }
  return walk(parseExpr(s))
}

/** What the usual mistakes give for this expression. */
export function mistakenValues(s: string): { leftToRight: number; noGrouping: number; groupsLeftToRight: number } {
  return {
    leftToRight: evalNode(parseExpr(s, { flat: true, dropGroups: true })),
    noGrouping: evalNode(parseExpr(s, { dropGroups: true })),
    groupsLeftToRight: evalNode(parseExpr(s, { flat: true })),
  }
}

/** The first step done the right way: "9 − 4 = 5" (the deepest, leftmost operation). */
export function firstStep(s: string): { l: number; op: Op; r: number; v: number } | null {
  const find = (e: ExprNode): { l: number; op: Op; r: number; v: number } | null => {
    if ('n' in e) return null
    const inL = find(e.l)
    if (inL) return inL
    const inR = find(e.r)
    if (inR) return inR
    if ('n' in e.l && 'n' in e.r) return { l: e.l.n, op: e.op, r: e.r.n, v: evalNode(e) }
    return null
  }
  return find(parseExpr(s))
}
