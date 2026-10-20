/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { ease, lerp, progress, spring, wobble } from '../anim'
import { Burst, Draw, Fade, Paper, Pop, T } from '../kit'
import { M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { centroid, type Pt } from './_b2kit'
import { Cube, GroundShadow, NumDisc, STICKER } from './_kart'

/*
 * Kindergarten shapes colour code (whole lesson; the same as the grade 2–4
 * Geometry lesson): SIDES light up blue, CORNERS pop coral. Each shape wears
 * its picture card's colour (triangle gold, square blue, circle coral, cube
 * blue), so the stage and the answer cards match. Numerals only, no words.
 */
const SIDE = '#3f8fd1'
const SIDE_TXT = '#2a6fb0'
const CORNER = M.coral
const CORNER_TXT = '#d9534a'

/** 0 → 1 → 0 over `dur` from `at` (a hop). */
const bump = (t: number, at: number, dur = 0.36) => {
  const k = progress(t, at, dur)
  return k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI)
}

const polyD = (pts: readonly Pt[]) => `M ${pts.map((p) => `${p[0]} ${p[1]}`).join(' L ')} Z`
const unit = (dx: number, dy: number): Pt => {
  const l = Math.hypot(dx, dy) || 1
  return [dx / l, dy / l]
}

/**
 * A polygon that draws itself on and fills, then counts its sides (blue, a
 * number by each) and its corners (coral dots, a number by each).
 */
function CountedShape({ t, pts, fill, drawAt, sidesAt, cornersAt, sideGap = 0.36, cornerGap = 0.3 }: { t: number; pts: Pt[]; fill: string; drawAt: number; sidesAt: number; cornersAt: number; sideGap?: number; cornerGap?: number }) {
  const c = centroid(pts)
  const d = polyD(pts)
  return (
    <>
      <Fade t={t} at={drawAt + 0.55} dur={0.4}>
        <path d={d} fill={fill} />
      </Fade>
      <Draw t={t} at={drawAt} dur={0.8} d={d} width={6} />
      {pts.map((a, i) => {
        const b = pts[(i + 1) % pts.length]
        const at = sidesAt + i * sideGap
        const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
        const o = unit(m[0] - c[0], m[1] - c[1])
        const bx = m[0] + o[0] * 50
        const by = m[1] + o[1] * 50
        return (
          <g key={`s${i}`}>
            <Draw t={t} at={at} dur={0.3} d={`M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}`} stroke={SIDE} width={13} />
            <Pop t={t} at={at + 0.15} x={bx} y={by} bounce={10}>
              <T x={bx} y={by}>
                <NumDisc n={i + 1} r={25} fill={M.white} ink={SIDE_TXT} />
              </T>
            </Pop>
          </g>
        )
      })}
      {pts.map((v, i) => {
        const at = cornersAt + i * cornerGap
        const o = unit(v[0] - c[0], v[1] - c[1])
        const bx = v[0] + o[0] * 52
        const by = v[1] + o[1] * 52
        return (
          <g key={`c${i}`}>
            <Pop t={t} at={at} x={v[0]} y={v[1]} bounce={9}>
              <circle cx={v[0]} cy={v[1]} r={15} fill={CORNER} stroke={M.ink} strokeWidth={4} />
            </Pop>
            <Pop t={t} at={at + 0.12} x={bx} y={by} bounce={10}>
              <T x={bx} y={by}>
                <NumDisc n={i + 1} r={25} fill={M.white} ink={CORNER_TXT} />
              </T>
            </Pop>
          </g>
        )
      })}
    </>
  )
}

const TRI: Pt[] = [
  [480, 112],
  [700, 432],
  [260, 432],
]

/**
 * kShapes/triangle — "This is a triangle. It has three straight sides. And
 * three pointy corners!" The triangle draws itself, then its three sides
 * light up blue, one, two, three, and its three corners pop coral.
 */
