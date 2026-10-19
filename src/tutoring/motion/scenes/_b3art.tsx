/* eslint-disable react-refresh/only-export-components -- helper module of SVG shapes for scene files, not an HMR boundary */
import type { ReactNode } from 'react'
import { mixColor } from '../anim'
import { M } from '../palette'

/**
 * Builder-3 cartoon cast and props (flat vector, warm-ink outlines, one soft
 * highlight each): crayons, a frog, a dog, bugs, the sun, clouds, drops, plants,
 * jars, pots and books. Each takes its pose/animation as plain numbers, so the
 * scene stays a pure function of t.
 */

const INK = M.ink
const SW = 4
export const shade = (c: string, k = 0.25) => mixColor(c, '#3d2b35', k)
export const tint = (c: string, k = 0.45) => mixColor(c, '#ffffff', k)

// ── crayons ──────────────────────────────────────────────────────────────────
/** An upright crayon standing on (x, y) (bottom centre). */
export function Crayon({ x, y, w = 22, h = 70, color, rot = 0 }: { x: number; y: number; w?: number; h?: number; color: string; rot?: number }) {
  const dark = shade(color, 0.3)
  const bodyH = h * 0.74
  const top = y - bodyH
  const tipTop = y - h
  const sw = Math.max(2, w * 0.11)
  return (
    <g transform={rot ? `rotate(${rot} ${x} ${y - h / 2})` : undefined}>
      <path d={`M ${x - w / 2 + 1} ${top + 1} L ${x - w * 0.2} ${tipTop + w * 0.22} Q ${x} ${tipTop - w * 0.08} ${x + w * 0.2} ${tipTop + w * 0.22} L ${x + w / 2 - 1} ${top + 1} Z`} fill={dark} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
      <rect x={x - w / 2} y={top} width={w} height={bodyH} rx={w * 0.16} fill={color} />
      <rect x={x - w / 2} y={top + bodyH * 0.12} width={w} height={bodyH * 0.09} fill={dark} />
      <rect x={x - w / 2} y={y - bodyH * 0.22} width={w} height={bodyH * 0.09} fill={dark} />
      <rect x={x - w / 2 + w * 0.2} y={top + bodyH * 0.28} width={w * 0.17} height={bodyH * 0.36} rx={w * 0.08} fill="#fff" opacity={0.5} />
      <rect x={x - w / 2} y={top} width={w} height={bodyH} rx={w * 0.16} fill="none" stroke={INK} strokeWidth={sw} />
    </g>
  )
}

/** Crayon colours, in box order. */
export const CRAYONS = ['#f2766b', '#ffcf4d', '#6cc56b', '#8ab8ff', '#cdb8f5', '#f7a1c4', '#ff9f80', '#6cc7ea']

/**
 * An open crayon box (front view) standing on (x, y). `children` (the crayons)
 * draw between the back and the arched front panel.
 */
export function CrayonBox({ x, y, w, h, children, label = true }: { x: number; y: number; w: number; h: number; children?: ReactNode; label?: boolean }) {
  const l = x - w / 2
  const r = x + w / 2
  const frontTop = y - h * 0.5
  const dip = y - h * 0.36
  return (
    <>
      <rect x={l + 8} y={y - h} width={w - 16} height={h} rx={10} fill={shade(M.gold, 0.35)} stroke={INK} strokeWidth={SW} />
      {children}
      <path d={`M ${l} ${frontTop} Q ${x} ${dip + (dip - frontTop) * 0.6} ${r} ${frontTop} L ${r} ${y - 8} Q ${r} ${y} ${r - 8} ${y} L ${l + 8} ${y} Q ${l} ${y} ${l} ${y - 8} Z`} fill={M.gold} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      {label && (
        <>
          <rect x={l + 18} y={y - h * 0.27} width={w - 36} height={h * 0.17} rx={h * 0.085} fill={M.leaf} stroke={INK} strokeWidth={3} />
          <text x={x} y={y - h * 0.185} fontFamily={M.font} fontWeight={700} fontSize={h * 0.11} textAnchor="middle" dominantBaseline="central" fill={M.white} letterSpacing={2}>
            CRAYONS
          </text>
        </>
      )}
      <path d={`M ${l + 14} ${frontTop + 14} Q ${l + 14} ${y - 20} ${l + 22} ${y - 14}`} fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.55} />
    </>
  )
}

