import { describe, expect, it } from 'vitest'
import { seededRng } from '../../random'
import { voiceText } from '../../../voice/registry'
import { decide } from '../../gates'
import { OP_SETS, bestSide, isListenSet, opSetFor, showsDots, type GatePair, type OpFamily, type Side } from '../../gates'
import { paradeFingerprint } from './fingerprint'
import {
  LEVELS,
  PARADE_SHAPE,
  finaleOutcome,
  gangFor,
  levelScore,
  lossHint,
  paradeFull,
  paradeStars,
  passCage,
  passGate,
  planLevel,
  planRun,
  slotOffset,
  startLevel,
  type LevelPlan,
  type LevelState,
  afterPick,
  cageLine,
  finaleLine,
  gatePrompt,
  introLine,
  paradeFamily,
} from '..'

const SETUPS: [OpFamily, number][] = [
  ['mul', 0],
  ['mul', 1],
  ['mul', 2],
  ['mul', 3],
  ['mul', 4],
  ['mul', 5],
  ['div', 1],
  ['div', 2],
  ['div', 3],
  ['div', 4],
  ['div', 5],
]

/** Play a level to its finale with a picking policy; returns the final state and every pair seen. */
function play(plan: LevelPlan, pickSide: (p: GatePair) => Side): { state: LevelState; pairs: GatePair[]; cages: number[] } {
  let st = startLevel(plan)
  const pairs: GatePair[] = []
  const cages: number[] = []
  let guard = 0
  while (st.upcoming && guard++ < 50) {
    if (st.upcoming.kind === 'cage') {
      const r = passCage(st)
      cages.push(r.amount)
      st = r.state
    } else {
      const pair = st.upcoming.pair
      pairs.push(pair)
      const before = st.count
      const r = passGate(st, pickSide(pair))
      // the crowd never drops below the level's start count
      expect(r.state.count).toBeGreaterThanOrEqual(plan.start)
      expect(r.state.count).toBe(r.decision.result)
      expect(pair.count).toBe(before)
      st = r.state
    }
  }
  return { state: st, pairs, cages }
}

const other = (s: Side): Side => (s === 'left' ? 'right' : 'left')

