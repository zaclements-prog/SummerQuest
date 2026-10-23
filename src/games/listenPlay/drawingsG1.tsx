/* eslint-disable react-refresh/only-export-components -- a registry of drawings (data), not an HMR boundary */
import type { ReactNode } from 'react'
import { M } from '../../tutoring/motion/palette'
import { LengthThingArt, START_GREEN } from './activities/measureArt'

/**
 * Drawings for the 1st-grade cards (`Picture` kind `art`), registered into the
 * kit's set by drawings.tsx (this file imports nothing from it, so there is no
 * import cycle). Flat, ink-outlined, centred in a 100 × 100 box like every
 * other card picture, nothing to read on any of them.
 *
 * - Measure Marsh: a pencil with paper clips (or cubes) under it, measured the
 *   right way (end to end from the start line), with gaps, overlapping, or
 *   begun past the start line (`g1units-<how>-<unit>`).
 * - Sky Summit, light and sound (1-PS4): a bell, a drum and a guitar, shaking
 *   (making a sound: shake lines and notes) or still, hit or plucked, or held
 *   still; a dark room and a lit one; a tree (or a girl) in the sun with its
 *   shadow on the side away from the sun, toward it, or none; a flashlight
 *   shining at glass, wax paper and wood.
 * - Sky Summit, the sky (1-ESS1): the day sky and the night sky; the sun on
 *   its path across the sky (coming up, high at lunch time, going down); a
 *   summer day and a winter day, each with a day-and-night bar (more yellow in
 *   summer: more daylight); the moon full, half and thin on the night sky; a
 *   sun-moon pattern strip with a question mark for what comes next.
 * - Sky Summit, animal families (1-LS1): a bird feeding its chicks, a hen
 *   keeping her eggs warm, a monkey carrying her baby.
 */

const INK = M.ink
const OUT = 3.2
const ink = { stroke: INK, strokeWidth: OUT, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
const SKIN = '#f6d2ad'
const GOLD = '#ffcf4d'
const WOOD = '#d9a66b'
const WOOD_DARK = '#b8834f'

/** A rounded window of sky over the ground (`ground` null: sky only). */
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

function Sun({ x, y, r, rays = true }: { x: number; y: number; r: number; rays?: boolean }) {
  return (
    <g>
      {rays &&
        Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2
          const p = (k: number) => [x + Math.cos(a) * (r + k), y + Math.sin(a) * (r + k)]
          const [x1, y1] = p(3.5)
          const [x2, y2] = p(r * 0.55 + 6)
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={5} strokeLinecap="round" />
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={GOLD} strokeWidth={2.2} strokeLinecap="round" />
            </g>
          )
        })}
      <circle cx={x} cy={y} r={r} fill="#ffd75e" {...ink} />
    </g>
  )
}