// ── frog ─────────────────────────────────────────────────────────────────────
/**
 * A friendly frog sitting at (x, y) (centre of its body), `s` = scale.
 * `blink` 0..1 closes the eyes; `look` shifts the pupils (-1..1); `crouch`
 * squashes it before a hop; `legs` 0..1 stretches the back legs out (mid-jump).
 */
export function Frog({ x, y, s = 1, blink = 0, look = 0, crouch = 0, legs = 0, glowLegs = 0 }: { x: number; y: number; s?: number; blink?: number; look?: number; crouch?: number; legs?: number; glowLegs?: number }) {
  const G = '#6cc56b'
  const GD = '#4fa65a'
  const BELLY = '#d5f5b4'
  const sy = 1 - crouch * 0.18
  const sx = 1 + crouch * 0.12
  const eye = (ex: number) => (
    <>
      <circle cx={ex} cy={-52} r={25} fill={G} stroke={INK} strokeWidth={SW} />
      <ellipse cx={ex} cy={-54} rx={17} ry={17 * (1 - blink * 0.92)} fill="#fff" stroke={INK} strokeWidth={2.5} />
      {blink < 0.6 && (
        <>
          <circle cx={ex + look * 6} cy={-53} r={8.5} fill={INK} />
          <circle cx={ex + look * 6 + 3} cy={-57} r={3} fill="#fff" />
        </>
      )}
    </>
  )
  // back legs: folded (legs=0) → stretched out behind/below (legs=1)
  const leg = (side: -1 | 1) => {
    const hx = side * 52
    const fx = side * (64 + legs * 30)
    const fy = 52 + legs * 46
    return (
      <>
        {glowLegs > 0 && <ellipse cx={hx} cy={30 + legs * 20} rx={46} ry={40 + legs * 18} fill={M.gold} opacity={0.45 * glowLegs} />}
        <path d={`M ${hx - side * 10} 14 Q ${hx + side * 38} ${10 + legs * 10} ${fx} ${fy - 8}`} fill="none" stroke={INK} strokeWidth={30} strokeLinecap="round" />
        <path d={`M ${hx - side * 10} 14 Q ${hx + side * 38} ${10 + legs * 10} ${fx} ${fy - 8}`} fill="none" stroke={GD} strokeWidth={22} strokeLinecap="round" />
        <ellipse cx={fx + side * 6} cy={fy} rx={20} ry={9} fill={GD} stroke={INK} strokeWidth={3} />
      </>
    )
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${s * sx} ${s * sy}) translate(0 ${crouch * 14})`}>
      {leg(-1)}
      {leg(1)}
      {/* body + head as one outlined blob */}
      <ellipse cx={0} cy={18} rx={66} ry={50} fill={G} stroke={INK} strokeWidth={SW * 2} />
      <ellipse cx={0} cy={-16} rx={70} ry={42} fill={G} stroke={INK} strokeWidth={SW * 2} />
      <ellipse cx={0} cy={18} rx={66} ry={50} fill={G} />
      <ellipse cx={0} cy={-16} rx={70} ry={42} fill={G} />
      <ellipse cx={0} cy={34} rx={40} ry={30} fill={BELLY} />
      {eye(-38)}
      {eye(38)}
      <path d="M -36 -8 Q 0 20 36 -8" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <ellipse cx={-50} cy={2} rx={10} ry={6} fill={M.pink} opacity={0.75} />
      <ellipse cx={50} cy={2} rx={10} ry={6} fill={M.pink} opacity={0.75} />
      <ellipse cx={-24} cy={-26} rx={14} ry={6} fill="#fff" opacity={0.35} transform="rotate(-18 -24 -26)" />
      {/* front feet */}
      <ellipse cx={-26} cy={66} rx={16} ry={8} fill={GD} stroke={INK} strokeWidth={3} />
      <ellipse cx={26} cy={66} rx={16} ry={8} fill={GD} stroke={INK} strokeWidth={3} />
    </g>
  )
}

// ── dog ──────────────────────────────────────────────────────────────────────
/** A side-view puppy facing right at (x, y) (body centre); `run` = gait phase (radians), `speed` 0..1 sets the stride. */
export function Dog({ x, y, s = 1, run = 0, speed = 0, tongue = 0, wag = 0, big = 0 }: { x: number; y: number; s?: number; run?: number; speed?: number; tongue?: number; wag?: number; big?: number }) {
  const C = '#eab676'
  const CD = '#b97b45'
  const amp = 0.62 * speed
  const leg = (hx: number, phase: number, back = false) => {
    const a = Math.sin(run + phase) * amp
    const len = 40
    const ex = hx + Math.sin(a) * len
    const ey = 22 + Math.cos(a) * len
    return (
      <>
        <path d={`M ${hx} 14 L ${ex} ${ey}`} stroke={INK} strokeWidth={21} strokeLinecap="round" />
        <path d={`M ${hx} 14 L ${ex} ${ey}`} stroke={back ? shade(C, 0.1) : C} strokeWidth={13} strokeLinecap="round" />
      </>
    )
  }
  const bob = Math.abs(Math.sin(run)) * 5 * speed
  const tail = `M -58 -6 Q ${-84} ${-26 + Math.sin(wag) * 6} ${-82 + Math.sin(wag) * 10} ${-50}`
  const bs = 1 + big * 0.18
  return (
    <g transform={`translate(${x} ${y - bob}) scale(${s})`}>
      <path d={tail} fill="none" stroke={INK} strokeWidth={18} strokeLinecap="round" />
      <path d={tail} fill="none" stroke={C} strokeWidth={10} strokeLinecap="round" />
      {leg(-36, Math.PI, true)}
      {leg(34, 0, true)}
      <ellipse cx={0} cy={0} rx={64} ry={32} fill={C} stroke={INK} strokeWidth={SW} />
      <ellipse cx={-14} cy={-12} rx={22} ry={14} fill={CD} opacity={0.75} />
      <path d="M -44 -14 Q -20 -28 10 -24" fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.4} />
      {leg(-46, 0)}
      {leg(44, Math.PI)}
      <g transform={`translate(62 -30) scale(${bs}) translate(-62 30)`}>
        <rect x={34} y={-12} width={22} height={12} rx={5} fill={M.coral} stroke={INK} strokeWidth={3} transform="rotate(-62 45 -6)" />
        <circle cx={64} cy={-34} r={34} fill={C} stroke={INK} strokeWidth={SW} />
        <ellipse cx={92} cy={-22} rx={24} ry={17} fill={tint(C, 0.4)} stroke={INK} strokeWidth={SW} />
        <ellipse cx={112} cy={-30} rx={8} ry={7} fill={INK} />
        <circle cx={74} cy={-44} r={5.5} fill={INK} />
        <circle cx={76} cy={-46} r={2} fill="#fff" />
        {tongue > 0 && <path d={`M 92 -8 Q 96 ${-8 + 18 * tongue} 104 ${-6 + 14 * tongue} Q 106 -8 102 -10 Z`} fill={M.pink} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />}
        <path d="M 46 -64 Q 30 -60 34 -26 Q 44 -24 54 -40 Z" fill={CD} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      </g>
    </g>
  )
}

// ── fox (the reader / thinker) ───────────────────────────────────────────────
/** A fox friend's head centred on (x, y); `look` = [dx, dy] pupil shift (-1..1), `tilt` in degrees. */
export function Fox({ x, y, s = 1, look = [0, 0], tilt = 0, blink = 0, smile = 1 }: { x: number; y: number; s?: number; look?: [number, number]; tilt?: number; blink?: number; smile?: number }) {
  const O = '#f59a4a'
  const eye = (ex: number) => (
    <>
      <ellipse cx={ex} cy={-6} rx={11} ry={13 * (1 - 0.9 * blink)} fill="#fff" stroke={INK} strokeWidth={3} />
      {blink < 0.6 && <circle cx={ex + look[0] * 4} cy={-5 + look[1] * 5} r={6} fill={INK} />}
      {blink < 0.6 && <circle cx={ex + look[0] * 4 + 2} cy={-8 + look[1] * 5} r={2} fill="#fff" />}
    </>
  )
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${s})`}>
      <path d="M -56 -22 L -64 -86 L -18 -50 Z" fill={O} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M 56 -22 L 64 -86 L 18 -50 Z" fill={O} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M -52 -36 L -57 -72 L -32 -50 Z" fill={INK} opacity={0.75} />
      <path d="M 52 -36 L 57 -72 L 32 -50 Z" fill={INK} opacity={0.75} />
      <path d="M -66 -6 Q -64 -58 0 -60 Q 64 -58 66 -6 Q 60 40 0 52 Q -60 40 -66 -6 Z" fill={O} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M -60 4 Q -30 0 0 22 Q 30 0 60 4 Q 50 42 0 52 Q -50 42 -60 4 Z" fill="#fff8ec" />
      <path d="M -36 -48 Q -10 -56 10 -50" fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.45} />
      {eye(-24)}
      {eye(24)}
      <ellipse cx={0} cy={18} rx={9} ry={7} fill={INK} />
      <path d={`M -12 30 Q 0 ${30 + 8 * smile} 12 30`} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <ellipse cx={-42} cy={14} rx={9} ry={6} fill={M.coral} opacity={0.55} />
      <ellipse cx={42} cy={14} rx={9} ry={6} fill={M.coral} opacity={0.55} />
    </g>
  )
}