describe('parade levels', () => {
  it('lays out 5–6 gate pairs and 1–3 counting cages per level, in order along the track', () => {
    for (const [family, grade] of SETUPS) {
      for (const plan of planRun({ family, grade, seed: 'layout' })) {
        expect(plan.gates).toBeGreaterThanOrEqual(5)
        expect(plan.gates).toBeLessThanOrEqual(6)
        const cages = plan.events.filter((e) => e.kind === 'cage').length
        expect(cages).toBeGreaterThanOrEqual(1)
        expect(cages).toBeLessThanOrEqual(3)
        for (let i = 1; i < plan.events.length; i++) expect(plan.events[i].at).toBeGreaterThan(plan.events[i - 1].at)
        expect(plan.finaleAt).toBeGreaterThan(plan.events[plan.events.length - 1].at)
        expect(plan.opSet).toBe(opSetFor(family, grade))
      }
    }
  })

  it('smart play always wins the tug-of-war; all-weak play loses when the paths differ', () => {
    let losses = 0
    let levels = 0
    for (const [family, grade] of SETUPS) {
      for (let s = 0; s < 40; s++) {
        for (const plan of planRun({ family, grade, seed: `finale-${s}` })) {
          levels++
          const smart = play(plan, bestSide)
          expect(smart.state.count).toBe(plan.smart)
          const f = finaleOutcome(smart.state)
          expect(f.win).toBe(true)
          expect(f.margin).toBeGreaterThanOrEqual(1)
          const weak = play(plan, (p) => (p.winner === 'tie' ? 'left' : other(bestSide(p))))
          expect(weak.state.count).toBe(plan.weak)
          const w = finaleOutcome(weak.state)
          if (plan.smart - plan.weak >= 2 && plan.oneMiss - plan.weak >= 2) {
            expect(w.win).toBe(false)
            losses++
          }
          // the gang sits between the two (when the weak path is the smaller one)
          expect(plan.gang).toBeGreaterThanOrEqual(1)
          expect(plan.gang).toBeLessThan(plan.smart)
          // a single weak pick, wherever it falls, still wins
          for (let g = 0; g < plan.gates; g++) {
            let n = 0
            const slip = play(plan, (p) => (n++ === g && p.winner !== 'tie' ? other(bestSide(p)) : bestSide(p)))
            expect(finaleOutcome(slip.state).win).toBe(true)
          }
        }
      }
    }
    // most levels separate smart from weak play
    expect(losses / levels).toBeGreaterThan(0.6)
    // (thousands of played levels: generous on a busy machine)
  }, 30000)

  it('random play keeps every guarantee: floor, cap, wholeness, no repeats, cages that fit', () => {
    const r = seededRng('random-play')
    for (const [family, grade] of SETUPS) {
      for (let s = 0; s < 60; s++) {
        for (const plan of planRun({ family, grade, seed: `rand-${s}` })) {
          const { state, pairs, cages } = play(plan, () => (r() < 0.5 ? 'left' : 'right'))
          for (let i = 1; i < pairs.length; i++) expect(pairs[i].key).not.toBe(pairs[i - 1].key)
          for (const p of pairs) {
            expect(p.left.result).toBeLessThanOrEqual(plan.cap)
            expect(p.right.result).toBeLessThanOrEqual(plan.cap)
            expect(Number.isInteger(p.left.result) && Number.isInteger(p.right.result)).toBe(true)
          }
          for (const c of cages) expect(c).toBeGreaterThanOrEqual(0)
          expect(state.count).toBeLessThanOrEqual(plan.cap)
          expect(state.count).toBeGreaterThanOrEqual(plan.start)
          // a level ends with either every event crossed or a full parade
          expect(state.next === plan.events.length || paradeFull(state)).toBe(true)
        }
      }
    }
  }, 30000)

  it('in play, ties and traps show up at about their set rates and the better gate is on either side', () => {
    const r = seededRng('in-play')
    for (const fam of ['mul', 'div'] as OpFamily[]) {
      for (const grade of [0, 2, 3, 4, 5]) {
        const set = opSetFor(fam, grade)
        const cfg = OP_SETS[set]
        let n = 0
        let ties = 0
        let traps = 0
        let left = 0
        for (let s = 0; s < 120; s++) {
          for (const plan of planRun({ family: fam, grade, seed: `rates-${s}` })) {
            for (const p of play(plan, () => (r() < 0.6 ? 'left' : 'right')).pairs) {
              n++
              if (p.winner === 'tie') ties++
              if (p.trap) traps++
              if (p.winner === 'left') left++
            }
          }
        }
        const ctx = `${fam}${grade} ${set}`
        expect(ties / n, ctx).toBeLessThanOrEqual(cfg.tieRate * 1.3 + 0.01)
        if (cfg.tieRate > 0) expect(ties / n, ctx).toBeGreaterThan(cfg.tieRate * 0.4)
        // (traps need room — see the gate tests — so in play they sit at or under the set rate)
        expect(traps / n, ctx).toBeGreaterThan(cfg.trapRate * 0.3)
        expect(traps / n, ctx).toBeLessThan(cfg.trapRate * 1.3)
        expect(left / (n - ties), ctx).toBeGreaterThan(0.4)
        expect(left / (n - ties), ctx).toBeLessThan(0.6)
      }
    }
  }, 30000)

  it('is a pure function of the seed', () => {
    expect(planLevel({ family: 'mul', grade: 3, seed: 'x' }, 1)).toEqual(planLevel({ family: 'mul', grade: 3, seed: 'x' }, 1))
    expect(LEVELS).toBe(3)
  })

  it("keeps 2nd grade within 100 and lets 3rd grade double past it", () => {
    expect(planLevel({ family: 'mul', grade: 2, seed: 'c' }, 0).cap).toBe(100)
    expect(planLevel({ family: 'mul', grade: 3, seed: 'c' }, 0).cap).toBe(200)
    expect(planLevel({ family: 'mul', grade: 0, seed: 'c' }, 0).cap).toBe(20)
  })
})