function Moon({ x, y, r }: { x: number; y: number; r: number }) {
  // a crescent: the disc, less a second disc up and to the right of it
  const c2: [number, number] = [r * 0.48, -r * 0.3]
  const r2 = r * 0.84
  const d = Math.hypot(c2[0], c2[1])
  const a = (r * r - r2 * r2 + d * d) / (2 * d)
  const h = Math.sqrt(r * r - a * a)
  const [ux, uy] = [c2[0] / d, c2[1] / d]
  const p1 = [x + a * ux - h * uy, y + a * uy + h * ux]
  const p2 = [x + a * ux + h * uy, y + a * uy - h * ux]
  const f = (p: number[]) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`
  return <path d={`M ${f(p1)} A ${r} ${r} 0 1 1 ${f(p2)} A ${r2} ${r2} 0 0 0 ${f(p1)} Z`} fill="#fff1a8" {...ink} strokeWidth={2.6} />
}

function Star({ x, y, r, fill = '#fff1a8' }: { x: number; y: number; r: number; fill?: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const rr = i % 2 ? r * 0.45 : r
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2
    return `${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`
  }).join(' ')
  return <polygon points={pts} fill={fill} {...ink} strokeWidth={1.8} />
}

function Cloud({ x, y, s = 1, fill = '#ffffff' }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M -24 8 Q -30 8 -30 1 Q -30 -6 -22 -7 Q -21 -18 -9 -18 Q -2 -26 8 -20 Q 20 -22 22 -10 Q 31 -9 30 0 Q 30 8 22 8 Z" fill={fill} {...ink} />
    </g>
  )
}

/** A thick arrow from a to b. */
function Arrow({ a, b, color, w = 6, head = 9 }: { a: [number, number]; b: [number, number]; color: string; w?: number; head?: number }) {
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
  const pts = [p(x1 + (nx * w) / 2, y1 + (ny * w) / 2), p(bx + (nx * w) / 2, by + (ny * w) / 2), p(bx + nx * hw, by + ny * hw), p(x2, y2), p(bx - nx * hw, by - ny * hw), p(bx - (nx * w) / 2, by - (ny * w) / 2), p(x1 - (nx * w) / 2, y1 - (ny * w) / 2)]
  return <polygon points={pts.join(' ')} fill={color} {...ink} strokeWidth={2.4} />
}

// ── Measure Marsh: measured the right way? ───────────────────────────────────

const U = 13
const X0 = 12
const UNIT_COLORS = ['#f2766b', '#ffcf4d', '#74d3bd', '#8ab8ff', '#b79af0', '#8edb7c', '#ff9f80']

/** A paper clip lying from x to x + w, centred on y. */
function Clip({ x, y, w }: { x: number; y: number; w: number }) {
  const h = 7
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={`M ${x + w - 2} ${y - h / 2 + 1.5} H ${x + 3.5} A ${h / 2 - 1} ${h / 2 - 1} 0 0 0 ${x + 3.5} ${y + h / 2 - 0.5} H ${x + w - 3.5} A ${h / 2 - 2} ${h / 2 - 2} 0 0 0 ${x + w - 3.5} ${y - h / 2 + 3.5} H ${x + 5.5}`} stroke={INK} strokeWidth={3.4} />
      <path d={`M ${x + w - 2} ${y - h / 2 + 1.5} H ${x + 3.5} A ${h / 2 - 1} ${h / 2 - 1} 0 0 0 ${x + 3.5} ${y + h / 2 - 0.5} H ${x + w - 3.5} A ${h / 2 - 2} ${h / 2 - 2} 0 0 0 ${x + w - 3.5} ${y - h / 2 + 3.5} H ${x + 5.5}`} stroke="#9fb4d6" strokeWidth={1.6} />
    </g>
  )
}

/** A connecting cube from x to x + w, sitting on y. */
function Cube({ x, y, w, color }: { x: number; y: number; w: number; color: string }) {
  return (
    <g>
      <rect x={x + w * 0.32} y={y - w - 2.2} width={w * 0.36} height={3} rx={1} fill={color} {...ink} strokeWidth={1.6} />
      <rect x={x + 0.6} y={y - w + 0.6} width={w - 1.2} height={w - 1.2} rx={1.6} fill={color} {...ink} strokeWidth={2} />
    </g>
  )
}

/** Where each unit starts (in x), for each way of measuring. */
function unitXs(how: string): number[] {
  switch (how) {
    case 'gaps':
      return [0, 1, 2, 3].map((i) => X0 + i * U * 1.42)
    case 'overlap':
      return [0, 1, 2, 3, 4, 5, 6].map((i) => X0 + i * U * 0.68)
    case 'late':
      return [0, 1, 2, 3, 4].map((i) => X0 + U * 0.8 + i * U)
    default:
      return [0, 1, 2, 3, 4].map((i) => X0 + i * U)
  }
}

function unitsDrawing(how: string, unit: 'clip' | 'cube') {
  return () => (
    <g>
      <rect x={4} y={4} width={92} height={92} rx={14} fill="#fffaf0" />
      {/* the start line, with its flag */}
      <path d={`M ${X0} 84 V 18`} stroke={START_GREEN} strokeWidth={3.2} strokeLinecap="round" />
      <path d={`M ${X0} 18 L ${X0 + 9} 21.5 L ${X0} 25 Z`} fill={START_GREEN} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
      <g transform={`translate(${X0} 38)`}>
        <LengthThingArt thing="pencil" len={U * 5} thick={11} unit={U} color="#ffcf4d" />
      </g>
      {unitXs(how).map((x, i) =>
        unit === 'clip' ? <Clip key={i} x={x} y={62 + (how === 'overlap' ? (i % 2 ? 3 : -3) : 0)} w={U} /> : <Cube key={i} x={x} y={72 + (how === 'overlap' ? (i % 2 ? 3.5 : 0) : 0)} w={U} color={UNIT_COLORS[i % UNIT_COLORS.length]} />,
      )}
      <rect x={4} y={4} width={92} height={92} rx={14} fill="none" {...ink} />
    </g>
  )
}

// ── Sky Summit: sound ────────────────────────────────────────────────────────

/** Curved shake lines either side of (x, y), `w` apart. */
function Shake({ x, y, w, h = 12 }: { x: number; y: number; w: number; h?: number }) {
  return (
    <g fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round">
      {[1, 2].map((k) => (
        <g key={k}>
          <path d={`M ${x - w / 2 - k * 5} ${y - h / 2 - k * 2} Q ${x - w / 2 - k * 5 - 4} ${y} ${x - w / 2 - k * 5} ${y + h / 2 + k * 2}`} />
          <path d={`M ${x + w / 2 + k * 5} ${y - h / 2 - k * 2} Q ${x + w / 2 + k * 5 + 4} ${y} ${x + w / 2 + k * 5} ${y + h / 2 + k * 2}`} />
        </g>
      ))}
    </g>
  )
}

/** A music note (♪) at (x, y), the head's centre. */
function Note({ x, y, s = 1, fill = '#b79af0' }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M 3 0 V -14 Q 9 -12 10 -7" fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
      <ellipse cx={0} cy={0} rx={4.2} ry={3.2} transform="rotate(-20)" fill={fill} stroke={INK} strokeWidth={2} />
    </g>
  )
}

/** A hand, palm down, its fingertips at (x, y), reaching from `dir` (1: from the right). */
function Hand({ x, y, dir = 1, r = 0 }: { x: number; y: number; dir?: 1 | -1; r?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${dir} 1)`}>
      <path d="M 30 6 L 12 4" stroke={INK} strokeWidth={10} strokeLinecap="round" />
      <path d="M 30 6 L 12 4" stroke={SKIN} strokeWidth={5.4} strokeLinecap="round" />
      <path d="M 0 0 Q -1 -6 6 -7 L 16 -6 Q 20 -2 18 4 L 14 9 L 4 8 Q -1 6 0 0 Z" fill={SKIN} {...ink} strokeWidth={2.2} />
      <path d="M 4 -6.5 L 3 4 M 8 -7 L 7.5 6 M 12 -6.5 L 12 7" stroke={INK} strokeWidth={1.2} opacity={0.5} />
    </g>
  )
}

