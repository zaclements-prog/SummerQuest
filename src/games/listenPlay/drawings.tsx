/* eslint-disable react-refresh/only-export-components -- a registry of drawings (data), not an HMR boundary */
import type { ReactNode } from 'react'
import { M } from '../../tutoring/motion/palette'

/**
 * Drawn pictures for the Listen & Play cards (`Picture` kind `art`): things
 * emoji can't show, or can't show on every tablet (Unicode 10 and later), and
 * actions a still emoji can't: a push and a pull, a kite, mittens, the
 * weather. Flat, ink-outlined and centred in a 100 × 100 box like every other
 * card picture (PictureCard), nothing to read on any of them.
 *
 *   <PictureArt picture={{ kind: 'art', name: 'pushIcon' }} />
 *
 * Push and pull (K-PS2) are an icon pair the Nature Summit lesson introduces:
 * a PUSH is a flat hand against a box with a coral arrow pointing AWAY from
 * the hand; a PULL is a hand gripping a rope tied to the box with a blue arrow
 * pointing back TOWARD the hand. The action scenes put a child at a swing, a
 * door, a wagon, …, with a gold arrow for which way the thing moves (never
 * coral or blue: the scene's colours don't give the answer away).
 */

const INK = M.ink
const OUT = 3.2
const SKIN = '#f6d2ad'
const HAIR = '#7a5236'
/** The push arrow's colour (the pull's is blue): the icon pair's own, never a scene's. */
export const PUSH = '#f2766b'
export const PULL = '#4aa6d6'
const MOVE = '#ffcf4d'
const WOOD = '#d9a66b'
const WOOD_DARK = '#b8834f'
const ink = { stroke: INK, strokeWidth: OUT, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

type Pt = [number, number]

/** A thick arrow from `a` to `b` (head at `b`), ink-outlined. */
export function Arrow({ a, b, color, w = 7, head = 11 }: { a: Pt; b: Pt; color: string; w?: number; head?: number }) {
  const [x1, y1] = a
  const [x2, y2] = b
  const len = Math.hypot(x2 - x1, y2 - y1) || 1
  const ux = (x2 - x1) / len
  const uy = (y2 - y1) / len
  const bx = x2 - ux * head
  const by = y2 - uy * head
  const nx = -uy
  const ny = ux
  const hw = head * 0.85
  const p = (x: number, y: number) => `${x.toFixed(1)},${y.toFixed(1)}`
  const shaft = [p(x1 + (nx * w) / 2, y1 + (ny * w) / 2), p(bx + (nx * w) / 2, by + (ny * w) / 2), p(bx + nx * hw, by + ny * hw), p(x2, y2), p(bx - nx * hw, by - ny * hw), p(bx - (nx * w) / 2, by - (ny * w) / 2), p(x1 - (nx * w) / 2, y1 - (ny * w) / 2)]
  return <polygon points={shaft.join(' ')} fill={color} {...ink} strokeWidth={2.6} />
}

/** Short speed lines behind something moving in direction `dir` (unit x). */
export function Whoosh({ x, y, dir }: { x: number; y: number; dir: 1 | -1 }) {
  return (
    <g stroke={INK} strokeWidth={2.4} strokeLinecap="round" opacity={0.55}>
      {[-7, 0, 7].map((dy, i) => (
        <line key={dy} x1={x} y1={y + dy} x2={x - dir * (i === 1 ? 12 : 8)} y2={y + dy} />
      ))}
    </g>
  )
}

/**
 * A child, side view, feet at `y` (default 90), facing `dir` (1: right). The
 * upper body leans `lean` degrees toward where it faces (negative: leaning
 * back, pulling). `hands`: where the hands reach (both arms go there).
 */
export function Kid({ x, y = 90, dir, lean = 0, hands, shirt = '#8ab8ff', kick }: { x: number; y?: number; dir: 1 | -1; lean?: number; hands: Pt; shirt?: string; kick?: Pt }) {
  const hip: Pt = [x, y - 22]
  const rot = `rotate(${dir * lean} ${hip[0]} ${hip[1]})`
  // the shoulder, after the lean
  const a = ((dir * lean) * Math.PI) / 180
  const sh: Pt = [hip[0] + Math.sin(a) * 18, hip[1] - Math.cos(a) * 18]
  const foot2: Pt = kick ?? [x + dir * 6, y]
  return (
    <g>
      {/* legs */}
      <line x1={hip[0]} y1={hip[1]} x2={x - dir * 6} y2={y} stroke={INK} strokeWidth={6.5} strokeLinecap="round" />
      <line x1={hip[0]} y1={hip[1]} x2={foot2[0]} y2={foot2[1]} stroke={INK} strokeWidth={6.5} strokeLinecap="round" />
      <line x1={hip[0]} y1={hip[1]} x2={x - dir * 6} y2={y} stroke="#5b6fa8" strokeWidth={3.4} strokeLinecap="round" />
      <line x1={hip[0]} y1={hip[1]} x2={foot2[0]} y2={foot2[1]} stroke="#5b6fa8" strokeWidth={3.4} strokeLinecap="round" />
      {/* the far arm, behind the body */}
      <line x1={sh[0]} y1={sh[1]} x2={hands[0]} y2={hands[1] + 2} stroke={INK} strokeWidth={5.6} strokeLinecap="round" />
      <line x1={sh[0]} y1={sh[1]} x2={hands[0]} y2={hands[1] + 2} stroke={SKIN} strokeWidth={2.6} strokeLinecap="round" />
      <g transform={rot}>
        {/* body */}
        <rect x={x - 8} y={hip[1] - 20} width={16} height={22} rx={6} fill={shirt} {...ink} />
        {/* head and hair */}
        <circle cx={x} cy={hip[1] - 29} r={9.5} fill={SKIN} {...ink} />
        <path d={`M ${x - 9.5} ${hip[1] - 30} A 9.5 9.5 0 0 1 ${x + 9.5} ${hip[1] - 30} Q ${x} ${hip[1] - 35} ${x - 9.5} ${hip[1] - 30} Z`} fill={HAIR} {...ink} strokeWidth={2.2} />
        <circle cx={x + dir * 4.5} cy={hip[1] - 28} r={1.4} fill={INK} />
      </g>
      {/* the near arm, in front */}
      <line x1={sh[0]} y1={sh[1]} x2={hands[0]} y2={hands[1]} stroke={INK} strokeWidth={6} strokeLinecap="round" />
      <line x1={sh[0]} y1={sh[1]} x2={hands[0]} y2={hands[1]} stroke={SKIN} strokeWidth={3} strokeLinecap="round" />
      <circle cx={hands[0]} cy={hands[1]} r={3.6} fill={SKIN} {...ink} strokeWidth={2.2} />
    </g>
  )
}

/** A wooden crate (the push / pull icons' box). */
export function Crate({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g>
      <rect x={x} y={y} width={s} height={s} rx={3} fill={WOOD} {...ink} />
      <path d={`M ${x + 3} ${y + 3} L ${x + s - 3} ${y + s - 3} M ${x + s - 3} ${y + 3} L ${x + 3} ${y + s - 3}`} stroke={WOOD_DARK} strokeWidth={3} />
      <rect x={x} y={y} width={s} height={s} rx={3} fill="none" {...ink} />
    </g>
  )
}

/** An open hand (✋), its right edge pressing on something at +x (`dir` 1; -1 mirrors it). */
export function Palm({ x, y, dir = 1 }: { x: number; y: number; dir?: 1 | -1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${dir} 1)`}>
      {/* the arm, from off to the side */}
      <path d="M -32 10 L -12 8" stroke={INK} strokeWidth={11} strokeLinecap="round" />
      <path d="M -32 10 L -12 8" stroke={SKIN} strokeWidth={6} strokeLinecap="round" />
      {/* four fingers, then the palm over their roots, then the thumb */}
      {[-14, -9, -4, 1].map((fx, i) => (
        <rect key={fx} x={fx} y={i === 0 ? -15 : i === 3 ? -16 : -19} width={5} height={20} rx={2.5} fill={SKIN} {...ink} strokeWidth={2.2} />
      ))}
      <rect x={-15} y={-4} width={22} height={19} rx={7} fill={SKIN} {...ink} strokeWidth={2.4} />
      <path d="M -14 0 L -12 -4" stroke={SKIN} strokeWidth={4} />
      <ellipse cx={-17} cy={4} rx={3.6} ry={7} transform="rotate(-30 -17 4)" fill={SKIN} {...ink} strokeWidth={2.2} />
    </g>
  )
}

/** A fist holding a rope that runs off toward +x (`dir` 1). */
export function Fist({ x, y, dir = 1 }: { x: number; y: number; dir?: 1 | -1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${dir} 1)`}>
      <path d="M -30 4 L -8 2" stroke={INK} strokeWidth={11} strokeLinecap="round" />
      <path d="M -30 4 L -8 2" stroke={SKIN} strokeWidth={6} strokeLinecap="round" />
      <rect x={-10} y={-9} width={17} height={19} rx={7} fill={SKIN} {...ink} strokeWidth={2.6} />
      <path d="M -3 -9 L -3 -2 M 2 -9 L 2 -2" stroke={INK} strokeWidth={2} strokeLinecap="round" />
    </g>
  )
}

