import { seededRng } from '../random'
import type { GateOp } from './ops'
import { opKey, opLabelParts, opSpeech } from './ops'
import { OP_SETS, detectTrap, wholeResult, type Maker, type MakerCtx, type Mode, type OpSetConfig } from './opSets'
import type { Gate, GatePair, GateState, Side } from './types'

/**
 * The gate-pair generator: pure and deterministic (the same state always gives
 * the same pair, so a level can be simulated ahead for its finale). Guarantees,
 * all property-tested in __tests__/gates.test.ts:
 *
 * - whole-number results, never below the floor (the level's start count),
 *   never above the band's cap;
 * - a declared winner (the larger result), or a deliberate tie at the set's
 *   rate; never two identical gates;
 * - a minimum gap that grows with difficulty (wide for warm-ups, close later),
 *   and a maximum gap on later pairs so they aren't giveaways;
 * - misconception traps at the set's rate (and never by accident);
 * - the winner's side is a coin flip; the pair never repeats the previous one.
 */

/** Minimum gap for a decided pair whose larger result is `big`. */
export function minGap(cfg: OpSetConfig, difficulty: 0 | 1 | 2, big: number): number {
  return Math.max(cfg.gapAbs[difficulty], Math.ceil(cfg.gapRel[difficulty] * big))
}

export function pairKey(a: GateOp, b: GateOp): string {
  const x = opKey(a)
  const y = opKey(b)
  return x < y ? `${x}|${y}` : `${y}|${x}`
}

function gate(op: GateOp, result: number, listen: boolean): Gate {
  const p = opLabelParts(op)
  return { op, label: p.main, sub: p.sub, speech: opSpeech(op, listen ? 'listen' : 'read'), result }
}

function weighted(makers: readonly Maker[], rng: () => number): Maker | null {
  let total = 0
  for (const m of makers) total += m.weight
  if (total <= 0) return null
  let x = rng() * total
  for (const m of makers) {
    x -= m.weight
    if (x < 0) return m
  }
  return makers[makers.length - 1]
}

interface Built {
  a: GateOp
  b: GateOp
  ra: number
  rb: number
}

/** Check every guarantee for a proposed pair; null if any fails. */
function validate(s: GateState, cfg: OpSetConfig, cap: number, mode: Mode, ops: [GateOp, GateOp]): Built | null {
  const [a, b] = ops
  if (opKey(a) === opKey(b)) return null
  if (pairKey(a, b) === s.prevKey) return null
  const ra = wholeResult(a, s.count)
  const rb = wholeResult(b, s.count)
  if (ra === null || rb === null) return null
  const lo = Math.max(0, s.floor)
  if (ra < lo || rb < lo || ra > cap || rb > cap) return null
  const tie = ra === rb
  if (tie !== (mode === 'tie')) return null
  if (!tie) {
    const big = Math.max(ra, rb)
    const gap = Math.abs(ra - rb)
    if (gap < minGap(cfg, s.difficulty, big)) return null
    if (gap > cfg.maxRel[s.difficulty] * big) return null
    const trap = ra > rb ? detectTrap(a, b) : detectTrap(b, a)
    if ((trap !== null) !== (mode === 'trap')) return null
  }
  return { a, b, ra, rb }
}

function finish(s: GateState, built: Built, maker: string, rng: () => number): GatePair {
  const listen = s.opSet === 'addSub'
  // sides are a coin flip, independent of how the maker ordered its ops
  const swap = rng() < 0.5
  const [lo, ro, lr, rr] = swap ? [built.b, built.a, built.rb, built.ra] : [built.a, built.b, built.ra, built.rb]
  const left = gate(lo, lr, listen)
  const right = gate(ro, rr, listen)
  const winner: Side | 'tie' = lr === rr ? 'tie' : lr > rr ? 'left' : 'right'
  const trap = winner === 'tie' ? null : winner === 'left' ? detectTrap(lo, ro) : detectTrap(ro, lo)
  return {
    left,
    right,
    winner,
    goal: lr < s.count && rr < s.count ? 'keep' : 'more',
    gap: Math.abs(lr - rr),
    trap,
    maker,
    key: pairKey(lo, ro),
    count: s.count,
  }
}