// ── small critters & nature ──────────────────────────────────────────────────
/** A little buzzing fly; `flap` = wing phase (radians). */
export function Bug({ x, y, s = 1, flap = 0 }: { x: number; y: number; s?: number; flap?: number }) {
  const wy = 0.55 + 0.45 * Math.abs(Math.sin(flap))
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={-6} cy={-12} rx={10} ry={14 * wy} fill="#eaf6ff" stroke={INK} strokeWidth={2.5} opacity={0.95} transform="rotate(-25 -6 -12)" />
      <ellipse cx={8} cy={-12} rx={10} ry={14 * wy} fill="#eaf6ff" stroke={INK} strokeWidth={2.5} opacity={0.95} transform="rotate(25 8 -12)" />
      <ellipse cx={0} cy={0} rx={16} ry={11} fill="#7b6a8f" stroke={INK} strokeWidth={3} />
      <circle cx={13} cy={-2} r={8} fill="#5d4f70" stroke={INK} strokeWidth={3} />
      <circle cx={16} cy={-4} r={2.5} fill="#fff" />
    </g>
  )
}

/** A pond with a lily pad, centred on (x, y). */
export function Pond({ x, y, w = 220, h = 60 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <>
      <ellipse cx={x} cy={y} rx={w / 2} ry={h / 2} fill={M.sea} stroke={INK} strokeWidth={SW} />
      <ellipse cx={x - w * 0.12} cy={y - h * 0.1} rx={w * 0.22} ry={h * 0.14} fill="#fff" opacity={0.3} />
      <path d={`M ${x + w * 0.22} ${y + 2} m -26 0 a 26 12 0 1 0 52 0 a 26 12 0 1 0 -52 0`} fill={M.leaf} stroke={INK} strokeWidth={3} />
      <path d={`M ${x + w * 0.22} ${y + 2} L ${x + w * 0.22 + 22} ${y - 6}`} stroke={INK} strokeWidth={3} />
    </>
  )
}