/** A drumstick, its tip at (x, y), held up and to the right. */
function Stick({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M ${x} ${y} L ${x + 24} ${y - 24}`} stroke={INK} strokeWidth={6} strokeLinecap="round" />
      <path d={`M ${x} ${y} L ${x + 24} ${y - 24}`} stroke={WOOD} strokeWidth={3} strokeLinecap="round" />
      <circle cx={x} cy={y} r={4} fill="#f2766b" {...ink} strokeWidth={2} />
    </g>
  )
}

/** A spark where something is hit. */
function Bang({ x, y }: { x: number; y: number }) {
  return (
    <g stroke={INK} strokeWidth={2.2} strokeLinecap="round">
      {[-60, -20, 20, 60].map((a) => {
        const t = ((a - 90) * Math.PI) / 180
        return <line key={a} x1={x + Math.cos(t) * 5} y1={y + Math.sin(t) * 5} x2={x + Math.cos(t) * 10} y2={y + Math.sin(t) * 10} />
      })}
    </g>
  )
}

function Bell({ tilt = 0 }: { tilt?: number }) {
  return (
    <g transform={`rotate(${tilt} 50 30)`}>
      <path d="M 50 22 L 50 14" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <circle cx={50} cy={12} r={4} fill={GOLD} {...ink} strokeWidth={2.4} />
      <path d="M 30 70 Q 32 62 32 46 Q 32 24 50 24 Q 68 24 68 46 Q 68 62 70 70 Z" fill={GOLD} {...ink} />
      <rect x={26} y={68} width={48} height={7} rx={3.5} fill="#f2a65a" {...ink} strokeWidth={2.6} />
      <circle cx={50} cy={80} r={5} fill="#f2a65a" {...ink} strokeWidth={2.4} />
      <path d="M 38 36 Q 38 30 44 28" stroke="#ffffff" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.7} />
    </g>
  )
}

function Drum() {
  return (
    <g>
      <path d="M 22 46 L 22 76 Q 50 88 78 76 L 78 46" fill="#f2766b" {...ink} />
      <path d="M 22 50 L 34 78 M 46 54 L 34 78 M 46 54 L 60 80 M 72 52 L 60 80 M 72 52 L 78 70" fill="none" stroke="#ffffff" strokeWidth={2.4} strokeLinecap="round" />
      <ellipse cx={50} cy={46} rx={28} ry={9} fill="#fff3d6" {...ink} />
    </g>
  )
}

function Guitar({ strings = 'still' }: { strings?: 'still' | 'shake' }) {
  return (
    <g transform="rotate(-35 50 56)">
      {/* the neck and head */}
      <rect x={46} y={6} width={8} height={44} rx={2} fill={WOOD_DARK} {...ink} strokeWidth={2.6} />
      <rect x={43} y={2} width={14} height={9} rx={3} fill={WOOD_DARK} {...ink} strokeWidth={2.4} />
      {/* the body */}
      <path d="M 50 42 Q 34 40 34 54 Q 34 60 38 63 Q 28 68 30 80 Q 33 94 50 94 Q 67 94 70 80 Q 72 68 62 63 Q 66 60 66 54 Q 66 40 50 42 Z" fill="#f2a65a" {...ink} />
      <circle cx={50} cy={68} r={6} fill="#5b4033" {...ink} strokeWidth={2.2} />
      <rect x={43} y={82} width={14} height={4} rx={1.5} fill={WOOD_DARK} {...ink} strokeWidth={1.8} />
      {[-2.5, 0, 2.5].map((dx, i) =>
        strings === 'shake' ? (
          <path key={i} d={`M ${50 + dx} 10 Q ${50 + dx + (i % 2 ? 2.4 : -2.4)} 48 ${50 + dx} 84`} stroke="#ffffff" strokeWidth={1.3} fill="none" />
        ) : (
          <line key={i} x1={50 + dx} y1={10} x2={50 + dx} y2={84} stroke="#ffffff" strokeWidth={1.3} />
        ),
      )}
    </g>
  )
}

/** The plain card for the sound pictures (a soft tint, so a picture reads as one thing). */
function Card({ fill = '#f3f0ff', children }: { fill?: string; children: ReactNode }) {
  return (
    <g>
      <rect x={4} y={4} width={92} height={92} rx={14} fill={fill} />
      {children}
      <rect x={4} y={4} width={92} height={92} rx={14} fill="none" {...ink} />
    </g>
  )
}

const SOUND: Record<string, () => ReactNode> = {
  bellRing: () => (
    <Card>
      <Bell tilt={-12} />
      <Shake x={50} y={50} w={46} h={20} />
      <Note x={16} y={28} s={0.9} />
      <Note x={84} y={24} s={0.9} fill="#74d3bd" />
    </Card>
  ),
  bellStill: () => (
    <Card>
      <Bell />
    </Card>
  ),
  bellHit: () => (
    <Card>
      <Bell tilt={-8} />
      <Shake x={50} y={50} w={46} h={20} />
      <Stick x={70} y={58} />
      <Bang x={70} y={58} />
    </Card>
  ),
  bellHold: () => (
    <Card>
      <Bell />
      <Hand x={60} y={48} dir={1} r={-6} />
    </Card>
  ),
  drumRing: () => (
    <Card>
      <Drum />
      <path d="M 30 44 Q 40 40 50 44 Q 60 48 70 44" fill="none" stroke={INK} strokeWidth={2} />
      <Shake x={50} y={60} w={58} h={18} />
      <Note x={22} y={26} s={0.9} />
      <Note x={78} y={22} s={0.9} fill="#74d3bd" />
    </Card>
  ),
  drumStill: () => (
    <Card>
      <Drum />
    </Card>
  ),
  drumHit: () => (
    <Card>
      <Drum />
      <Shake x={50} y={60} w={58} h={18} />
      <Stick x={56} y={44} />
      <Bang x={56} y={42} />
    </Card>
  ),
  drumHold: () => (
    <Card>
      <Drum />
      <Hand x={40} y={40} dir={1} r={8} />
    </Card>
  ),
  guitarRing: () => (
    <Card>
      <Guitar strings="shake" />
      <Shake x={54} y={64} w={34} h={18} />
      <Note x={18} y={30} s={0.9} />
      <Note x={82} y={40} s={0.9} fill="#74d3bd" />
    </Card>
  ),
  guitarStill: () => (
    <Card>
      <Guitar />
    </Card>
  ),
  guitarPluck: () => (
    <Card>
      <Guitar strings="shake" />
      <Shake x={54} y={64} w={34} h={18} />
      <Hand x={60} y={66} dir={1} r={20} />
    </Card>
  ),
  guitarHold: () => (
    <Card>
      <Guitar />
      <Hand x={44} y={62} dir={1} r={-30} />
    </Card>
  ),
}

// ── Sky Summit: light ────────────────────────────────────────────────────────

function Teddy({ x, y, s = 1, fill = '#c7955f' }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx={-7} cy={-21} r={4} fill={fill} {...ink} strokeWidth={2} />
      <circle cx={7} cy={-21} r={4} fill={fill} {...ink} strokeWidth={2} />
      <ellipse cx={0} cy={2} rx={11} ry={12} fill={fill} {...ink} strokeWidth={2.4} />
      <circle cx={0} cy={-15} r={9} fill={fill} {...ink} strokeWidth={2.4} />
      <circle cx={-3} cy={-16} r={1.2} fill={INK} />
      <circle cx={3} cy={-16} r={1.2} fill={INK} />
      <ellipse cx={0} cy={-12} rx={3} ry={2.2} fill="#f1d9a6" stroke={INK} strokeWidth={1.2} />
    </g>
  )
}

function Room({ lit }: { lit: boolean }) {
  const wall = lit ? '#fff1d6' : '#20203a'
  const floor = lit ? '#e2b47c' : '#17172b'
  const toy = lit ? 1 : 0.16
  return (
    <g>
      <rect x={4} y={4} width={92} height={92} rx={14} fill={wall} />
      <path d="M 4 70 H 96 V 82 Q 96 96 82 96 H 18 Q 4 96 4 82 Z" fill={floor} />
      {/* a lamp, on or off */}
      {lit && <path d="M 72 30 L 52 70 H 96 V 30 Z" fill="#ffe594" opacity={0.6} />}
      <path d="M 70 70 V 34" stroke={INK} strokeWidth={2.6} />
      <path d="M 62 34 L 66 20 H 78 L 82 34 Z" fill={lit ? GOLD : '#3a3a55'} {...ink} strokeWidth={2.4} />
      <rect x={62} y={68} width={16} height={4} rx={2} fill={lit ? WOOD : '#2a2a40'} {...ink} strokeWidth={2} />
      {/* the toys */}
      <g opacity={toy}>
        <Teddy x={26} y={60} />
        <circle cx={46} cy={64} r={7} fill="#4aa6d6" {...ink} strokeWidth={2.2} />
        <path d="M 39 64 H 53 M 46 57 V 71" stroke="#ffffff" strokeWidth={1.8} />
      </g>
      <rect x={4} y={4} width={92} height={92} rx={14} fill="none" {...ink} />
    </g>
  )
}

function Tree({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 4} y={y - 24} width={8} height={24} rx={2} fill="#9a6a46" {...ink} strokeWidth={2.6} />
      <circle cx={x} cy={y - 34} r={15} fill="#6cc56b" {...ink} />
      <circle cx={x - 5} cy={y - 38} r={4} fill="#8edb7c" />
    </g>
  )
}

function Girl({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M ${x - 4} ${y} L ${x - 3} ${y - 12} M ${x + 4} ${y} L ${x + 3} ${y - 12}`} stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <path d={`M ${x - 9} ${y - 10} L ${x - 6} ${y - 30} H ${x + 6} L ${x + 9} ${y - 10} Z`} fill="#f7a1c4" {...ink} strokeWidth={2.4} />
      <circle cx={x} cy={y - 36} r={7} fill={SKIN} {...ink} strokeWidth={2.4} />
      <path d={`M ${x - 7} ${y - 37} Q ${x} ${y - 47} ${x + 7} ${y - 37} Q ${x + 9} ${y - 30} ${x + 8} ${y - 26} M ${x - 7} ${y - 37} Q ${x - 9} ${y - 30} ${x - 8} ${y - 26}`} fill="#7a5236" {...ink} strokeWidth={2} />
    </g>
  )
}

