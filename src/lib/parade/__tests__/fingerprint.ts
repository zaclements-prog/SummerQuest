/**
 * A fingerprint of Critter Parade's levels for a setup (zone family and
 * grade): every level's plan, the gate pairs and cages met along the
 * all-smart and all-weak paths, and every voice line the parade would say on
 * them, hashed (FNV-1a). Written against the modules it is given, so the same
 * function can fingerprint an older copy of the engine: the 1st-grade work
 * proves kindergarten's and grades 2–5's parades are unchanged by comparing
 * against fingerprints taken before it (parade.test.ts).
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- written against whichever copy of the engine it is handed */
export interface ParadeModules {
  planRun(setup: { family: 'mul' | 'div'; grade: number; seed: string }): any[]
  startLevel(plan: any): any
  passGate(st: any, side: 'left' | 'right'): { state: any; decision: any }
  passCage(st: any): { state: any; amount: number }
  bestSide(pair: any): 'left' | 'right'
  gatePrompt(pair: any, listen: boolean, opSet?: string): any
  afterPick(d: any, listen: boolean, cheer: number, opSet?: string): any
  introLine(goal: 'more' | 'keep', listen: boolean): any
  cageLine(amount: number): any
  finaleLine(margin: number, listen: boolean): any
  finaleOutcome(st: any): { margin: number }
  lossHint(ds: readonly any[], opSet: any): string
}

function fnv(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

export function paradeFingerprint(m: ParadeModules, family: 'mul' | 'div', grade: number, seeds = 6): string {
  const listen = grade <= 1
  const out: unknown[] = []
  for (let s = 0; s < seeds; s++) {
    for (const plan of m.planRun({ family, grade, seed: `fp-${s}` })) {
      out.push([plan.level, plan.opSet, plan.maxFactor, plan.difficulty, plan.start, plan.events, plan.gates, plan.finaleAt, plan.ceilings, plan.smart, plan.weak, plan.oneMiss, plan.gang, plan.cap, plan.fullAt])
      out.push(m.introLine(plan.opSet === 'divSub' ? 'keep' : 'more', listen))
      for (const policy of ['smart', 'weak'] as const) {
        let st = m.startLevel(plan)
        let guard = 0
        let cheer = 0
        while (st.upcoming && guard++ < 50) {
          if (st.upcoming.kind === 'cage') {
            const r = m.passCage(st)
            out.push(['cage', r.amount, m.cageLine(r.amount)])
            st = r.state
          } else {
            const p = st.upcoming.pair
            out.push([p.left.label, p.left.speech, p.left.result, p.right.label, p.right.speech, p.right.result, p.winner, p.goal, p.trap, p.maker, p.key, p.count])
            out.push(m.gatePrompt(p, listen, plan.opSet))
            const best = m.bestSide(p)
            const side = policy === 'smart' ? best : best === 'left' ? 'right' : 'left'
            const r = m.passGate(st, side)
            out.push(m.afterPick(r.decision, listen, cheer++, plan.opSet))
            st = r.state
          }
        }
        const f = m.finaleOutcome(st)
        out.push(['finale', f, m.finaleLine(f.margin, listen), m.lossHint(st.decisions, plan.opSet)])
      }
    }
  }
  return fnv(JSON.stringify(out))
}