describe('finale, stars, score and hint', () => {
  it('tunes the Gang just under the worst one-slip finish', () => {
    expect(gangFor(60, 20, 50)).toBe(48)
    expect(gangFor(60, 20, 21)).toBe(20) // one slip costs everything: the slip still wins (by 1)
    expect(gangFor(10, 9, 9)).toBe(8)
    expect(gangFor(30, 40, 30)).toBe(26) // weak path ended bigger: both win, smart comfortably
    expect(gangFor(2, 2)).toBe(1)
  })

  it('gives stars for smart picks, capped by tug-of-war wins', () => {
    expect(paradeStars({ smart: 16, total: 17, wins: 3, levels: 3 })).toBe(3)
    expect(paradeStars({ smart: 16, total: 17, wins: 2, levels: 3 })).toBe(2)
    expect(paradeStars({ smart: 12, total: 17, wins: 3, levels: 3 })).toBe(2)
    expect(paradeStars({ smart: 8, total: 17, wins: 1, levels: 3 })).toBe(1)
    expect(paradeStars({ smart: 5, total: 17, wins: 0, levels: 3 })).toBe(0)
    expect(paradeStars({ smart: 0, total: 0, wins: 0, levels: 3 })).toBe(0)
  })

  it('scores the parade size, smart picks and the finale', () => {
    expect(levelScore({ count: 40, smartPicks: 5, win: true, margin: 12 })).toBe(40 + 125 + 112)
    expect(levelScore({ count: 40, smartPicks: 2, win: false, margin: -3 })).toBe(90)
  })

  it('hints with the biggest missed gain', () => {
    const plan = planLevel({ family: 'mul', grade: 3, seed: 'hint' }, 0)
    const { state } = play(plan, (p) => (p.winner === 'tie' ? 'left' : other(bestSide(p))))
    const hint = lossHint(state.decisions, plan.opSet)
    expect(hint).toMatch(/^With \d+, .+ made \d+ but .+ made \d+\./)
    expect(lossHint([], 'mulAdd')).toMatch(/×/)
  })
})

describe('formation', () => {
  it('spreads slots evenly in a column (no two critters on one spot)', () => {
    const pts = Array.from({ length: 150 }, (_, i) => slotOffset(i, { x: 0, z: 0 }))
    let minD = Infinity
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++) minD = Math.min(minD, Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z))
    expect(minD).toBeGreaterThan(PARADE_SHAPE.spacing * 0.35)
    const w = Math.max(...pts.map((p) => Math.abs(p.x)))
    const d = Math.max(...pts.map((p) => Math.abs(p.z)))
    expect(d).toBeGreaterThan(w * 1.5)
  })
})

describe('voice lines', () => {
  it('every line the parade says resolves (slots inside the recorded ranges)', () => {
    const r = seededRng('voice')
    for (const [family, grade] of SETUPS) {
      const listen = grade <= 1
      for (let s = 0; s < 20; s++) {
        for (const plan of planRun({ family, grade, seed: `voice-${s}` })) {
          voiceText(introLine('more', listen))
          voiceText(introLine('keep', listen))
          const { pairs, cages, state } = play(plan, () => (r() < 0.5 ? 'left' : 'right'))
          for (const p of pairs) {
            const ref = gatePrompt(p, listen, plan.opSet)
            expect(voiceText(ref).length).toBeGreaterThan(0)
            if (listen && p.left.op.kind === 'add' && p.right.op.kind === 'add') expect(ref).toHaveProperty('template', 'parade/plusOrPlus')
            for (const side of ['left', 'right'] as const) voiceText(afterPick(decide(p, side), listen, s, plan.opSet))
          }
          for (const c of cages) voiceText(cageLine(c))
          const f = finaleOutcome(state)
          voiceText(finaleLine(f.margin, listen))
        }
      }
    }
    const k1 = startLevel(planLevel({ family: 'mul', grade: 0, seed: 'v' }, 0)).upcoming
    expect(k1?.kind).toBe('gate')
    if (k1?.kind === 'gate') expect(voiceText(gatePrompt(k1.pair, true))).toMatch(/^(Plus|Take away) \d+ or (plus|take away) \d+\?$/)
  })
})