/** The thing in the sun and its shadow: away from the sun, toward it, or none. */
function shadowDrawing(thing: 'tree' | 'kid', sun: 'L' | 'R', how: 'away' | 'toward' | 'none') {
  return () => {
    const sx = sun === 'L' ? 24 : 76
    const away = sun === 'L' ? 1 : -1
    const dir = how === 'away' ? away : -away
    const baseY = 80
    const len = thing === 'tree' ? 40 : 32
    return (
      <Backdrop sky="#cfeaff" ground="#a9e08f" groundY={72}>
        <Sun x={sx} y={24} r={7} />
        {how !== 'none' && (
          <path
            d={`M ${50 - dir * 3} ${baseY + 1} Q ${50 + dir * len * 0.5} ${baseY + 9} ${50 + dir * len} ${baseY + 6} Q ${50 + dir * (len + 5)} ${baseY + 2} ${50 + dir * len} ${baseY - 2} Q ${50 + dir * len * 0.5} ${baseY - 5} ${50 - dir * 3} ${baseY - 3} Z`}
            fill="#38543a"
            opacity={0.85}
          />
        )}
        {thing === 'tree' ? <Tree x={50} y={baseY} /> : <Girl x={50} y={baseY} />}
      </Backdrop>
    )
  }
}

/** A flashlight on the left, shining at a sheet of `kind`, a star behind it. */
function materialDrawing(kind: 'glass' | 'waxPaper' | 'wood') {
  return () => {
    const through = kind === 'glass' ? 0.7 : kind === 'waxPaper' ? 0.28 : 0
    const star = kind === 'glass' ? 1 : kind === 'waxPaper' ? 0.4 : 0
    return (
      <g>
        <rect x={4} y={4} width={92} height={92} rx={14} fill="#2d2d4a" />
        {/* the beam, up to the sheet, then whatever gets through */}
        <path d="M 22 46 L 52 30 L 52 70 Z" fill="#ffe594" opacity={0.75} />
        {through > 0 && <path d="M 56 30 L 92 18 L 92 82 L 56 70 Z" fill="#ffe594" opacity={through} />}
        {/* the flashlight */}
        <g transform="rotate(0 16 50)">
          <rect x={6} y={44} width={14} height={12} rx={3} fill="#8ab8ff" {...ink} strokeWidth={2.4} />
          <path d="M 20 42 L 25 40 L 25 60 L 20 58 Z" fill="#cfd0dc" {...ink} strokeWidth={2.2} />
        </g>
        {/* the star behind the sheet */}
        {star > 0 && (
          <g opacity={star}>
            <Star x={78} y={50} r={11} fill={GOLD} />
          </g>
        )}
        {/* the sheet */}
        {kind === 'glass' && (
          <g>
            <rect x={50} y={22} width={8} height={56} rx={2} fill="#bfe6ff" opacity={0.55} {...ink} strokeWidth={2.4} />
            <path d="M 52.5 30 L 55 40 M 52.5 46 L 55 56" stroke="#ffffff" strokeWidth={1.6} strokeLinecap="round" />
          </g>
        )}
        {kind === 'waxPaper' && (
          <g>
            <rect x={50} y={22} width={8} height={56} rx={2} fill="#f6f1e4" opacity={0.85} {...ink} strokeWidth={2.4} />
            <path d="M 51 32 L 56 36 L 52 42 L 57 48 L 52 55 L 56 62 L 51 70" fill="none" stroke="#c9c2ad" strokeWidth={1.2} />
          </g>
        )}
        {kind === 'wood' && (
          <g>
            <rect x={49} y={22} width={10} height={56} rx={2} fill={WOOD} {...ink} strokeWidth={2.4} />
            <path d="M 52 26 Q 55 40 52 52 Q 50 62 53 74 M 56 28 Q 58 44 56 60" fill="none" stroke={WOOD_DARK} strokeWidth={1.4} />
          </g>
        )}
        <rect x={4} y={4} width={92} height={92} rx={14} fill="none" {...ink} />
      </g>
    )
  }
}