/** A smiling sun with slowly turning rays. */
export function Sun({ x, y, r = 46, spin = 0, glow = 0 }: { x: number; y: number; r?: number; spin?: number; glow?: number }) {
  return (
    <>
      {glow > 0 && <circle cx={x} cy={y} r={r * (1.5 + glow * 0.5)} fill={M.gold} opacity={0.22 * glow} />}
      <g transform={`rotate(${spin} ${x} ${y})`}>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2
          const r0 = r * 1.22
          const r1 = r * (i % 2 ? 1.5 : 1.65)
          return <line key={i} x1={x + Math.cos(a) * r0} y1={y + Math.sin(a) * r0} x2={x + Math.cos(a) * r1} y2={y + Math.sin(a) * r1} stroke={M.gold} strokeWidth={8} strokeLinecap="round" />
        })}
      </g>
      <circle cx={x} cy={y} r={r} fill={M.gold} stroke={INK} strokeWidth={SW} />
      <circle cx={x - r * 0.3} cy={y - r * 0.12} r={r * 0.08} fill={INK} />
      <circle cx={x + r * 0.3} cy={y - r * 0.12} r={r * 0.08} fill={INK} />
      <path d={`M ${x - r * 0.3} ${y + r * 0.2} Q ${x} ${y + r * 0.45} ${x + r * 0.3} ${y + r * 0.2}`} fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
      <ellipse cx={x - r * 0.52} cy={y + r * 0.18} rx={r * 0.12} ry={r * 0.08} fill={M.coral} opacity={0.6} />
      <ellipse cx={x + r * 0.52} cy={y + r * 0.18} rx={r * 0.12} ry={r * 0.08} fill={M.coral} opacity={0.6} />
    </>
  )
}