/** A plain "+a or +b" (or "−a or −b" at the cap) pair that always exists when cap − floor ≥ 3. */
function fallback(s: GateState, cfg: OpSetConfig, hardCap: number, rng: () => number): GatePair {
  const n = s.count
  const g = Math.max(1, cfg.gapAbs[s.difficulty])
  const tries: [GateOp, GateOp][] = []
  // growth first; a keep-more pair only when the cap leaves no room
  for (const kind of ['add', 'sub'] as const) {
    for (let a = 1; a <= 6; a++) for (const d of [g, 1, 2, 3]) tries.push([{ kind, k: a }, { kind, k: a + d }])
  }
  for (const [a, b] of tries) {
    if (pairKey(a, b) === s.prevKey) continue
    const ra = wholeResult(a, n)
    const rb = wholeResult(b, n)
    if (ra === null || rb === null || ra < Math.max(0, s.floor) || rb < Math.max(0, s.floor) || ra > hardCap || rb > hardCap) continue
    return finish(s, { a, b, ra, rb }, 'fallback', rng)
  }
  throw new Error(`gates: no pair fits count ${n} (floor ${s.floor}, cap ${hardCap})`)
}

/** The gate pair for this state (see the module note for what is guaranteed). */
export function makeGatePair(s: GateState): GatePair {
  const cfg = OP_SETS[s.opSet]
  const hardCap = Math.min(cfg.cap, s.cap ?? cfg.cap)
  if (hardCap - s.floor < 3) throw new Error(`gates: floor ${s.floor} leaves no room under cap ${hardCap}`)
  const rng = seededRng(`${s.seed}|${s.opSet}|${s.index}|${s.count}|${s.floor}|${s.ceiling ?? '-'}|${s.difficulty}|${s.prevKey ?? '-'}`)
  const wantTie = cfg.tieRate > 0 && rng() < cfg.tieRate
  const wantTrap = !wantTie && rng() < cfg.trapRate
  const mode: Mode = wantTie ? 'tie' : wantTrap ? 'trap' : 'normal'
  // The soft ceiling always leaves room to double (or grow by a couple of gaps),
  // so it shapes growth without starving a pair. An asked-for tie or trap may
  // go past it (up to the hard cap) before giving way to a normal pair.
  const headroom = Math.max(cfg.gapAbs[0] * 2 + 4, s.count)
  const soft = Math.min(hardCap, Math.max(s.floor + 3, s.ceiling ?? hardCap, s.count + headroom))
  const passes: [Mode, number][] =
    mode === 'normal'
      ? [['normal', soft], ['normal', hardCap]]
      : [[mode, soft], [mode, hardCap], ['normal', soft], ['normal', hardCap]]
  const maxFactor = s.maxFactor ?? cfg.maxFactor
  for (const [m, cap] of passes) {
    const makers = cfg.makers.filter((mk) => mk.modes.includes(m))
    if (!makers.length) continue
    for (let attempt = 0; attempt < 48; attempt++) {
      const maker = weighted(makers, rng)
      if (!maker) break
      const ctx: MakerCtx = {
        n: s.count,
        cap,
        floor: s.floor,
        maxFactor,
        addMax: cfg.addMax,
        subMax: cfg.subMax,
        gap: minGap(cfg, s.difficulty, Math.round(s.count * 1.5)),
        mode: m,
        rng,
      }
      const ops = maker.make(ctx)
      if (!ops) continue
      const built = validate(s, cfg, cap, m, ops)
      if (built) return finish(s, built, maker.id, rng)
    }
  }
  return fallback(s, cfg, hardCap, rng)
}

/** The count after walking through `side` of `pair`. */
export function resultOf(pair: GatePair, side: Side): number {
  return side === 'left' ? pair.left.result : pair.right.result
}

/** The better side (left on a tie: both work). */
export function bestSide(pair: GatePair): Side {
  return pair.winner === 'right' ? 'right' : 'left'
}