// ── Sky Summit: the sky ──────────────────────────────────────────────────────

function DaySky() {
  return (
    <Backdrop sky="#9fd8ff" ground="#8edb7c" groundY={76}>
      <Sun x={68} y={30} r={11} />
      <Cloud x={30} y={36} s={0.6} />
      <Tree x={24} y={84} />
    </Backdrop>
  )
}

function NightSky() {
  return (
    <Backdrop sky="#1f2752" ground="#2f5a3a" groundY={76}>
      <Moon x={66} y={30} r={11} />
      {[
        [20, 20, 5],
        [38, 36, 3.6],
        [84, 56, 4],
        [46, 15, 3.4],
        [30, 58, 3.4],
        [86, 16, 3.4],
      ].map(([x, y, r], i) => (
        <Star key={i} x={x} y={y} r={r} />
      ))}
      <g opacity={0.9}>
        <rect x={20} y={60} width={8} height={24} rx={2} fill="#3d3328" />
        <circle cx={24} cy={50} r={15} fill="#24452d" />
      </g>
    </Backdrop>
  )
}

/** The sun's path over the hills (a dashed arc), the sun at one place on it. */
function sunPath(place: 'sunRise' | 'sunHigh' | 'sunSet') {
  return () => {
    const sky = place === 'sunRise' ? '#ffe3c4' : place === 'sunHigh' ? '#9fd8ff' : '#ffb98a'
    const pos = place === 'sunRise' ? [24, 64] : place === 'sunHigh' ? [50, 24] : [76, 64]
    return (
      <Backdrop sky={sky} ground="#8edb7c" groundY={72}>
        <path d="M 12 72 Q 50 -6 88 72" fill="none" stroke={INK} strokeWidth={2} strokeDasharray="4 5" opacity={0.45} />
        <Sun x={pos[0]} y={pos[1]} r={9} />
        {place === 'sunRise' && <Arrow a={[40, 60]} b={[40, 36]} color="#f2766b" />}
        {place === 'sunSet' && <Arrow a={[60, 36]} b={[60, 60]} color="#4aa6d6" />}
        {/* the hills in front of a low sun */}
        <path d="M 4 74 Q 22 64 40 74 Q 60 66 96 74 L 96 82 Q 96 96 82 96 L 18 96 Q 4 96 4 82 Z" fill="#6fbb63" />
      </Backdrop>
    )
  }
}