const triangle: Scene = ({ t, cue }: SceneProps) => {
  const name = cue('triangle')
  const sides = cue('three straight sides')
  const corners = cue('pointy corners')
  return (
    <>
      <Paper />
      <T x={480} y={300} s={1 + bump(t, name + 0.9, 0.4) * 0.04}>
        <T x={-480} y={-300}>
          <CountedShape t={t} pts={TRI} fill={STICKER.gold} drawAt={name - 0.2} sidesAt={sides} cornersAt={corners} />
        </T>
      </T>
    </>
  )
}

const SQ = { x: 335, y: 128, s: 290 }
const SQP: Pt[] = [
  [SQ.x, SQ.y],
  [SQ.x + SQ.s, SQ.y],
  [SQ.x + SQ.s, SQ.y + SQ.s],
  [SQ.x, SQ.y + SQ.s],
]

/**
 * kShapes/square — "This is a square. It has four sides, all the same size.
 * And four corners!" The square draws itself; its four sides light up and
 * are counted; a gold stick the length of one side lays itself along each of
 * the others (all the same size); then four coral corners.
 */
const square: Scene = ({ t, cue }: SceneProps) => {
  const name = cue('square')
  const sides = cue('four sides')
  const same = cue('all the same')
  const corners = cue('four corners')
  // the stick: along the top, then the right, the bottom and the left side (inside the square)
  const cx = SQ.x + SQ.s / 2
  const cy = SQ.y + SQ.s / 2
  const inset = SQ.s / 2 - 26
  const spots: [number, number, number][] = [
    [cx, cy - inset, 0],
    [cx + inset, cy, 90],
    [cx, cy + inset, 180],
    [cx - inset, cy, 270],
  ]
  let sp = spots[0]
  for (let i = 1; i < 4; i++) {
    const k = ease.inOutCubic(progress(t, same + 0.25 + (i - 1) * 0.42, 0.36))
    sp = [lerp(sp[0], spots[i][0], k), lerp(sp[1], spots[i][1], k), lerp(sp[2], spots[i][2], k)]
  }
  const stickIn = spring(t, same, { stiffness: 240, damping: 14 })
  const stickOut = progress(t, same + 1.6, 0.3)
  return (
    <>
      <Paper />
      <CountedShape t={t} pts={SQP} fill={STICKER.blue} drawAt={name - 0.2} sidesAt={sides} cornersAt={corners} sideGap={0.24} cornerGap={0.22} />
      {stickIn > 0.001 && stickOut < 1 && (
        <T x={sp[0]} y={sp[1]} r={sp[2]} s={stickIn} o={1 - stickOut}>
          <rect x={-SQ.s / 2 + 10} y={-9} width={SQ.s - 20} height={18} rx={9} fill={M.gold} stroke={M.ink} strokeWidth={4} />
        </T>
      )}
    </>
  )
}

/**
 * kShapes/circle — "This is a circle. It goes round and round. No sides, and
 * no corners!" The circle draws itself; a gold dot runs round it twice; then
 * a blue side with a 0 (no sides) and a coral corner with a 0 (no corners).
 */