export function Sun({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return <line key={i} x1={x + Math.cos(a) * (r + 4)} y1={y + Math.sin(a) * (r + 4)} x2={x + Math.cos(a) * (r + 11)} y2={y + Math.sin(a) * (r + 11)} stroke={INK} strokeWidth={6} strokeLinecap="round" />
      })}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return <line key={i} x1={x + Math.cos(a) * (r + 4)} y1={y + Math.sin(a) * (r + 4)} x2={x + Math.cos(a) * (r + 11)} y2={y + Math.sin(a) * (r + 11)} stroke="#ffcf4d" strokeWidth={2.8} strokeLinecap="round" />
      })}
      <circle cx={x} cy={y} r={r} fill="#ffd75e" {...ink} />
    </g>
  )
}

export function Cloud({ x, y, s = 1, fill = '#ffffff' }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M -24 8 Q -30 8 -30 1 Q -30 -6 -22 -7 Q -21 -18 -9 -18 Q -2 -26 8 -20 Q 20 -22 22 -10 Q 31 -9 30 0 Q 30 8 22 8 Z" fill={fill} {...ink} />
    </g>
  )
}

/** A scene's backdrop: a rounded window of sky over the ground (`ground` null: sky only). */
function Backdrop({ sky, ground, groundY = 74, children }: { sky: string; ground?: string | null; groundY?: number; children?: ReactNode }) {
  return (
    <g>
      <rect x={4} y={4} width={92} height={92} rx={14} fill={sky} />
      {ground && <path d={`M 4 ${groundY} Q 50 ${groundY - 5} 96 ${groundY} L 96 82 Q 96 96 82 96 L 18 96 Q 4 96 4 82 Z`} fill={ground} />}
      {children}
      <rect x={4} y={4} width={92} height={92} rx={14} fill="none" {...ink} />
    </g>
  )
}