/** A day-and-night bar: yellow for the daylight, dark blue for the night (`day` of 24 hours). */
function DayBar({ day }: { day: number }) {
  const x0 = 12
  const w = 76
  const dw = (day / 24) * w
  return (
    <g>
      <rect x={x0} y={82} width={w} height={9} rx={4.5} fill="#1f2752" />
      <rect x={x0} y={82} width={dw} height={9} rx={4.5} fill={GOLD} />
      <rect x={x0} y={82} width={w} height={9} rx={4.5} fill="none" stroke={INK} strokeWidth={2.2} />
    </g>
  )
}

function Summer() {
  return (
    <g>
      <rect x={4} y={4} width={92} height={92} rx={14} fill="#9fd8ff" />
      <path d="M 4 66 Q 50 60 96 66 L 96 82 Q 96 96 82 96 L 18 96 Q 4 96 4 82 Z" fill="#8edb7c" />
      <Sun x={70} y={22} r={10} />
      <Tree x={30} y={70} />
      {[
        [58, 70, '#f7a1c4'],
        [68, 72, '#ffd75e'],
        [78, 69, '#f2766b'],
      ].map(([x, y, c], i) => (
        <g key={i}>
          <path d={`M ${x} ${Number(y) + 6} V ${y}`} stroke={INK} strokeWidth={1.8} />
          <circle cx={Number(x)} cy={Number(y)} r={3.2} fill={String(c)} {...ink} strokeWidth={1.6} />
        </g>
      ))}
      <rect x={6} y={78} width={88} height={16} rx={6} fill="#fffaf0" opacity={0.9} />
      <DayBar day={15} />
      <rect x={4} y={4} width={92} height={92} rx={14} fill="none" {...ink} />
    </g>
  )
}

function Winter() {
  return (
    <g>
      <rect x={4} y={4} width={92} height={92} rx={14} fill="#d7e4f2" />
      <path d="M 4 66 Q 50 60 96 66 L 96 82 Q 96 96 82 96 L 18 96 Q 4 96 4 82 Z" fill="#ffffff" />
      <Sun x={78} y={50} r={8} rays={false} />
      {/* a bare tree */}
      <path d="M 30 70 V 40 M 30 52 L 20 42 M 30 46 L 40 36 M 30 58 L 40 52" stroke={INK} strokeWidth={5} strokeLinecap="round" />
      <path d="M 30 70 V 40 M 30 52 L 20 42 M 30 46 L 40 36 M 30 58 L 40 52" stroke="#9a6a46" strokeWidth={2.4} strokeLinecap="round" />
      {/* a snowman */}
      <circle cx={60} cy={63} r={7} fill="#ffffff" {...ink} strokeWidth={2.4} />
      <circle cx={60} cy={52} r={5} fill="#ffffff" {...ink} strokeWidth={2.4} />
      <path d="M 60 52.5 L 65 53.5" stroke="#f2a65a" strokeWidth={2} strokeLinecap="round" />
      <rect x={6} y={78} width={88} height={16} rx={6} fill="#fffaf0" opacity={0.9} />
      <DayBar day={9} />
      <rect x={4} y={4} width={92} height={92} rx={14} fill="none" {...ink} />
    </g>
  )
}