// ── 1st grade (phase 2b): Adding Mesa's + gates and Take-Away Dunes' − gates, written as numerals ──
describe('1st grade parades (phase 2b)', () => {
  /**
   * Fingerprints of kindergarten's and grades 2–5's parades (every level's
   * plan, the pairs and cages along the smart and weak paths, every voice
   * line), taken from the engine before the 1st-grade sets were added
   * (commit 7492020) with the same function: they must not move.
   */
  const BEFORE: Record<string, string> = {
    mul0: '415dd4e8',
    mul2: '59e059ae',
    mul3: '0c705a2d',
    mul4: '99725f92',
    mul5: 'baf28c4f',
    div0: '415dd4e8',
    div2: 'bcd26e19',
    div3: '040d36d8',
    div4: '5e3fcec3',
    div5: 'baf28c4f',
  }

  it('kindergarten’s parade and grades 2–5’s are exactly as they were', () => {
    const m = { planRun, startLevel, passGate, passCage, bestSide, gatePrompt, afterPick, introLine, cageLine, finaleLine, finaleOutcome, lossHint }
    for (const fam of ['mul', 'div'] as const) for (const g of [0, 2, 3, 4, 5]) expect(paradeFingerprint(m, fam, g), `${fam} grade ${g}`).toBe(BEFORE[`${fam}${g}`])
    // kindergarten keeps its dots
    expect(showsDots(opSetFor('mul', 0))).toBe(true)
  }, 30000)

  it('the stages pick the families: Adding Mesa’s `add` (×), Take-Away Dunes’ `sub` (÷ and −); 1st grade gets its own sets, written as numerals', () => {
    expect([paradeFamily('add'), paradeFamily('mul'), paradeFamily(undefined), paradeFamily('sub'), paradeFamily('div')]).toEqual(['mul', 'mul', 'mul', 'div', 'div'])
    expect(opSetFor(paradeFamily('add'), 1)).toBe('add20')
    expect(opSetFor(paradeFamily('sub'), 1)).toBe('sub20')
    expect(showsDots('add20') || showsDots('sub20')).toBe(false)
    expect(isListenSet('add20') && isListenSet('sub20') && isListenSet('addSub') && !isListenSet('mulAdd')).toBe(true)
  })

  it('Adding Mesa: + gates within 20 (a "+2 or −6" trap now and then), the parade grows, the gate pair asked aloud', () => {
    const r = seededRng('g1-add')
    let pairs = 0
    let plus = 0
    for (let s = 0; s < 40; s++)
      for (const plan of planRun({ family: 'mul', grade: 1, seed: `g1a-${s}` })) {
        expect(plan.opSet).toBe('add20')
        expect(plan.cap).toBe(20)
        const { pairs: ps, state } = play(plan, () => (r() < 0.5 ? 'left' : 'right'))
        for (const p of ps) {
          pairs++
          for (const g of [p.left, p.right]) {
            expect(g.label, g.label).toMatch(/^[+−]\d$/)
            expect(g.result).toBeLessThanOrEqual(20)
          }
          if (p.left.op.kind === 'add' && p.right.op.kind === 'add') plus++
          const ref = gatePrompt(p, true, plan.opSet)
          expect(voiceText(ref)).toMatch(/^(Plus|Minus) \d+ or (plus|minus) \d+\?$|gate/)
        }
        expect(state.count).toBeLessThanOrEqual(20)
      }
    // mostly + gates
    expect(plus / pairs).toBeGreaterThan(0.75)
  }, 30000)

  it('Take-Away Dunes: − gates within 20, which keeps more; a welcome cage fills the parade first; "Minus three or minus six?"', () => {
    const r = seededRng('g1-sub')
    let keep = 0
    let pairs = 0
    for (let s = 0; s < 40; s++)
      for (const plan of planRun({ family: 'div', grade: 1, seed: `g1s-${s}` })) {
        expect(plan.opSet).toBe('sub20')
        expect(plan.events[0].kind).toBe('cage')
        const { pairs: ps, cages } = play(plan, () => (r() < 0.5 ? 'left' : 'right'))
        expect(plan.start + cages[0]).toBeGreaterThanOrEqual(15)
        for (const p of ps) {
          pairs++
          for (const g of [p.left, p.right]) expect(g.label).toMatch(/^[+−]\d$/)
          if (p.goal === 'keep') {
            keep++
            expect(p.left.op.kind === 'sub' && p.right.op.kind === 'sub').toBe(true)
            expect(voiceText(gatePrompt(p, true, plan.opSet))).toMatch(/^Minus \d+ or minus \d+\?$|keeps more/)
          }
        }
      }
    expect(keep / pairs).toBeGreaterThan(0.8)
    expect(voiceText(introLine('keep', true))).toMatch(/keeps more friends/)
    // a weak pick hears what the other gate would have left
    const plan = planLevel({ family: 'div', grade: 1, seed: 'weak' }, 0)
    let st = startLevel(plan)
    while (st.upcoming?.kind === 'cage') st = passCage(st).state
    if (st.upcoming?.kind === 'gate' && st.upcoming.pair.goal === 'keep' && st.upcoming.pair.winner !== 'tie') {
      const weak = other(bestSide(st.upcoming.pair))
      expect(voiceText(afterPick(decide(st.upcoming.pair, weak), true, 0, plan.opSet))).toMatch(/^Minus \d+ would have left \d+!$/)
    }
  }, 30000)
})
