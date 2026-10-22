/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { ease, lerp, progress, spring } from '../anim'
import { Burst, Draw, Glow, Paper, Pop, T } from '../kit'
import { M } from '../palette'
import { shade, tint } from '../layout'
import type { Scene, SceneProps } from '../types'
import { GroundShadow, NumDisc, PointerHand, STICKER } from './_kart'

/*
 * 1st grade shapes (whole lesson): Shape Grove's sticker colours, ink
 * outlines. A side being talked about draws itself on; corners get a dot and
 * a number; the shape that is "still a triangle" changes size, colour and
 * turn but never its three straight sides. Solids roll on the floor and
 * stack. No words.
 */

/** 0 → 1 → 0 over `dur` from `at` (a hop). */
const bump = (t: number, at: number, dur = 0.36) => {
  const k = progress(t, at, dur)
  return k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI)
}

const TRI: [number, number][] = [
  [480, 90],
  [660, 410],
  [300, 410],
]
const triD = (pts: [number, number][]) => `M ${pts.map((p) => p.join(' ')).join(' L ')} Z`

/**
 * g1Shapes/triangle — "A triangle has three straight sides and three corners.
 * It is closed, with no gaps." Its three sides draw on one by one ("three
 * straight sides"), a numbered dot pops on each corner ("three corners"), and
 * on "closed" it fills in and glows.
 */
const triangle: Scene = ({ t, cue }: SceneProps) => {
  const sides = cue('three straight sides')
  const corners = cue('three corners')
  const closed = cue('closed')
  const fill = ease.outCubic(progress(t, closed, 0.5))
  return (
    <>
      <Paper />
      <Glow t={t} at={closed} x={480} y={300} r={210} breathe={false} />
      {fill > 0 && <path d={triD(TRI)} fill={STICKER.gold} opacity={0.55 * fill} />}
      {TRI.map((a, i) => {
        const b = TRI[(i + 1) % 3]
        return <Draw key={i} t={t} at={sides + i * 0.45} dur={0.5} d={`M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}`} width={14} stroke={M.ink} />
      })}
      {TRI.map((a, i) => {
        const b = TRI[(i + 1) % 3]
        const k = ease.inOutCubic(progress(t, sides + i * 0.45, 0.5))
        if (k <= 0) return null
        return <path key={`c${i}`} d={`M ${a[0]} ${a[1]} L ${lerp(a[0], b[0], k)} ${lerp(a[1], b[1], k)}`} stroke={STICKER.coral} strokeWidth={7} strokeLinecap="round" fill="none" />
      })}
      {TRI.map(([x, y], i) => (
        <Pop key={`d${i}`} t={t} at={corners + i * 0.3} x={x} y={y} bounce={10}>
          <circle cx={x} cy={y} r={13} fill={M.ink} />
          <T x={x + (i === 0 ? 0 : i === 1 ? 46 : -46)} y={y + (i === 0 ? -44 : 12)}>
            <NumDisc n={i + 1} r={24} fill={M.white} />
          </T>
        </Pop>
      ))}
      <Burst t={t} at={closed + 0.3} x={480} y={300} r={160} />
    </>
  )
}

/**
 * g1Shapes/still — "Make it big or small. Paint it blue. Turn it around. It
 * is still a triangle! Your turn!" One triangle: it grows on "big", shrinks
 * on "small", turns blue on "Paint it blue", spins round on "Turn it
 * around", and glows on "still a triangle".
 */
const still: Scene = ({ t, cue }: SceneProps) => {
  const big = cue('big')
  const small = cue('small')
  const blue = cue('Paint it blue')
  const turn = cue('Turn it around')
  const isStill = cue('still a triangle')
  const your = cue('Your turn')
  const s = 1 + 0.45 * ease.outBack(progress(t, big, 0.45)) - 0.85 * ease.outBack(progress(t, small, 0.45)) + 0.4 * ease.outCubic(progress(t, blue - 0.2, 0.4))
  const color = t < blue ? STICKER.coral : STICKER.blue
  const r = 160 * ease.inOutCubic(progress(t, turn, 1))
  const pts: [number, number][] = [
    [0, -130],
    [150, 130],
    [-150, 130],
  ]
  return (
    <>
      <Paper />
      <Glow t={t} at={isStill} x={480} y={280} r={200} breathe={false} />
      <T x={480} y={280} s={Math.max(0.3, s * 0.85)} r={r}>
        <path d={triD(pts)} fill={tint(color, 0.35)} stroke={M.ink} strokeWidth={14} strokeLinejoin="round" />
        <path d={triD(pts)} fill="none" stroke={color} strokeWidth={7} strokeLinejoin="round" />
      </T>
      <Burst t={t} at={isStill + 0.2} x={480} y={280} r={180} />
      {t >= your && (
        <T x={760} y={420 - bump(t, your + 0.6, 0.4) * 12} r={-20}>
          <PointerHand press={bump(t, your + 0.6, 0.4)} />
        </T>
      )}
    </>
  )
}