/** The moon's shape on the night sky: all round, half lit (its right half), or a thin curve. */
function moonShape(shape: 'moonFull' | 'moonHalf' | 'moonThin') {
  return () => (
    <Backdrop sky="#1f2752">
      {[
        [18, 18, 3.6],
        [84, 22, 3.2],
        [20, 80, 3.2],
        [82, 78, 3.8],
      ].map(([x, y, r], i) => (
        <Star key={i} x={x} y={y} r={r} />
      ))}
      {shape === 'moonThin' ? (
        <Moon x={50} y={50} r={26} />
      ) : (
        <g>
          {/* the moon's dark part, faint, so the half reads as half of a circle */}
          <circle cx={50} cy={50} r={26} fill="#39427a" stroke={INK} strokeWidth={2.6} />
          {shape === 'moonFull' ? <circle cx={50} cy={50} r={26} fill="#fff1a8" {...ink} strokeWidth={2.6} /> : <path d="M 50 24 A 26 26 0 0 1 50 76 Z" fill="#fff1a8" {...ink} strokeWidth={2.6} />}
        </g>
      )}
    </Backdrop>
  )
}

/** A pattern strip: four tiles (sun, moon, sun, ?), the last one dashed with a question mark. */
function skyPattern(first: 'sun' | 'moon') {
  return () => {
    const tiles = [first, first === 'sun' ? 'moon' : 'sun', first] as const
    return (
      <g>
        <rect x={4} y={4} width={92} height={92} rx={14} fill="#fffaf0" />
        {tiles.map((t, i) => {
          const x = 7 + i * 22.5
          const cx = x + 9.5
          return (
            <g key={i}>
              <rect x={x} y={30} width={19} height={40} rx={5} fill={t === 'sun' ? '#9fd8ff' : '#1f2752'} {...ink} strokeWidth={2.2} />
              {t === 'sun' ? (
                <g>
                  {/* a small sun: short rays round a disc */}
                  {Array.from({ length: 8 }, (_, k) => {
                    const a = (k / 8) * Math.PI * 2
                    return <line key={k} x1={cx + Math.cos(a) * 6.6} y1={50 + Math.sin(a) * 6.6} x2={cx + Math.cos(a) * 8.4} y2={50 + Math.sin(a) * 8.4} stroke={GOLD} strokeWidth={2} strokeLinecap="round" />
                  })}
                  <circle cx={cx} cy={50} r={5} fill="#ffd75e" stroke={INK} strokeWidth={1.8} />
                </g>
              ) : (
                <Moon x={cx} y={50} r={7} />
              )}
            </g>
          )
        })}
        <rect x={74.5} y={30} width={19} height={40} rx={5} fill="#ffffff" stroke={INK} strokeWidth={2.2} strokeDasharray="4 3" />
        <path d="M 80.5 45 Q 80.5 40.5 84 40.5 Q 87.5 40.5 87.5 44.5 Q 87.5 47 84.5 48.5 L 84 52" fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
        <circle cx={84} cy={57} r={1.7} fill={INK} />
        <rect x={4} y={4} width={92} height={92} rx={14} fill="none" {...ink} />
      </g>
    )
  }
}

// ── Sky Summit: animal families ──────────────────────────────────────────────

function Bird({ x, y, s = 1, fill = '#4aa6d6', beak = true }: { x: number; y: number; s?: number; fill?: string; beak?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={0} rx={13} ry={9} fill={fill} {...ink} strokeWidth={2.4} />
      <path d="M -4 -2 Q 2 -12 8 -2 Z" fill="#2f7fb0" {...ink} strokeWidth={1.8} />
      <circle cx={10} cy={-7} r={6} fill={fill} {...ink} strokeWidth={2.2} />
      <circle cx={12} cy={-8} r={1.2} fill={INK} />
      {beak && <path d="M 15 -7 L 21 -5 L 15 -4 Z" fill="#f2a65a" {...ink} strokeWidth={1.4} />}
      <path d="M -13 0 L -19 -4 L -18 3 Z" fill={fill} {...ink} strokeWidth={1.8} />
    </g>
  )
}

function Nest({ x, y, w = 40 }: { x: number; y: number; w?: number }) {
  return (
    <g>
      <path d={`M ${x - w / 2} ${y} Q ${x} ${y + 16} ${x + w / 2} ${y} Z`} fill={WOOD} {...ink} strokeWidth={2.6} />
      <path d={`M ${x - w / 2 + 4} ${y + 3} Q ${x} ${y + 9} ${x + w / 2 - 4} ${y + 3}`} fill="none" stroke={WOOD_DARK} strokeWidth={1.6} />
    </g>
  )
}

function BirdFeeds() {
  return (
    <Backdrop sky="#dff3ff">
      {/* a branch */}
      <path d="M 4 74 Q 50 66 96 72" stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" />
      <path d="M 4 74 Q 50 66 96 72" stroke="#9a6a46" strokeWidth={3.4} fill="none" strokeLinecap="round" />
      {/* the chicks, beaks open */}
      {[38, 50, 62].map((cx, i) => (
        <g key={i}>
          <circle cx={cx} cy={58} r={5.5} fill="#ffe594" {...ink} strokeWidth={2} />
          <path d={`M ${cx - 2.5} ${52} L ${cx} ${45} L ${cx + 2.5} ${52} Z`} fill="#f2a65a" {...ink} strokeWidth={1.4} />
        </g>
      ))}
      <Nest x={50} y={60} w={42} />
      {/* the parent, a worm in its beak */}
      <Bird x={44} y={30} s={1.1} />
      <path d="M 67 22 Q 70 28 66 32 Q 63 36 67 40" fill="none" stroke="#f7a1c4" strokeWidth={3.4} strokeLinecap="round" />
    </Backdrop>
  )
}