/** A fluffy cloud (union of circles, outlined) centred on (x, y), `w` wide. */
export function Cloud({ x, y, w = 180, color = M.white, face = false }: { x: number; y: number; w?: number; color?: string; face?: boolean }) {
  const u = w / 180
  const c: [number, number, number][] = [
    [-52, 8, 32],
    [-18, -14, 42],
    [26, -20, 46],
    [60, 6, 32],
    [6, 16, 36],
  ]
  return (
    <g transform={`translate(${x} ${y}) scale(${u})`}>
      {c.map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={color} stroke={INK} strokeWidth={8} />
      ))}
      {c.map(([cx, cy, r], i) => (
        <circle key={`f${i}`} cx={cx} cy={cy} r={r} fill={color} />
      ))}
      <ellipse cx={-14} cy={-26} rx={22} ry={9} fill="#fff" opacity={0.5} />
      {face && (
        <>
          <circle cx={-14} cy={4} r={4.5} fill={INK} />
          <circle cx={22} cy={4} r={4.5} fill={INK} />
          <path d="M -4 14 Q 4 22 12 14" fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
        </>
      )}
    </g>
  )
}

/** A raindrop (point up) with its round bottom at (x, y). */
export function Drop({ x, y, r = 10, color = M.sea, opacity }: { x: number; y: number; r?: number; color?: string; opacity?: number }) {
  return (
    <g opacity={opacity}>
      <path d={`M ${x} ${y - r * 2.6} C ${x + r * 0.35} ${y - r * 1.6} ${x + r} ${y - r * 1.1} ${x + r} ${y - r} A ${r} ${r} 0 1 1 ${x - r} ${y - r} C ${x - r} ${y - r * 1.1} ${x - r * 0.35} ${y - r * 1.6} ${x} ${y - r * 2.6} Z`} transform={`translate(0 ${r})`} fill={color} stroke={INK} strokeWidth={Math.max(2, r * 0.28)} strokeLinejoin="round" />
      <ellipse cx={x - r * 0.35} cy={y - r * 0.15} rx={r * 0.18} ry={r * 0.32} fill="#fff" opacity={0.6} />
    </g>
  )
}

/** A leaf shape from (x, y) pointing along `ang` degrees, `len` long. */
export function Leaf({ x, y, len = 60, ang = 0, color = M.leaf, glow = 0 }: { x: number; y: number; len?: number; ang?: number; color?: string; glow?: number }) {
  const w = len * 0.42
  return (
    <g transform={`translate(${x} ${y}) rotate(${ang})`}>
      {glow > 0 && <path d={`M 0 0 Q ${len * 0.5} ${-w - 10} ${len + 10} 0 Q ${len * 0.5} ${w + 10} 0 0 Z`} fill={M.gold} opacity={0.5 * glow} />}
      <path d={`M 0 0 Q ${len * 0.5} ${-w} ${len} 0 Q ${len * 0.5} ${w} 0 0 Z`} fill={color} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
      <path d={`M 4 0 Q ${len * 0.5} -2 ${len - 8} 0`} fill="none" stroke={shade(color, 0.3)} strokeWidth={2.5} strokeLinecap="round" />
    </g>
  )
}