const flake = (x: number, y: number, r: number, k: number) => (
  <g key={k} stroke={INK} strokeWidth={1.8} strokeLinecap="round">
    {[0, 60, 120].map((a) => {
      const t = (a * Math.PI) / 180
      return <line key={a} x1={x - Math.cos(t) * r} y1={y - Math.sin(t) * r} x2={x + Math.cos(t) * r} y2={y + Math.sin(t) * r} />
    })}
  </g>
)

const drop = (x: number, y: number, k: number) => <path key={k} d={`M ${x} ${y - 6} Q ${x + 4.5} ${y + 1} ${x} ${y + 4} Q ${x - 4.5} ${y + 1} ${x} ${y - 6} Z`} fill="#6cc7ea" {...ink} strokeWidth={2} />

// ── the drawings ─────────────────────────────────────────────────────────────

export const DRAWINGS: Record<string, () => ReactNode> = {
  // ── the weather (K-ESS2) ──
  sunny: () => (
    <Backdrop sky="#bfe6ff" ground="#a9e08f">
      <Sun x={50} y={40} r={17} />
      <path d="M 22 86 L 22 76" stroke={INK} strokeWidth={2.6} />
      <circle cx={22} cy={74} r={4.5} fill="#f7a1c4" {...ink} strokeWidth={2.2} />
      <path d="M 78 86 L 78 77" stroke={INK} strokeWidth={2.6} />
      <circle cx={78} cy={75} r={4.5} fill="#ffd75e" {...ink} strokeWidth={2.2} />
    </Backdrop>
  ),
  rainy: () => (
    <Backdrop sky="#c9d3df" ground="#8fbf7a">
      <Cloud x={50} y={36} s={1.2} fill="#a9b4c4" />
      {[
        [30, 58],
        [46, 64],
        [62, 56],
        [74, 67],
        [36, 76],
        [54, 77],
      ].map(([x, y], k) => drop(x, y, k))}
      <ellipse cx={66} cy={87} rx={18} ry={4.5} fill="#6cc7ea" {...ink} strokeWidth={2.2} />
    </Backdrop>
  ),
  snowy: () => (
    <Backdrop sky="#dfe8f2" ground="#ffffff" groundY={72}>
      <Cloud x={42} y={30} s={1.0} fill="#c3cede" />
      {[
        [22, 50, 4],
        [40, 54, 3.5],
        [58, 46, 4],
        [82, 30, 3.5],
        [86, 52, 3],
        [28, 64, 3],
      ].map(([x, y, r], k) => flake(x, y, r, k))}
      {/* a snowman */}
      <circle cx={70} cy={79} r={10} fill="#ffffff" {...ink} />
      <circle cx={70} cy={63} r={7.5} fill="#ffffff" {...ink} />
      <path d="M 70 63.5 L 77 65" stroke="#f2a65a" strokeWidth={2.6} strokeLinecap="round" />
      <circle cx={67.5} cy={61} r={1.1} fill={INK} />
      <circle cx={72} cy={61} r={1.1} fill={INK} />
      <path d={`M 6 72 Q 50 66 94 72`} fill="none" stroke={INK} strokeWidth={2} opacity={0.4} />
    </Backdrop>
  ),
  windy: () => (
    <Backdrop sky="#d4eefc" ground="#a9e08f">
      {/* a tree bending in the wind */}
      <path d="M 26 88 Q 28 70 36 58" stroke={INK} strokeWidth={8} strokeLinecap="round" fill="none" />
      <path d="M 26 88 Q 28 70 36 58" stroke="#9a6a46" strokeWidth={4} strokeLinecap="round" fill="none" />
      <path d="M 30 56 Q 26 38 44 34 Q 60 30 66 44 Q 70 56 56 60 Q 42 64 30 56 Z" fill="#6cc56b" {...ink} />
      {/* the wind */}
      {[
        [56, 20, 84],
        [62, 70, 90],
        [70, 46, 92],
      ].map(([y, x0, x1], k) => (
        <path key={k} d={`M ${x0} ${y} L ${x1 - 8} ${y} Q ${x1} ${y} ${x1} ${y - 6} Q ${x1} ${y - 11} ${x1 - 5} ${y - 11} Q ${x1 - 9} ${y - 11} ${x1 - 9} ${y - 7}`} fill="none" stroke={INK} strokeWidth={2.8} strokeLinecap="round" />
      ))}
      {/* leaves blown off */}
      {[
        [78, 30, 30],
        [86, 62, -20],
        [48, 76, 60],
      ].map(([x, y, r], k) => (
        <ellipse key={k} cx={x} cy={y} rx={5} ry={2.8} transform={`rotate(${r} ${x} ${y})`} fill="#8edb7c" {...ink} strokeWidth={1.8} />
      ))}
    </Backdrop>
  ),

  // ── what to wear or bring ──
  sunglasses: () => (
    <g>
      <path d="M 12 42 Q 30 36 50 42 Q 70 36 88 42" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <path d="M 14 42 Q 14 64 30 64 Q 45 64 46 44 Z" fill="#3a2c38" {...ink} />
      <path d="M 86 42 Q 86 64 70 64 Q 55 64 54 44 Z" fill="#3a2c38" {...ink} />
      <path d="M 22 48 L 30 46" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" opacity={0.7} />
      <path d="M 62 48 L 70 46" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" opacity={0.7} />
      <path d="M 12 42 L 6 36 M 88 42 L 94 36" stroke={INK} strokeWidth={4} strokeLinecap="round" />
    </g>
  ),
  sunHat: () => (
    <g>
      <ellipse cx={50} cy={60} rx={42} ry={14} fill="#f6e3b4" {...ink} />
      <path d="M 26 58 Q 26 30 50 30 Q 74 30 74 58 Z" fill="#f6e3b4" {...ink} />
      <path d="M 27 52 Q 50 58 73 52 L 73 58 Q 50 64 27 58 Z" fill="#f2766b" {...ink} strokeWidth={2.4} />
      <circle cx={72} cy={52} r={5} fill="#f7a1c4" {...ink} strokeWidth={2.2} />
    </g>
  ),
  umbrella: () => (
    <g>
      <path d="M 50 50 L 50 80 Q 50 88 42 88 Q 36 88 36 82" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
      <path d="M 50 50 L 50 80 Q 50 88 42 88 Q 36 88 36 82" fill="none" stroke="#9a6a46" strokeWidth={2.2} strokeLinecap="round" />
      <path d="M 8 52 Q 10 16 50 14 Q 90 16 92 52 Q 85 46 78 52 Q 71 46 64 52 Q 57 46 50 52 Q 43 46 36 52 Q 29 46 22 52 Q 15 46 8 52 Z" fill="#8461b6" {...ink} />
      <path d="M 50 14 Q 40 30 36 51 M 50 14 Q 60 30 64 51" fill="none" stroke={INK} strokeWidth={2.2} />
      <path d="M 50 14 L 50 9" stroke={INK} strokeWidth={4} strokeLinecap="round" />
    </g>
  ),
  mittens: () => (
    <g>
      {[
        { x: 30, r: -10, c: '#f2766b' },
        { x: 70, r: 10, c: '#4aa6d6' },
      ].map(({ x, r, c }, k) => (
        <g key={k} transform={`rotate(${r} ${x} 50) translate(${x} 50) scale(${k ? -1 : 1} 1)`}>
          <path d="M -12 22 L -12 -6 Q -12 -26 2 -26 Q 16 -26 16 -6 L 16 22 Z" fill={c} {...ink} />
          <path d="M -12 2 Q -24 -2 -22 -12 Q -18 -18 -12 -10" fill={c} {...ink} />
          <rect x={-14} y={20} width={32} height={12} rx={4} fill="#ffffff" {...ink} />
          <path d="M -6 22 L -6 30 M 2 22 L 2 30 M 10 22 L 10 30" stroke={INK} strokeWidth={1.6} opacity={0.5} />
        </g>
      ))}
    </g>
  ),
  warmHat: () => (
    <g>
      <circle cx={50} cy={18} r={9} fill="#ffffff" {...ink} />
      <path d="M 18 66 Q 16 26 50 24 Q 84 26 82 66 Z" fill="#f2766b" {...ink} />
      <path d="M 32 34 Q 34 50 34 64 M 50 26 L 50 64 M 68 34 Q 66 50 66 64" stroke="#d9564a" strokeWidth={3} fill="none" />
      <rect x={14} y={62} width={72} height={18} rx={7} fill="#ffcf4d" {...ink} />
      <path d="M 24 64 L 24 78 M 34 64 L 34 78 M 44 64 L 44 78 M 54 64 L 54 78 M 64 64 L 64 78 M 74 64 L 74 78" stroke={INK} strokeWidth={1.6} opacity={0.45} />
    </g>
  ),
  scarf: () => (
    <g>
      {/* the loop (its back, then its front), a knot, and two ends hanging down with stripes and fringe */}
      <path d="M 22 30 Q 50 14 78 30" fill="none" stroke={INK} strokeWidth={13} strokeLinecap="round" />
      <path d="M 22 30 Q 50 14 78 30" fill="none" stroke="#4fae99" strokeWidth={7} strokeLinecap="round" />
      <path d="M 16 30 Q 50 52 84 30 L 82 42 Q 50 64 18 42 Z" fill="#74d3bd" {...ink} />
      <path d="M 36 50 L 22 84 L 36 88 L 46 52 Z" fill="#74d3bd" {...ink} />
      <path d="M 44 52 L 48 90 L 62 88 L 52 50 Z" fill="#74d3bd" {...ink} />
      <path d="M 31 62 L 41 65 M 27 73 L 38 76 M 47 66 L 57 64 M 48 77 L 59 75" stroke="#f2766b" strokeWidth={4.5} strokeLinecap="round" />
      <rect x={38} y={42} width={16} height={14} rx={5} fill="#74d3bd" {...ink} />
      <path d="M 24 86 L 21 94 M 29 87 L 27 95 M 34 88 L 33 96 M 50 90 L 50 97 M 55 89 L 56 97 M 60 88 L 62 96" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
    </g>
  ),
  kite: () => (
    <g>
      {/* the string and the tail */}
      <path d="M 50 62 Q 42 76 54 86 Q 64 94 58 98" fill="none" stroke={INK} strokeWidth={2} />
      <path d="M 50 62 Q 30 72 24 92" fill="none" stroke={INK} strokeWidth={1.6} strokeDasharray="3 3" />
      {[
        [47, 74],
        [55, 86],
      ].map(([x, y], k) => (
        <path key={k} d={`M ${x - 6} ${y - 4} L ${x} ${y} L ${x - 6} ${y + 4} Z M ${x + 6} ${y - 4} L ${x} ${y} L ${x + 6} ${y + 4} Z`} fill="#f7a1c4" {...ink} strokeWidth={1.8} />
      ))}
      <path d="M 50 6 L 76 32 L 50 62 L 24 32 Z" fill="#ffcf4d" {...ink} />
      <path d="M 50 6 L 50 62 L 24 32 Z" fill="#f2766b" {...ink} />
      <path d="M 24 32 L 76 32" stroke={INK} strokeWidth={2.4} />
    </g>
  ),

  // ── push and pull (K-PS2): the icon pair ──
  pushIcon: () => (
    <g>
      <Crate x={50} y={42} s={36} />
      <Palm x={48} y={60} />
      <Arrow a={[42, 24]} b={[90, 24]} color={PUSH} />
      <Whoosh x={47} y={60} dir={1} />
    </g>
  ),
  pullIcon: () => (
    <g>
      <Crate x={58} y={42} s={36} />
      <path d="M 28 60 Q 44 66 58 60" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
      <path d="M 28 60 Q 44 66 58 60" fill="none" stroke="#d9a66b" strokeWidth={2.4} strokeLinecap="round" />
      <Fist x={24} y={60} />
      <Arrow a={[90, 24]} b={[30, 24]} color={PULL} />
    </g>
  ),
  bigPush: () => (
    <g>
      <Palm x={30} y={64} />
      <circle cx={84} cy={64} r={11} fill="#f2766b" {...ink} />
      <path d="M 76 60 Q 84 68 92 60" fill="none" stroke="#ffcf4d" strokeWidth={3} />
      <Arrow a={[20, 32]} b={[94, 32]} color={PUSH} w={11} head={15} />
      <Whoosh x={70} y={64} dir={1} />
    </g>
  ),
  littlePush: () => (
    <g>
      <Palm x={30} y={64} />
      <circle cx={44} cy={64} r={11} fill="#f2766b" {...ink} />
      <path d="M 36 60 Q 44 68 52 60" fill="none" stroke="#ffcf4d" strokeWidth={3} />
      <Arrow a={[30, 32]} b={[54, 32]} color={PUSH} w={5} head={9} />
    </g>
  ),

  // ── push and pull: the actions (a gold arrow shows which way the thing moves) ──
  /** Push: she pushes the swing seat away. */
  swing: () => (
    <Backdrop sky="#e2f3ff" ground="#a9e08f" groundY={84}>
      <path d="M 40 10 L 92 10" stroke={INK} strokeWidth={5} strokeLinecap="round" />
      <path d="M 40 10 L 92 10" stroke="#c7955f" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M 62 10 L 74 58 M 82 10 L 92 56" stroke={INK} strokeWidth={1.8} />
      <rect x={70} y={56} width={24} height={5} rx={2} fill="#f2766b" {...ink} strokeWidth={2.2} transform="rotate(-8 82 58)" />
      <Kid x={42} dir={1} lean={18} hands={[69, 57]} shirt="#f7a1c4" />
      <Arrow a={[64, 36]} b={[90, 30]} color={MOVE} w={6} head={9} />
    </Backdrop>
  ),
  /** Push: he pushes the door open, away from him. */
  door: () => (
    <Backdrop sky="#fff3dc" ground={null}>
      <rect x={60} y={14} width={30} height={78} fill="#7a5236" {...ink} />
      {/* the door swinging away (a narrowing panel) */}
      <path d="M 60 14 L 78 22 L 78 86 L 60 92 Z" fill="#c7955f" {...ink} />
      <circle cx={74} cy={56} r={2.6} fill="#ffcf4d" {...ink} strokeWidth={1.6} />
      <Kid x={32} y={92} dir={1} lean={14} hands={[62, 50]} />
      <Arrow a={[52, 30]} b={[80, 30]} color={MOVE} w={6} head={9} />
    </Backdrop>
  ),
  /** Push: a kick sends the ball away. */
  kick: () => (
    <Backdrop sky="#e2f3ff" ground="#a9e08f" groundY={82}>
      <Kid x={30} y={90} dir={1} lean={-4} hands={[42, 60]} kick={[48, 82]} shirt="#ffcf4d" />
      <circle cx={62} cy={78} r={9} fill="#ffffff" {...ink} />
      <path d="M 57 74 L 62 71 L 67 74 L 65 80 L 59 80 Z" fill={INK} />
      <Whoosh x={50} y={66} dir={1} />
      <Arrow a={[56, 56]} b={[90, 56]} color={MOVE} w={6} head={9} />
    </Backdrop>
  ),
  /** Push: she pushes the cart away in front of her. */
  cart: () => (
    <Backdrop sky="#fff3dc" ground={null}>
      <path d="M 44 46 L 52 46 L 58 74 L 88 74" fill="none" stroke={INK} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 54 52 L 92 52 L 86 70 L 58 70 Z" fill="#9fe0f2" {...ink} />
      <path d="M 64 52 L 66 70 M 74 52 L 74 70 M 84 52 L 82 70" stroke={INK} strokeWidth={1.6} opacity={0.6} />
      <circle cx={62} cy={82} r={5} fill="#3a2c38" />
      <circle cx={84} cy={82} r={5} fill="#3a2c38" />
      <Kid x={26} y={90} dir={1} lean={14} hands={[44, 47]} shirt="#74d3bd" />
      <Arrow a={[58, 32]} b={[90, 32]} color={MOVE} w={6} head={9} />
    </Backdrop>
  ),
  /** Pull: he walks ahead and pulls the wagon along behind him. */
  wagon: () => (
    <Backdrop sky="#e2f3ff" ground="#a9e08f" groundY={84}>
      <path d="M 40 66 L 66 58" stroke={INK} strokeWidth={3.4} strokeLinecap="round" />
      <path d="M 10 56 L 40 56 L 38 74 L 12 74 Z" fill="#f2766b" {...ink} />
      <circle cx={17} cy={78} r={5} fill="#3a2c38" />
      <circle cx={33} cy={78} r={5} fill="#3a2c38" />
      <Kid x={72} y={90} dir={1} lean={6} hands={[64, 60]} />
      <Arrow a={[14, 40]} b={[44, 40]} color={MOVE} w={6} head={9} />
    </Backdrop>
  ),
  /** Pull: she pulls the drawer out, toward her. */
  drawer: () => (
    <Backdrop sky="#fff3dc" ground={null}>
      <rect x={8} y={30} width={40} height={62} rx={3} fill="#c7955f" {...ink} />
      <rect x={13} y={36} width={30} height={14} rx={2} fill="#d9a66b" {...ink} strokeWidth={2.2} />
      <rect x={13} y={72} width={30} height={14} rx={2} fill="#d9a66b" {...ink} strokeWidth={2.2} />
      {/* the middle drawer, pulled out */}
      <path d="M 13 54 L 58 54 L 58 68 L 13 68 Z" fill="#f1d9a6" {...ink} strokeWidth={2.4} />
      <circle cx={58} cy={61} r={2.6} fill="#ffcf4d" {...ink} strokeWidth={1.6} />
      <Kid x={80} y={92} dir={-1} lean={-12} hands={[60, 61]} shirt="#b79af0" />
      <Arrow a={[30, 22]} b={[62, 22]} color={MOVE} w={6} head={9} />
    </Backdrop>
  ),
  /** Pull: he pulls the kite string, bringing the kite in. */
  kiteString: () => (
    <Backdrop sky="#cfeaff" ground="#a9e08f" groundY={86}>
      <path d="M 72 26 L 36 64" stroke={INK} strokeWidth={1.8} />
      <path d="M 72 8 L 86 22 L 72 40 L 58 22 Z" fill="#ffcf4d" {...ink} strokeWidth={2.6} />
      <path d="M 72 8 L 72 40 L 58 22 Z" fill="#f2766b" {...ink} strokeWidth={2.6} />
      <path d="M 72 40 Q 66 48 74 54 Q 80 60 74 66" fill="none" stroke={INK} strokeWidth={1.6} />
      <Kid x={26} y={92} dir={1} lean={-14} hands={[36, 62]} shirt="#ffcf4d" />
      <Arrow a={[80, 50]} b={[56, 76]} color={MOVE} w={6} head={9} />
    </Backdrop>
  ),
  /** Pull: she pulls the carrot up out of the ground. */
  carrot: () => (
    <Backdrop sky="#e2f3ff" ground="#c7955f" groundY={70}>
      {/* the carrot, half out */}
      <path d="M 56 64 L 64 64 L 60 90 Z" fill="#f2a65a" {...ink} strokeWidth={2.6} />
      <path d="M 60 64 Q 54 50 50 46 M 60 64 Q 60 50 62 44 M 60 64 Q 66 52 72 48" fill="none" stroke="#4fa65a" strokeWidth={4.5} strokeLinecap="round" />
      <Kid x={34} y={92} dir={1} lean={-16} hands={[56, 50]} shirt="#74d3bd" />
      <Arrow a={[78, 80]} b={[78, 46]} color={MOVE} w={6} head={9} />
    </Backdrop>
  ),
}

/** A drawing by name, filling its box (nothing drawn for an unknown name). */
export function DrawingArt({ name, className }: { name: string; className: string }) {
  const draw = DRAWINGS[name]
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {draw ? draw() : null}
    </svg>
  )
}