function HenWarms() {
  const hen = '#d9824a'
  return (
    <Backdrop sky="#fff1d6" ground="#e2b47c" groundY={78}>
      {/* straw, eggs peeking out under the hen */}
      <ellipse cx={48} cy={76} rx={36} ry={9} fill="#f6d27a" {...ink} strokeWidth={2.4} />
      {[22, 74].map((ex) => (
        <ellipse key={ex} cx={ex} cy={70} rx={5.5} ry={7} fill="#ffffff" {...ink} strokeWidth={2} />
      ))}
      {/* the tail, the body, a wing */}
      <path d="M 26 58 Q 14 44 20 34 Q 26 42 30 46 Q 26 34 34 30 Q 36 42 38 48 Z" fill={hen} {...ink} strokeWidth={2.4} />
      <ellipse cx={48} cy={60} rx={26} ry={16} fill={hen} {...ink} />
      <path d="M 36 58 Q 46 50 58 58 Q 48 66 36 58 Z" fill="#f2a65a" {...ink} strokeWidth={1.8} />
      {/* the neck and head: a red comb, an orange beak, a red wattle */}
      <path d="M 62 52 Q 64 40 70 36 L 76 44 Q 74 52 70 56 Z" fill={hen} {...ink} strokeWidth={2.2} />
      <path d="M 66 30 Q 66 24 70 26 Q 72 21 75 25 Q 78 22 79 28 Z" fill="#f2766b" {...ink} strokeWidth={1.6} />
      <circle cx={72} cy={36} r={8} fill={hen} {...ink} strokeWidth={2.4} />
      <path d="M 79 34 L 86 37 L 79 39 Z" fill="#ffcf4d" {...ink} strokeWidth={1.4} />
      <path d="M 78 40 Q 80 46 77 47 Q 75 45 76 40 Z" fill="#f2766b" {...ink} strokeWidth={1.2} />
      <circle cx={74} cy={34} r={1.5} fill={INK} />
    </Backdrop>
  )
}

function Monkey({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M -14 4 Q -26 0 -24 -14" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <path d="M -14 4 Q -26 0 -24 -14" fill="none" stroke="#9a6a46" strokeWidth={2} strokeLinecap="round" />
      <ellipse cx={0} cy={0} rx={15} ry={10} fill="#9a6a46" {...ink} strokeWidth={2.4} />
      <path d="M -10 8 V 18 M -4 8 V 18 M 6 8 V 18 M 12 6 V 18" stroke={INK} strokeWidth={4.4} strokeLinecap="round" />
      <path d="M -10 8 V 18 M -4 8 V 18 M 6 8 V 18 M 12 6 V 18" stroke="#9a6a46" strokeWidth={2} strokeLinecap="round" />
      <circle cx={16} cy={-8} r={9} fill="#9a6a46" {...ink} strokeWidth={2.4} />
      <ellipse cx={19} cy={-6} rx={6} ry={5} fill="#f1d9a6" stroke={INK} strokeWidth={1.4} />
      <circle cx={18} cy={-10} r={1.3} fill={INK} />
      <circle cx={22} cy={-10} r={1.3} fill={INK} />
      <circle cx={9} cy={-12} r={3} fill="#f1d9a6" {...ink} strokeWidth={1.6} />
    </g>
  )
}

function MonkeyCarries() {
  return (
    <Backdrop sky="#e3f6dc" ground="#a9e08f" groundY={80}>
      <Monkey x={46} y={60} s={1.5} />
      {/* the baby, on her back */}
      <Monkey x={44} y={38} s={0.75} />
    </Backdrop>
  )
}

// ── the set ──────────────────────────────────────────────────────────────────

const units: Record<string, () => ReactNode> = {}
for (const how of ['right', 'gaps', 'overlap', 'late']) for (const unit of ['clip', 'cube'] as const) units[`g1units-${how}-${unit}`] = unitsDrawing(how, unit)

const shadows: Record<string, () => ReactNode> = {}
for (const thing of ['tree', 'kid'] as const) for (const sun of ['L', 'R'] as const) for (const how of ['away', 'toward', 'none'] as const) shadows[`shadow-${thing}-${sun}-${how}`] = shadowDrawing(thing, sun, how)

/** The 1st-grade drawings, by name (spread into the kit's DRAWINGS). */
export const G1_DRAWINGS: Record<string, () => ReactNode> = {
  ...units,
  ...SOUND,
  roomDark: () => <Room lit={false} />,
  roomLit: () => <Room lit />,
  ...shadows,
  glass: materialDrawing('glass'),
  waxPaper: materialDrawing('waxPaper'),
  wood: materialDrawing('wood'),
  daySky: () => <DaySky />,
  nightSky: () => <NightSky />,
  sunRise: sunPath('sunRise'),
  sunHigh: sunPath('sunHigh'),
  sunSet: sunPath('sunSet'),
  summer: () => <Summer />,
  winter: () => <Winter />,
  moonFull: moonShape('moonFull'),
  moonHalf: moonShape('moonHalf'),
  moonThin: moonShape('moonThin'),
  patternSunMoon: skyPattern('sun'),
  patternMoonSun: skyPattern('moon'),
  birdFeeds: () => <BirdFeeds />,
  henWarms: () => <HenWarms />,
  monkeyCarries: () => <MonkeyCarries />,
}