/**
 * g1Shapes/snap — "Shapes can make new shapes. Two triangles snap together.
 * Now they make a square!" Two triangles (mint and coral) wait apart; on
 * "snap together" they slide into each other; on "a square" its four sides
 * glow and its corners get numbered dots.
 */
const snap: Scene = ({ t, cue }: SceneProps) => {
  const two = cue('Two triangles')
  const together = cue('snap together')
  const square = cue('a square')
  const k = ease.inOutCubic(progress(t, together, 0.9))
  const S = 260
  const x0 = 480 - S / 2
  const y0 = 270 - S / 2
  const off = (1 - k) * 90
  const a: [number, number][] = [
    [x0 - off, y0 + off],
    [x0 + S - off, y0 + S + off],
    [x0 - off, y0 + S + off],
  ]
  const b: [number, number][] = [
    [x0 + off, y0 - off],
    [x0 + S + off, y0 - off],
    [x0 + S + off, y0 + S - off],
  ]
  const sq: [number, number][] = [
    [x0, y0],
    [x0 + S, y0],
    [x0 + S, y0 + S],
    [x0, y0 + S],
  ]
  const s1 = spring(t, two, { stiffness: 220, damping: 13 })
  return (
    <>
      <Paper />
      <Glow t={t} at={square} x={480} y={270} r={200} breathe={false} />
      <T x={480} y={270} s={Math.min(1, s1)}>
        <g transform="translate(-480 -270)">
          <path d={triD(a)} fill={STICKER.mint} stroke={M.ink} strokeWidth={6} strokeLinejoin="round" />
          <path d={triD(b)} fill={STICKER.coral} stroke={M.ink} strokeWidth={6} strokeLinejoin="round" />
        </g>
      </T>
      {t >= square && <path d={triD(sq)} fill="none" stroke={M.gold} strokeWidth={10} strokeLinejoin="round" opacity={ease.outCubic(progress(t, square, 0.4))} />}
      {sq.map(([x, y], i) => (
        <Pop key={i} t={t} at={square + 0.2 + i * 0.2} x={x} y={y} bounce={10}>
          <circle cx={x} cy={y} r={12} fill={M.ink} />
        </Pop>
      ))}
      <Burst t={t} at={square + 0.3} x={480} y={270} r={190} />
    </>
  )
}

/** A sphere (a ball), centred on (0, 0). `spin` turns its shine round as it rolls. */
function Sphere({ r = 60, spin = 0, color = STICKER.coral }: { r?: number; spin?: number; color?: string }) {
  return (
    <g>
      <circle r={r} fill={color} stroke={M.ink} strokeWidth={5} />
      <g transform={`rotate(${spin})`}>
        <path d={`M ${-r} 0 Q 0 ${r * 0.5} ${r} 0`} fill="none" stroke={shade(color, 0.25)} strokeWidth={5} />
      </g>
      <ellipse cx={-r * 0.3} cy={-r * 0.35} rx={r * 0.22} ry={r * 0.14} fill="#fff" opacity={0.7} />
    </g>
  )
}

/** A cube, front face s × s, centred on its front face. */
function Box3({ s = 110, color = STICKER.blue }: { s?: number; color?: string }) {
  const d = s * 0.3
  const h = s / 2
  return (
    <g strokeLinejoin="round">
      <polygon points={`${-h},${-h} ${-h + d},${-h - d} ${h + d},${-h - d} ${h},${-h}`} fill={tint(color, 0.45)} stroke={M.ink} strokeWidth={5} />
      <polygon points={`${h},${-h} ${h + d},${-h - d} ${h + d},${h - d} ${h},${h}`} fill={shade(color, 0.22)} stroke={M.ink} strokeWidth={5} />
      <rect x={-h} y={-h} width={s} height={s} fill={color} stroke={M.ink} strokeWidth={5} />
    </g>
  )
}