// ── containers ───────────────────────────────────────────────────────────────
/** Outline path of a straight glass jar with a lip, bottom-centre (x, y). */
export function jarPath(x: number, y: number, w: number, h: number): string {
  const l = x - w / 2
  const r = x + w / 2
  const top = y - h
  return `M ${l - 6} ${top} L ${r + 6} ${top} L ${r + 6} ${top + 14} L ${r} ${top + 18} L ${r} ${y - 22} Q ${r} ${y} ${r - 22} ${y} L ${l + 22} ${y} Q ${l} ${y} ${l} ${y - 22} L ${l} ${top + 18} L ${l - 6} ${top + 14} Z`
}

/** Glass jar: back (tinted glass), `children` inside, then the front outline + shine. */
export function Jar({ x, y, w, h, children, tintColor = M.sky }: { x: number; y: number; w: number; h: number; children?: ReactNode; tintColor?: string }) {
  const d = jarPath(x, y, w, h)
  return (
    <>
      <path d={d} fill={tintColor} opacity={0.35} />
      {children}
      <path d={d} fill="none" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <path d={`M ${x - w / 2 + 14} ${y - h + 34} L ${x - w / 2 + 14} ${y - 40}`} stroke="#fff" strokeWidth={7} strokeLinecap="round" opacity={0.7} />
    </>
  )
}

/** A cooking pot (front view) whose rim is at y-h, bottom-centre (x, y). */
export function Pot({ x, y, w, h, water = M.sea, level = 0.7, bubbles = 0, t = 0 }: { x: number; y: number; w: number; h: number; water?: string; level?: number; bubbles?: number; t?: number }) {
  const l = x - w / 2
  const r = x + w / 2
  const top = y - h
  const wy = top + h * (1 - level)
  return (
    <>
      <rect x={l - 24} y={top + 16} width={30} height={14} rx={7} fill={M.inkSoft} stroke={INK} strokeWidth={3} />
      <rect x={r - 6} y={top + 16} width={30} height={14} rx={7} fill={M.inkSoft} stroke={INK} strokeWidth={3} />
      <path d={`M ${l} ${top} L ${r} ${top} L ${r - 6} ${y - 14} Q ${r - 8} ${y} ${r - 22} ${y} L ${l + 22} ${y} Q ${l + 8} ${y} ${l + 6} ${y - 14} Z`} fill="#c9d3e0" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <ellipse cx={x} cy={top} rx={w / 2} ry={12} fill={shade('#c9d3e0', 0.35)} stroke={INK} strokeWidth={SW} />
      {level > 0 && <ellipse cx={x} cy={Math.max(top + 2, wy - h * 0.0)} rx={w / 2 - 8} ry={8} fill={water} opacity={0.95} />}
      {bubbles > 0 &&
        Array.from({ length: 5 }, (_, i) => {
          const ph = (t * 1.6 + i * 0.37) % 1
          return <circle key={i} cx={x - w * 0.32 + i * w * 0.16} cy={top - 2 - ph * 10} r={(4 + (i % 2) * 3) * bubbles * (1 - ph)} fill="#fff" stroke={INK} strokeWidth={2} opacity={1 - ph} />
        })}
      <path d={`M ${l + 18} ${top + 22} L ${l + 22} ${y - 18}`} stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.6} />
    </>
  )
}

/** A flickering gas flame centred at (x, y) (its base). */
export function Flame({ x, y, s = 1, t = 0 }: { x: number; y: number; s?: number; t?: number }) {
  const f = 1 + 0.12 * Math.sin(t * 17) + 0.07 * Math.sin(t * 29)
  return (
    <g transform={`translate(${x} ${y}) scale(${s} ${s * f})`}>
      <path d="M 0 -46 C 16 -26 24 -14 22 0 Q 0 10 -22 0 C -24 -14 -10 -22 0 -46 Z" fill={M.coral} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
      <path d="M 0 -26 C 8 -16 12 -8 10 0 Q 0 4 -10 0 C -12 -8 -6 -14 0 -26 Z" fill={M.gold} />
    </g>
  )
}