const circle: Scene = ({ t, cue }: SceneProps) => {
  const name = cue('circle')
  const round = cue('round and round')
  const noSides = cue('No sides')
  const noCorners = cue('no corners')
  const R = 150
  const cx = 480
  const cy = 280
  const d = `M ${cx} ${cy - R} A ${R} ${R} 0 1 1 ${cx - 0.01} ${cy - R}`
  const lap = ease.inOutCubic(progress(t, round, 1.6)) * Math.PI * 4
  const runner = t >= round && t < round + 1.9
  return (
    <>
      <Paper />
      <Fade t={t} at={name + 0.45} dur={0.4}>
        <circle cx={cx} cy={cy} r={R} fill={STICKER.coral} />
      </Fade>
      <Draw t={t} at={name - 0.2} dur={0.8} d={d} width={6} />
      {runner && (
        <T x={cx + Math.sin(lap) * R} y={cy - Math.cos(lap) * R} s={1 - progress(t, round + 1.6, 0.3)}>
          <circle r={17} fill={M.gold} stroke={M.ink} strokeWidth={4} />
        </T>
      )}
      {/* no sides: a blue side and a 0 */}
      <Pop t={t} at={noSides} x={150} y={280} bounce={10}>
        <T x={150} y={280} s={1.25}>
          <line x1={-44} y1={-58} x2={44} y2={-58} stroke={SIDE} strokeWidth={13} strokeLinecap="round" />
          <T y={24}>
            <NumDisc n={0} r={40} fill={M.white} ink={SIDE_TXT} />
          </T>
        </T>
      </Pop>
      {/* no corners: a coral corner and a 0 */}
      <Pop t={t} at={noCorners} x={810} y={280} bounce={10}>
        <T x={810} y={280} s={1.25}>
          <path d="M -30 -40 L 0 -76 L 30 -40" fill="none" stroke={M.ink} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={0} cy={-76} r={13} fill={CORNER} stroke={M.ink} strokeWidth={4} />
          <T y={24}>
            <NumDisc n={0} r={40} fill={M.white} ink={CORNER_TXT} />
          </T>
        </T>
      </Pop>
    </>
  )
}

/**
 * kShapes/solid — "Some shapes are flat, like a square on paper. Some shapes
 * are solid, like a box. This solid shape is a cube!" A square draws itself on
 * a sheet of paper (flat); a box lands with a thump and a shadow (solid), then
 * turns into a blue cube.
 */
const solid: Scene = ({ t, cue }: SceneProps) => {
  const flat = cue('flat')
  const paper = cue('on paper')
  const solidAt = cue('solid')
  const box = cue('box')
  const cube = cue('cube')
  const land = spring(t, solidAt + 0.15, { stiffness: 200, damping: 12 })
  const thump = wobble(t, solidAt + 0.5, { amp: 0.1, freq: 2.4, decay: 6 })
  const morph = progress(t, cube, 0.5)
  const sq = 1 - Math.abs(Math.sin(morph * Math.PI)) * 0.5
  const isCube = morph >= 0.5
  const hop = Math.sin(progress(t, box, 0.4) * Math.PI) * 26
  return (
    <>
      <Paper />
      {/* flat: a sheet of paper with a square on it */}
      <Pop t={t} at={flat - 0.1} x={270} y={300} bounce={13}>
        <T x={270} y={300} r={-5}>
          <rect x={-150} y={-120} width={300} height={240} rx={10} fill={M.white} stroke={M.ink} strokeWidth={4} />
          <Fade t={t} at={paper + 0.3} dur={0.35}>
            <rect x={-62} y={-62} width={124} height={124} fill={STICKER.blue} />
          </Fade>
          <Draw t={t} at={paper - 0.1} dur={0.6} d="M -62 -62 L 62 -62 L 62 62 L -62 62 Z" width={6} />
        </T>
      </Pop>
      {/* solid: a box drops in, thumps, and becomes a cube */}
      {land > 0.001 && (
        <>
          <T x={690} y={432} s={land}>
            <GroundShadow w={230} />
          </T>
          <T x={670} y={lerp(-200, 330, Math.min(1, land)) - hop} sx={1 + thump} sy={(1 - thump) * sq}>
            {isCube ? (
              <Cube s={170} color={STICKER.blue} />
            ) : (
              <g>
                <Cube s={170} color="#e2b07a" />
                <rect x={-12} y={-85} width={24} height={170} fill="#cf9a62" />
                <polygon points="-12,-85 12,-85 70,-143 46,-143" fill="#cf9a62" />
              </g>
            )}
          </T>
        </>
      )}
      <Burst t={t} at={cube + 0.25} x={700} y={300} r={150} color={M.gold} rays={12} />
    </>
  )
}

export const kShapesScenes: Record<string, Scene> = { triangle, square, circle, solid }