/** A cylinder standing up, centred on (0, 0). */
function Cyl({ w = 100, h = 110, color = STICKER.mint }: { w?: number; h?: number; color?: string }) {
  const rx = w / 2
  const ry = w * 0.16
  return (
    <g>
      <path d={`M ${-rx} ${-h / 2} L ${-rx} ${h / 2} A ${rx} ${ry} 0 0 0 ${rx} ${h / 2} L ${rx} ${-h / 2}`} fill={color} stroke={M.ink} strokeWidth={5} />
      <ellipse cx={0} cy={-h / 2} rx={rx} ry={ry} fill={tint(color, 0.45)} stroke={M.ink} strokeWidth={5} />
    </g>
  )
}

const FLOOR = 440

/**
 * g1Shapes/solids — "A sphere can roll. A cube can stack. A cylinder can roll
 * and stack! Your turn!" A sphere rolls across the floor on "sphere can
 * roll"; a second cube drops onto a cube on "cube can stack"; a cylinder
 * rolls a little on "cylinder can roll" (lying down) and then stands with
 * another stacked on it on "and stack".
 */
const solids: Scene = ({ t, cue }: SceneProps) => {
  const sph = cue('sphere can roll')
  const cube = cue('cube can stack')
  const cyl = cue('cylinder can roll')
  const stack = cue('and stack')
  // the sphere rolls from left to right
  const roll = ease.inOutCubic(progress(t, sph + 0.2, 1.4))
  const sx = lerp(90, 250, roll)
  const spin = (sx - 90) * (180 / (Math.PI * 55))
  // the cube: another drops on top
  const drop = ease.outBack(progress(t, cube + 0.2, 0.5))
  // the cylinder: lying down it rolls; then stands up with another on top
  const cylRoll = ease.inOutCubic(progress(t, cyl + 0.2, 1))
  const stood = ease.outBack(progress(t, stack, 0.5))
  return (
    <>
      <Paper />
      <rect x={0} y={FLOOR} width={960} height={100} fill={M.sand} opacity={0.55} />
      <line x1={0} y1={FLOOR} x2={960} y2={FLOOR} stroke={M.ink} strokeWidth={4} opacity={0.5} />
      {/* the sphere */}
      <Pop t={t} at={sph - 0.3} x={sx} y={FLOOR - 55}>
        <T x={sx} y={FLOOR + 2}>
          <GroundShadow w={100} />
        </T>
        <T x={sx} y={FLOOR - 55}>
          <Sphere r={55} spin={spin} />
        </T>
      </Pop>
      {/* the cube, and the one stacked on it */}
      <Pop t={t} at={cube - 0.3} x={480} y={FLOOR - 50}>
        <T x={480} y={FLOOR - 50}>
          <Box3 s={100} />
        </T>
        {drop > 0 && (
          <T x={480} y={lerp(FLOOR - 400, FLOOR - 150, Math.min(1, drop)) - (drop > 1 ? (drop - 1) * 20 : 0)}>
            <Box3 s={100} color={STICKER.lilac} />
          </T>
        )}
      </Pop>
      {/* the cylinder: rolling on its side, then standing with another on top */}
      <Pop t={t} at={cyl - 0.3} x={780} y={FLOOR - 50}>
        {stood <= 0 ? (
          <T x={lerp(700, 790, cylRoll)} y={FLOOR - 50} r={90 + cylRoll * 30}>
            <Cyl w={96} h={120} />
          </T>
        ) : (
          <>
            <T x={790} y={FLOOR - 60}>
              <Cyl w={96} h={110} />
            </T>
            <T x={790} y={lerp(FLOOR - 360, FLOOR - 180, Math.min(1, stood))}>
              <Cyl w={96} h={110} color={STICKER.gold} />
            </T>
          </>
        )}
      </Pop>
    </>
  )
}

export const g1ShapesScenes: Record<string, Scene> = { triangle, still, snap, solids }