// ── books, cards & tools ─────────────────────────────────────────────────────
/** An open storybook; (x, y) = top of the spine, `w` = full spread width. */
export function Book({ x, y, w, h, cover = M.sea }: { x: number; y: number; w: number; h: number; cover?: string }) {
  const l = x - w / 2
  const r = x + w / 2
  const PAGE = '#fffdf7'
  return (
    <>
      <path d={`M ${l - 14} ${y + 2} Q ${x - w / 4} ${y - 14} ${x} ${y + 4} Q ${x + w / 4} ${y - 14} ${r + 14} ${y + 2} L ${r + 14} ${y + h + 18} Q ${x + w / 4} ${y + h + 4} ${x} ${y + h + 22} Q ${x - w / 4} ${y + h + 4} ${l - 14} ${y + h + 18} Z`} fill={cover} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      {[8, 4].map((o) => (
        <path key={o} d={`M ${l - 4 + o / 2} ${y + h + o} Q ${x - w / 4} ${y + h - 8 + o} ${x} ${y + h + 10 + o / 2} Q ${x + w / 4} ${y + h - 8 + o} ${r + 4 - o / 2} ${y + h + o}`} fill={PAGE} stroke={INK} strokeWidth={2.5} />
      ))}
      <path d={`M ${l} ${y + 4} Q ${x - w / 4} ${y - 10} ${x} ${y + 8} L ${x} ${y + h + 10} Q ${x - w / 4} ${y + h - 8} ${l} ${y + h} Z`} fill={PAGE} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <path d={`M ${r} ${y + 4} Q ${x + w / 4} ${y - 10} ${x} ${y + 8} L ${x} ${y + h + 10} Q ${x + w / 4} ${y + h - 8} ${r} ${y + h} Z`} fill={PAGE} stroke={INK} strokeWidth={SW} strokeLinejoin="round" />
      <path d={`M ${x - 18} ${y + 10} L ${x - 18} ${y + h + 4}`} stroke={INK} strokeWidth={10} opacity={0.05} />
      <path d={`M ${x + 18} ${y + 10} L ${x + 18} ${y + h + 4}`} stroke={INK} strokeWidth={10} opacity={0.05} />
    </>
  )
}

/** A ruled index card, top-left (x, y), with a strip of tape. */
export function IndexCard({ x, y, w, h, lines = 3, rot = 0, tape = true }: { x: number; y: number; w: number; h: number; lines?: number; rot?: number; tape?: boolean }) {
  const cx = x + w / 2
  return (
    <g transform={rot ? `rotate(${rot} ${cx} ${y + h / 2})` : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={14} fill={M.white} stroke={INK} strokeWidth={SW} filter="url(#sq-shadow)" />
      <line x1={x + 4} y1={y + 46} x2={x + w - 4} y2={y + 46} stroke={M.coral} strokeWidth={2.5} opacity={0.7} />
      {Array.from({ length: lines }, (_, i) => (
        <line key={i} x1={x + 4} y1={y + 46 + ((h - 46) / (lines + 0.4)) * (i + 1)} x2={x + w - 4} y2={y + 46 + ((h - 46) / (lines + 0.4)) * (i + 1)} stroke={M.sea} strokeWidth={2} opacity={0.35} />
      ))}
      {tape && <rect x={cx - 46} y={y - 16} width={92} height={30} rx={3} fill={M.gold} opacity={0.55} transform={`rotate(-3 ${cx} ${y})`} />}
    </g>
  )
}

/** A magnifying glass with its lens centred on (x, y). */
export function Magnifier({ x, y, r = 46, rot = 40 }: { x: number; y: number; r?: number; rot?: number }) {
  return (
    <g transform={`rotate(${rot} ${x} ${y})`}>
      <rect x={x - 11} y={y + r - 2} width={22} height={r * 1.25} rx={10} fill={M.coral} stroke={INK} strokeWidth={SW} />
      <circle cx={x} cy={y} r={r} fill={M.sky} fillOpacity={0.28} stroke={INK} strokeWidth={SW + 6} />
      <circle cx={x} cy={y} r={r} fill="none" stroke={M.gold} strokeWidth={6} />
      <path d={`M ${x - r * 0.55} ${y - r * 0.2} A ${r * 0.6} ${r * 0.6} 0 0 1 ${x - r * 0.15} ${y - r * 0.58}`} fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.85} />
    </g>
  )
}
