/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { clamp, ease, interpolate, mixColor, progress, pulse, spring } from '../anim'
import { Burst, Camera, Draw, Fade, Kinetic, Paper, Pop, Ring, Title } from '../kit'
import { M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { Backdrop, Badge, Hash, Pencil, RightMark, centroid, deg, growMatch, idleRamp, lerp, lerpPt, mid, ngon, outward, polyD, trace, wedgePath, type Pt } from './_b2kit'

// ── colour coding (whole lesson) ─────────────────────────────────────────────
// sides = blue, corners = coral, right angles = gold, acute = mint, obtuse = lilac
const SIDE = M.sea
const SIDE_TXT = '#2a7fb0'
const CORNER = M.coral
const CORNER_TXT = '#d9534a'
const RIGHT_TXT = '#b77f00'
const ACUTE = '#7ed9b2'
const ACUTE_TXT = '#25936a'
const OBTUSE = M.lilac
const OBTUSE_TXT = '#7a5cc4'
const FILL = '#e6f4fc'

/** A square's corners (clockwise from top-left). */
const squarePts = (c: Pt, s: number): Pt[] => [
  [c[0] - s / 2, c[1] - s / 2],
  [c[0] + s / 2, c[1] - s / 2],
  [c[0] + s / 2, c[1] + s / 2],
  [c[0] - s / 2, c[1] + s / 2],
]

/** Draw-on progress for a polygon traced edge by edge (each edge eases in and out). */
function edgeK(t: number, at: number, dur: number, n: number) {
  const k = progress(t, at, dur) * n
  if (k >= n) return 1
  const e = Math.floor(k)
  return (e + ease.inOutSine(k - e)) / n
}

/** A chunky two-tone edge (ink outline + colour core). */
function Edge({ a, b, color, w = 10, glow = 0 }: { a: Pt; b: Pt; color: string; w?: number; glow?: number }) {
  return (
    <g>
      {glow > 0.01 && <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={M.gold} strokeWidth={w + 18 * glow} strokeLinecap="round" opacity={0.55 * glow} />}
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={M.ink} strokeWidth={w + 6} strokeLinecap="round" />
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={w} strokeLinecap="round" />
    </g>
  )
}

/** A polygon drawn by the pencil, then shown as separate (colourable) edges. */
function BuiltPolygon({ t, pts, at, dur, colorOf, fill = FILL, fillAt, w = 10, glowOf, pen = true }: { t: number; pts: Pt[]; at: number; dur: number; colorOf: (i: number) => string; fill?: string; fillAt: number; w?: number; glowOf?: (i: number) => number; pen?: boolean }) {
  const k = edgeK(t, at, dur, pts.length)
  if (k <= 0) return null
  const tr = trace(pts, k)
  const fillK = ease.outCubic(progress(t, fillAt, 0.6))
  const penOut = progress(t, at + dur, 0.35)
  return (
    <g>
      {fillK > 0 && <path d={polyD(pts)} fill={fill} opacity={fillK} />}
      {k < 1 ? (
        <>
          <path d={polyD(tr.pts, false)} fill="none" stroke={M.ink} strokeWidth={w + 6} strokeLinecap="round" strokeLinejoin="round" />
          <path d={polyD(tr.pts, false)} fill="none" stroke={colorOf(-1)} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        // two passes (all outlines, then all cores) so the corners join cleanly
        <>
          {glowOf &&
            pts.map((p, i) => {
              const g = glowOf(i)
              const q = pts[(i + 1) % pts.length]
              return g > 0.01 ? <line key={i} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={M.gold} strokeWidth={w + 18 * g} strokeLinecap="round" opacity={0.55 * g} /> : null
            })}
          <path d={polyD(pts)} fill="none" stroke={M.ink} strokeWidth={w + 6} strokeLinejoin="round" />
          {pts.map((p, i) => {
            const q = pts[(i + 1) % pts.length]
            return <line key={i} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke={colorOf(i)} strokeWidth={w} strokeLinecap="square" />
          })}
        </>
      )}
      {pen && penOut < 1 && <Pencil x={tr.tip[0]} y={tr.tip[1]} opacity={1 - penOut} s={1 - 0.2 * penOut} />}
    </g>
  )
}

/** A label pill (text on a coloured capsule) at (x, y), scale s. */
function Pill({ x, y, text, color, size = 30, s = 1, opacity = 1, ink = M.ink }: { x: number; y: number; text: string; color: string; size?: number; s?: number; opacity?: number; ink?: string }) {
  if (s <= 0.001 || opacity <= 0.001) return null
  const w = text.length * size * 0.56 + size * 1.3
  const h = size * 1.7
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={color} stroke={M.ink} strokeWidth={3} filter="url(#sq-shadow)" />
      <Title x={0} y={1} size={size} color={ink}>
        {text}
      </Title>
    </g>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
/**
 * geometry/shapes — "Shapes get their names from their sides and their corners.
 * A square is special because it has four sides that are all the same length,
 * and it has four corners."
 * A pencil builds a square edge by edge; the sides turn blue and the corners pop
 * coral as they're named; the sides are counted 1-4; a blue measuring stick
 * peels off the top side and cartwheels onto each other side (it fits every
 * time: tick marks); then the corners are counted.
 */
const shapes: Scene = ({ t, cue, reduced }: SceneProps) => {
  const sidesW = cue('their sides')
  const cornersW = cue('their corners')
  const sq = cue('a square')
  const four = cue('four sides')
  const same = cue('same length')
  const fourC = cue('four corners')
  const C: Pt = [345, 258]
  const S = 240
  const P = squarePts(C, S)
  const drawEnd = Math.max(1.4, sidesW - 0.1)
  const idle = idleRamp(t, fourC + 1.6, reduced)
  const bob = Math.sin(t * 1.8) * 4 * idle

  // the measuring stick: peels off the top edge, then hops to each other side
  const hop = (i: number) => same + 0.2 + (i - 1) * 0.42
  let stickSide = 0
  let hopK = 0
  for (let i = 1; i <= 3; i++) {
    if (t >= hop(i)) {
      stickSide = i - 1
      hopK = ease.inOutCubic(progress(t, hop(i), 0.36))
      if (hopK >= 1) {
        stickSide = i
        hopK = 0
      }
    }
  }
  const sidePose = (i: number) => {
    const a = P[i]
    const b = P[(i + 1) % 4]
    const n = outward(a, b, C)
    const m = mid(a, b)
    return { x: m[0] + n[0] * 32, y: m[1] + n[1] * 32, rot: i * 90 }
  }
  const p0 = sidePose(stickSide)
  const p1 = sidePose(Math.min(3, stickSide + 1))
  const lift = ease.outCubic(progress(t, same - 0.25, 0.4))
  const sx = lerp(p0.x, p1.x, hopK)
  const sy = lerp(p0.y, p1.y, hopK) - Math.sin(hopK * Math.PI) * 26
  const srot = lerp(p0.rot, p1.rot, hopK)
  const stickOn = t > same - 0.25 && t < same + 2.0
  const stickFade = 1 - progress(t, same + 1.65, 0.3)
  const topLiftX = C[0]
  const topLiftY = P[0][1] - 32 * lift
  const hashAt = (i: number) => (i === 0 ? same + 0.05 : hop(i) + 0.36)

  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 400, y: 262, zoom: 1.18 },
          { at: sq + 0.6, x: 480, y: 270, zoom: 1 },
        ]}
      >
        <Backdrop t={t} at={0.05} x={C[0]} y={C[1]} r={225} reduced={reduced} />
        <g transform={`translate(0 ${bob})`}>
          <g filter="url(#sq-shadow)">
            <BuiltPolygon
              t={t}
              pts={P}
              w={12}
              at={0.25}
              dur={drawEnd - 0.25}
              fillAt={sq}
              colorOf={(i) => (i < 0 ? M.ink : mixColor(M.ink, SIDE, progress(t, sidesW + i * 0.12, 0.3)))}
              glowOf={(i) => {
                const a = interpolate(t, [sidesW + i * 0.12, sidesW + i * 0.12 + 0.15, sidesW + i * 0.12 + 0.7], [0, 1, 0])
                const b = interpolate(t, [four + 0.15 + i * 0.3, four + 0.25 + i * 0.3, four + 0.75 + i * 0.3], [0, 1, 0])
                return Math.max(a, b)
              }}
            />
          </g>
          {/* equal-length ticks, one per side as the stick lands */}
          {P.map((p, i) => (
            <Hash key={i} a={p} b={P[(i + 1) % 4]} k={ease.outBack(progress(t, hashAt(i), 0.3))} />
          ))}
          {/* corners */}
          {P.map(([x, y], i) => {
            const glow = interpolate(t, [fourC + 0.1 + i * 0.3, fourC + 0.2 + i * 0.3, fourC + 0.8 + i * 0.3], [0, 1, 0])
            return (
              <Pop key={i} t={t} at={cornersW + i * 0.1} x={x} y={y} bounce={9}>
                <circle cx={x} cy={y} r={14 + 8 * glow + 1.5 * pulse(t, 1.4) * idle} fill={CORNER} stroke={M.ink} strokeWidth={3.5} />
              </Pop>
            )
          })}
          {/* side counting 1-4 (outside each side) */}
          {P.map((p, i) => {
            const n = outward(p, P[(i + 1) % 4], C)
            const m = mid(p, P[(i + 1) % 4])
            return <Badge key={i} t={t} at={four + 0.15 + i * 0.3} x={m[0] + n[0] * 48} y={m[1] + n[1] * 48} label={i + 1} color={SIDE} r={24} out={same - 0.3} />
          })}
          {/* corner counting 1-4 */}
          {P.map(([x, y], i) => {
            const d: Pt = [Math.sign(x - C[0]), Math.sign(y - C[1])]
            return <Badge key={i} t={t} at={fourC + 0.1 + i * 0.3} x={x + d[0] * 40} y={y + d[1] * 40} label={i + 1} color={CORNER} r={22} out={fourC + 2.6} />
          })}
          {/* the measuring stick */}
          {stickOn && (
            <g opacity={clamp(lift * 1.5) * stickFade} transform={`translate(${stickSide === 0 && hopK === 0 ? topLiftX : sx} ${stickSide === 0 && hopK === 0 ? topLiftY : sy}) rotate(${srot})`}>
              <g filter="url(#sq-shadow)">
                <rect x={-S / 2} y={-11} width={S} height={22} rx={5} fill={M.gold} stroke={M.ink} strokeWidth={3} />
                {Array.from({ length: 9 }, (_, i) => (
                  <line key={i} x1={-S / 2 + (i + 1) * (S / 10)} y1={-11} x2={-S / 2 + (i + 1) * (S / 10)} y2={i === 4 ? 3 : -3} stroke={M.ink} strokeWidth={2.5} />
                ))}
              </g>
            </g>
          )}
        </g>

        {/* call-outs while the words are new: "sides" / "corners" */}
        <Fade t={t} at={sidesW + 0.1} out={four - 0.4}>
          <Draw t={t} at={sidesW + 0.1} dur={0.35} d={`M ${P[1][0] + 14} ${C[1] + 30} Q ${P[1][0] + 60} ${C[1] + 40} ${P[1][0] + 95} ${C[1] + 30}`} stroke={SIDE_TXT} width={4} />
        </Fade>
        <Fade t={t} at={cornersW + 0.1} out={four - 0.4}>
          <Draw t={t} at={cornersW + 0.1} dur={0.35} d={`M ${P[1][0] + 16} ${P[1][1] - 12} Q ${P[1][0] + 60} ${P[1][1] - 40} ${P[1][0] + 95} ${P[1][1] - 40}`} stroke={CORNER_TXT} width={4} />
        </Fade>

        {/* right panel: the labels that stay */}
        {(() => {
          const sIn = spring(t, sidesW + 0.15, { stiffness: 200, damping: 14 })
          const sMove = ease.inOutCubic(progress(t, four - 0.4, 0.7))
          const cIn = spring(t, cornersW + 0.15, { stiffness: 200, damping: 14 })
          const cMove = ease.inOutCubic(progress(t, four - 0.3, 0.7))
          const sxy = lerpPt([P[1][0] + 165, C[1] + 30], [735, 205], sMove)
          const cxy = lerpPt([P[1][0] + 175, P[1][1] - 40], [735, 345], cMove)
          const ib = (ph: number) => Math.sin(t * 1.6 + ph) * 3 * idle
          return (
            <>
              <Pill x={cxy[0]} y={cxy[1] + ib(1)} text="corners" color={CORNER} s={cIn} />
              <Pill x={sxy[0]} y={sxy[1] + ib(0)} text="sides" color={SIDE} s={sIn} />
              <Badge t={t} at={four + 1.3} x={sxy[0] - 92} y={sxy[1] + ib(0)} label="4" color={M.white} r={30} size={38} />
              <Badge t={t} at={fourC + 1.25} x={cxy[0] - 112} y={cxy[1] + ib(1)} label="4" color={M.white} r={30} size={38} />
              <Fade t={t} at={same + 1.6}>
                <g transform={`translate(0 ${ib(0)})`}>
                  <line x1={622} y1={274} x2={664} y2={274} stroke={M.ink} strokeWidth={11} strokeLinecap="round" />
                  <line x1={622} y1={274} x2={664} y2={274} stroke={SIDE} strokeWidth={6} strokeLinecap="round" />
                  <line x1={643} y1={263} x2={643} y2={285} stroke={M.ink} strokeWidth={4} strokeLinecap="round" />
                  <Title x={676} y={275} size={28} color={SIDE_TXT} anchor="start">
                    same length
                  </Title>
                </g>
              </Fade>
            </>
          )
        })()}
      </Camera>
      <Kinetic t={t} at={sq + 0.1} text="square" x={350} y={478} size={54} color={M.ink} />
      <Burst t={t} at={hop(3) + 0.36} x={P[3][0] - 32} y={C[1]} color={SIDE} r={50} />
    </>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// family: one polygon that grows a corner at a time
const FAM_C: Pt = [330, 232]
const FAM_COLORS = [M.coral, M.gold, M.mint, '#8ab8ff']
const FAM_TXT = ['#d9534a', '#b77f00', '#25936a', '#3f74d6']
const FAM_NAMES = ['triangle', 'quadrilateral', 'pentagon', 'hexagon']
/** Re-centre a polygon on its bounding-box middle. */
function boxCenter(pts: Pt[], c: Pt): Pt[] {
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const dx = c[0] - (Math.min(...xs) + Math.max(...xs)) / 2
  const dy = c[1] - (Math.min(...ys) + Math.max(...ys)) / 2
  return pts.map((p) => [p[0] + dx, p[1] + dy] as Pt)
}
const FAM: Pt[][] = [
  boxCenter(ngon(3, 0, 0, 168, 0), FAM_C),
  boxCenter(ngon(4, 0, 0, 152, Math.PI / 4), FAM_C),
  boxCenter(ngon(5, 0, 0, 150, 0), FAM_C),
  boxCenter(ngon(6, 0, 0, 148, Math.PI / 6), FAM_C),
]
const FAM_GROW = [null, growMatch(FAM[0], FAM[1]), growMatch(FAM[1], FAM[2]), growMatch(FAM[2], FAM[3])]
const SLOTS: Pt[] = [
  [150, 220],
  [370, 220],
  [590, 220],
  [810, 220],
]
const SLOT_SCALE = 0.5
/** Each edge's place when counting clockwise from 12 o'clock (so "1" is always at the top right). */
function edgeRank(pts: Pt[]): number[] {
  const c = centroid(pts)
  const ang = pts.map((p, i) => {
    const m = mid(p, pts[(i + 1) % pts.length])
    const a = Math.atan2(m[0] - c[0], -(m[1] - c[1]))
    return a < -0.02 ? a + Math.PI * 2 : a
  })
  const order = ang.map((a, i) => [a, i] as const).sort((x, y) => x[0] - y[0])
  const rank: number[] = []
  order.forEach(([, i], r) => (rank[i] = r))
  return rank
}
const FAM_RANK = FAM.map(edgeRank)

/**
 * geometry/family — "Count the sides to name a shape. Three sides make a
 * triangle. Four sides make a quadrilateral. Five sides make a pentagon, and six
 * sides make a hexagon!"
 * A pencil draws a triangle; its sides are counted 1-2-3 (a big counter ticks
 * along) and it's named. Then a new corner pushes out of an edge — the shape
 * springs into a quadrilateral, pentagon, hexagon, counted and named each time.
 * Finally the whole family lines up with their side counts.
 */
const family: Scene = ({ t, cue, reduced }: SceneProps) => {
  const stageAt = [cue('three sides'), cue('four sides'), cue('five sides'), cue('six sides')]
  const nameAt = [cue('a triangle'), cue('a quadrilateral'), cue('a pentagon'), cue('a hexagon')]
  const lineup = nameAt[3] + 1.5
  const idle = idleRamp(t, lineup + 1, reduced)

  // current stage + springy morph into it
  let stage = 0
  for (let i = 1; i < 4; i++) if (t >= stageAt[i]) stage = i
  let pts: Pt[] = FAM[0]
  let colorK = 1
  if (stage > 0) {
    const from = FAM_GROW[stage]!
    const k = spring(t, stageAt[stage], { stiffness: 120, damping: 11 })
    pts = from.map((p, i) => lerpPt(p, FAM[stage][i], k))
    colorK = clamp(k)
  }
  const fill = stage > 0 ? mixColor(FAM_COLORS[stage - 1], FAM_COLORS[stage], colorK) : FAM_COLORS[0]
  const c = centroid(pts)

  // fly to the line-up slot at the end
  const fly = ease.inOutCubic(progress(t, lineup, 0.9))
  const flyS = lerp(1, SLOT_SCALE, fly)
  const flyC = lerpPt(FAM_C, SLOTS[3], fly)
  const place = (p: Pt): Pt => [flyC[0] + (p[0] - FAM_C[0]) * flyS, flyC[1] + (p[1] - FAM_C[1]) * flyS + Math.sin(t * 1.7 + 3) * 4 * idle]
  const shown = pts.map(place)

  const fillK = ease.outCubic(progress(t, stageAt[0] - 0.4, 0.6))
  const drawK = edgeK(t, 0.25, Math.max(1.2, stageAt[0] - 0.6), 3)
  const tr = trace(FAM[0], drawK)
  const n = pts.length
  // side badges for the current stage
  const popAt = (i: number) => stageAt[stage] + 0.25 + FAM_RANK[stage][i] * 0.13
  const popped = Array.from({ length: n }, (_, i) => i).filter((i) => t >= popAt(i)).length
  // the big counter "counts on": it keeps the last total until the recount passes it
  const counted = Math.max(popped, stage > 0 ? n - 1 : 0)
  const lastPop = popped > 0 ? stageAt[stage] + 0.25 + (popped - 1) * 0.13 : 0
  const bump = popped > 0 && popped >= counted ? 1 + 0.35 * (1 - ease.outCubic(progress(t, lastPop, 0.35))) : 1
  const panelOut = 1 - ease.inOutCubic(progress(t, lineup - 0.2, 0.5))

  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 400, y: 260, zoom: 1.12 },
          { at: stageAt[0] + 0.6, x: 470, y: 262, zoom: 1.04 },
          { at: lineup + 0.8, x: 480, y: 270, zoom: 1 },
        ]}
      >
        {fly < 1 && <Backdrop t={t} at={0.05} x={FAM_C[0]} y={FAM_C[1]} r={225} color={mixColor(M.paper, fill, 0.4)} opacity={0.7 * (1 - fly)} reduced={reduced} />}
        {/* the morphing shape */}
        {drawK < 1 ? (
          <g>
            <path d={polyD(tr.pts, false)} fill="none" stroke={M.ink} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
            <Pencil x={tr.tip[0]} y={tr.tip[1]} />
          </g>
        ) : (
          <g filter="url(#sq-shadow)">
            {/* gold glow under each side as it is counted */}
            {fly < 0.05 &&
              shown.map((p, i) => {
                const g = interpolate(t, [popAt(i), popAt(i) + 0.08, popAt(i) + 0.55], [0, 1, 0])
                return g > 0.01 ? <line key={i} x1={p[0]} y1={p[1]} x2={shown[(i + 1) % n][0]} y2={shown[(i + 1) % n][1]} stroke={M.gold} strokeWidth={30} strokeLinecap="round" opacity={0.7 * g} /> : null
              })}
            <path d={polyD(shown)} fill={mixColor(M.paper, fill, fillK)} stroke={M.ink} strokeWidth={8 * lerp(1, 0.75, fly)} strokeLinejoin="round" />
            {/* the new corner glints as it pushes out */}
            {stage > 0 && fly < 0.05 && (() => {
              const g = 1 - progress(t, stageAt[stage] + 0.1, 0.7)
              const from = FAM_GROW[stage]!
              const newIdx = from.findIndex((p) => !FAM[stage - 1].some((q) => Math.abs(q[0] - p[0]) < 0.01 && Math.abs(q[1] - p[1]) < 0.01))
              if (g <= 0 || newIdx < 0) return null
              const [x, y] = shown[newIdx]
              return <circle cx={x} cy={y} r={10 + 14 * (1 - g)} fill="none" stroke={M.white} strokeWidth={5 * g} opacity={g} />
            })()}
          </g>
        )}
        {stage > 0 && fly < 0.05 && <Burst t={t} at={stageAt[stage] + 0.05} x={c[0]} y={c[1]} color={FAM_COLORS[stage]} r={150} rays={12} />}
        {/* side badges */}
        {fly < 0.01 &&
          Array.from({ length: n }, (_, i) => {
            const a = pts[i]
            const b = pts[(i + 1) % n]
            const o = outward(a, b, c)
            const m = mid(a, b)
            const nextAt = stage < 3 ? stageAt[stage + 1] - 0.4 : lineup - 0.35
            return <Badge key={`${stage}-${i}`} t={t} at={popAt(i)} x={m[0] + o[0] * 44} y={m[1] + o[1] * 44} label={FAM_RANK[stage][i] + 1} color={M.white} r={21} out={nextAt} />
          })}

        {/* right panel: big count + "sides" */}
        <g opacity={panelOut}>
          {counted === 0 ? (
            <Pop t={t} at={0.3} x={720} y={205}>
              <g transform={`rotate(${Math.sin(t * 3) * 6} 720 205)`}>
                <Title x={720} y={205} size={150} color={M.inkSoft} stroke={M.white}>
                  ?
                </Title>
              </g>
            </Pop>
          ) : (
            <g transform={`translate(720 205) scale(${bump}) translate(-720 -205)`}>
              <Title x={720} y={205} size={170} color={FAM_TXT[stage]} stroke={M.white}>
                {counted}
              </Title>
            </g>
          )}
          <Fade t={t} at={0.5}>
            <Title x={720} y={315} size={42} color={M.ink}>
              sides
            </Title>
          </Fade>
        </g>
        {/* the name, spoken */}
        {FAM_NAMES.map((name, i) => (
          <Fade key={name} t={t} at={nameAt[i] - 0.05} out={i < 3 ? stageAt[i + 1] - 0.15 : lineup - 0.35} dur={0.25}>
            <Kinetic t={t} at={nameAt[i]} text={name} x={FAM_C[0]} y={474} size={i === 1 ? 50 : 56} color={FAM_TXT[i]} />
          </Fade>
        ))}

        {/* the line-up */}
        {[0, 1, 2].map((i) => {
          const at = lineup + 0.35 + i * 0.15
          const sp = FAM[i].map((p): Pt => [SLOTS[i][0] + (p[0] - FAM_C[0]) * SLOT_SCALE, SLOTS[i][1] + (p[1] - FAM_C[1]) * SLOT_SCALE + Math.sin(t * 1.7 + i) * 4 * idle])
          return (
            <Pop key={i} t={t} at={at} x={SLOTS[i][0]} y={SLOTS[i][1]}>
              <path d={polyD(sp)} fill={FAM_COLORS[i]} stroke={M.ink} strokeWidth={6} strokeLinejoin="round" filter="url(#sq-shadow)" />
            </Pop>
          )
        })}
        {[0, 1, 2, 3].map((i) => {
          const at = lineup + 0.55 + i * 0.15
          const bob = Math.sin(t * 1.7 + (i === 3 ? 3 : i)) * 4 * idle
          return (
            <g key={i}>
              <Badge t={t} at={at + 0.25} x={SLOTS[i][0]} y={SLOTS[i][1] + bob} label={i + 3} color={M.white} r={27} size={34} />
              <Fade t={t} at={at + 0.2}>
                <Title x={SLOTS[i][0]} y={350} size={i === 1 ? 27 : 32} color={FAM_TXT[i]} stroke={M.white}>
                  {FAM_NAMES[i]}
                </Title>
                <Title x={SLOTS[i][0]} y={392} size={22} color={M.inkSoft}>
                  {`${i + 3} sides`}
                </Title>
              </Fade>
            </g>
          )
        })}
      </Camera>
      <Kinetic t={t} at={lineup + 1.3} text="count the sides to name a shape" x={480} y={482} size={38} />
    </>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
/**
 * geometry/angles — "A corner, where two sides meet, is called an angle. The
 * square corner that you see in a square is a special angle that we call a right
 * angle."
 * Two blue sides glide in and meet at a coral corner; a coral wedge sweeps open
 * between them ("angle"). The top side swings up to a square corner — the wedge
 * snaps into a gold right-angle box — and the rest of a square draws itself
 * around it. All four corners get gold boxes: "square corner = right angle".
 */
const angles: Scene = ({ t, cue, reduced }: SceneProps) => {
  const meet = cue('sides meet')
  const angleW = cue('called an angle')
  const sqCorner = cue('the square corner')
  const inSq = cue('in a square')
  const special = cue('special angle')
  const right = cue('a right angle')
  const V: Pt = [255, 425]
  const L = 280
  const theta0 = 50
  const snap = ease.outBack(progress(t, sqCorner, 0.75))
  const theta = lerp(theta0, 90, snap)
  const th = deg(theta)
  const arrive = ease.outCubic(progress(t, 0.25, Math.max(0.8, meet + 0.15 - 0.25)))
  const aOff = (1 - arrive) * 420
  const bOff: Pt = [-(1 - arrive) * 260, -(1 - arrive) * 220]
  const aEnd: Pt = [V[0] + L + aOff, V[1]]
  const bEnd: Pt = [V[0] + bOff[0] + L * Math.cos(th), V[1] + bOff[1] - L * Math.sin(th)]
  const aStart: Pt = [V[0] + aOff, V[1]]
  const bStart: Pt = [V[0] + bOff[0], V[1] + bOff[1]]
  const sweep = ease.inOutCubic(progress(t, angleW, 0.55))
  const boxK = ease.outBack(progress(t, sqCorner + 0.55, 0.35))
  const wedgeOut = 1 - progress(t, sqCorner + 0.45, 0.25)
  const idle = idleRamp(t, right + 1.4, reduced)
  // the rest of the square
  const TL: Pt = [V[0], V[1] - L]
  const TR: Pt = [V[0] + L, V[1] - L]
  const BR: Pt = [V[0] + L, V[1]]
  const sqFill = ease.outCubic(progress(t, inSq + 0.5, 0.6))
  const cornersK = [V, BR, TR, TL]
  const boxAt = [sqCorner + 0.55, right + 0.15, right + 0.35, right + 0.55]
  const dirs: [Pt, Pt][] = [
    [[1, 0], [0, -1]],
    [[0, -1], [-1, 0]],
    [[-1, 0], [0, 1]],
    [[0, 1], [1, 0]],
  ]

  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 350, y: 330, zoom: 1.16 },
          { at: sqCorner + 0.5, x: 480, y: 272, zoom: 1 },
        ]}
      >
        <Backdrop t={t} at={0.05} x={V[0] + L / 2} y={V[1] - L / 2} r={240} reduced={reduced} />
        {/* square fill + the two new sides */}
        {sqFill > 0 && <path d={polyD([V, BR, TR, TL])} fill={FILL} opacity={sqFill} />}
        <Draw t={t} at={inSq} dur={0.5} d={`M ${BR[0]} ${BR[1]} L ${TR[0]} ${TR[1]}`} stroke={M.ink} width={18} />
        <Draw t={t} at={inSq + 0.35} dur={0.5} d={`M ${TR[0]} ${TR[1]} L ${TL[0]} ${TL[1]}`} stroke={M.ink} width={18} />
        <Draw t={t} at={inSq} dur={0.5} d={`M ${BR[0]} ${BR[1]} L ${TR[0]} ${TR[1]}`} stroke={SIDE} width={12} />
        <Draw t={t} at={inSq + 0.35} dur={0.5} d={`M ${TR[0]} ${TR[1]} L ${TL[0]} ${TL[1]}`} stroke={SIDE} width={12} />

        {/* the angle wedge (coral) that becomes a right-angle box */}
        {sweep > 0 && wedgeOut > 0 && <path d={wedgePath(V, 92, 0, -th * sweep)} fill={CORNER} opacity={0.75 * wedgeOut} stroke={M.ink} strokeWidth={3} strokeLinejoin="round" />}

        {/* the two sides */}
        <g filter="url(#sq-shadow)">
          <Edge a={aStart} b={aEnd} color={SIDE} w={12} />
          <Edge a={bStart} b={bEnd} color={SIDE} w={12} />
        </g>
        {/* right-angle boxes */}
        {cornersK.map((v, i) => (
          <g key={i} transform={`translate(${v[0]} ${v[1]}) scale(${1 + 0.12 * pulse(t - i * 0.3, 1.6) * idle}) translate(${-v[0]} ${-v[1]})`}>
            <RightMark v={v} u1={dirs[i][0]} u2={dirs[i][1]} size={42} k={i === 0 ? boxK : ease.outBack(progress(t, boxAt[i], 0.35))} />
          </g>
        ))}
        {/* corners */}
        <Pop t={t} at={meet + 0.1} x={V[0]} y={V[1]} bounce={9}>
          <circle cx={V[0]} cy={V[1]} r={16} fill={CORNER} stroke={M.ink} strokeWidth={3.5} />
        </Pop>
        {[BR, TR, TL].map(([x, y], i) => (
          <Pop key={i} t={t} at={inSq + 0.3 + i * 0.25} x={x} y={y} bounce={10}>
            <circle cx={x} cy={y} r={13} fill={CORNER} stroke={M.ink} strokeWidth={3.5} />
          </Pop>
        ))}
        <Burst t={t} at={meet + 0.1} x={V[0]} y={V[1]} color={CORNER} r={60} />
        <Burst t={t} at={sqCorner + 0.6} x={V[0] + 20} y={V[1] - 20} color={M.gold} r={70} />
        <Ring t={t} at={special} x={V[0] + 21} y={V[1] - 21} r={50} color={M.gold} out={right + 0.2} />

        {/* "angle" label beside the wedge */}
        <Fade t={t} at={angleW + 0.2} out={sqCorner + 0.1} dur={0.3}>
          <Kinetic t={t} at={angleW + 0.2} text="angle" x={V[0] + 205} y={V[1] - 58} size={52} color={CORNER_TXT} />
        </Fade>

        {/* right panel: square corner = right angle */}
        {(() => {
          const ib = Math.sin(t * 1.6) * 3 * idle
          return (
            <g transform={`translate(0 ${ib})`}>
              <Kinetic t={t} at={sqCorner + 0.5} text="square corner" x={760} y={200} size={44} />
              <Pop t={t} at={right + 0.1} x={760} y={268}>
                <Title x={760} y={268} size={56} color={M.ink} stroke={M.white}>
                  =
                </Title>
              </Pop>
              <Pop t={t} at={right + 0.3} x={760} y={340}>
                <g filter="url(#sq-shadow)">
                  <rect x={645} y={310} width={230} height={60} rx={30} fill={M.gold} stroke={M.ink} strokeWidth={3} />
                  <Title x={760} y={341} size={34}>
                    right angle
                  </Title>
                </g>
              </Pop>
            </g>
          )
        })()}
      </Camera>
      <Burst t={t} at={right + 0.5} x={760} y={340} color={M.gold} r={90} />
    </>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
const PIZZA_CRUST = '#f2b866'
const PIZZA_CHEESE = '#ffd96a'

/** A hinge angle: base ray along +x from v, second ray at `theta` degrees (counter-clockwise on screen). */
function Hinge({ v, len, theta, color, wedgeR = 70, wedge = 1, box = 0, ghost = 0, width = 10 }: { v: Pt; len: number; theta: number; color: string; wedgeR?: number; wedge?: number; box?: number; ghost?: number; width?: number }) {
  const th = deg(theta)
  const end: Pt = [v[0] + len * Math.cos(th), v[1] - len * Math.sin(th)]
  return (
    <g>
      {ghost > 0.01 && (
        <g opacity={ghost}>
          <line x1={v[0]} y1={v[1]} x2={v[0]} y2={v[1] - len} stroke={RIGHT_TXT} strokeWidth={5} strokeDasharray="12 12" strokeLinecap="round" />
          <path d={polyD([[v[0] + 34, v[1]], [v[0] + 34, v[1] - 34], [v[0], v[1] - 34]], false)} fill="none" stroke={RIGHT_TXT} strokeWidth={4} strokeDasharray="6 7" />
        </g>
      )}
      {wedge > 0.01 && <path d={wedgePath(v, wedgeR, 0, -th)} fill={color} opacity={0.75 * wedge} stroke={M.ink} strokeWidth={3} strokeLinejoin="round" />}
      <g filter="url(#sq-shadow)">
        <Edge a={v} b={[v[0] + len, v[1]]} color={SIDE} w={width} />
        <Edge a={v} b={end} color={SIDE} w={width} />
      </g>
      <RightMark v={v} u1={[1, 0]} u2={[0, -1]} size={34} k={box} />
      <circle cx={v[0]} cy={v[1]} r={width + 3} fill={CORNER} stroke={M.ink} strokeWidth={3.5} />
    </g>
  )
}

/**
 * geometry/angleTypes — "An angle smaller than a right angle is called acute.
 * It is narrow, like the tip of a pizza slice. An angle bigger than a right
 * angle is called obtuse. It opens up wide."
 * A right angle (gold box) leaves a dashed ghost as its side swings in to a
 * narrow mint "acute" angle — a pizza slice drops in and fits it — then swings
 * past the ghost (gold flash) to a wide lilac "obtuse" angle. All three line up.
 */
const angleTypes: Scene = ({ t, cue, reduced }: SceneProps) => {
  const smaller = cue('smaller than')
  const acute = cue('called acute')
  const narrow = cue('narrow')
  const pizza = cue('pizza slice')
  const bigger = cue('bigger than')
  const obtuse = cue('called obtuse')
  const wide = cue('opens up wide')
  const hero = wide + 1.4
  const idle = idleRamp(t, hero + 1.2, reduced)
  const V: Pt = [300, 432]
  const LEN = 320
  const closeAt = Math.max(smaller + 0.5, 1.3)
  const close = ease.inOutCubic(progress(t, closeAt, 0.9))
  const open = ease.inOutCubic(progress(t, bigger + 0.1, 1.1))
  const wideBump = Math.sin(clamp((t - wide) / 0.9) * Math.PI) * (t > wide ? 1 : 0)
  let theta = 90 - 50 * close + 95 * open + 12 * wideBump
  const color = theta < 85 ? ACUTE : theta > 95 ? OBTUSE : mixColor(ACUTE, OBTUSE, (theta - 85) / 10)
  const crossFlash = interpolate(theta, [80, 90, 100], [0, 1, 0]) * (open > 0 && open < 1 ? 1 : 0)
  const box = Math.max(1 - progress(t, closeAt, 0.25), crossFlash)
  const ghost = ease.outCubic(progress(t, closeAt, 0.4)) * (1 - ease.inOutCubic(progress(t, hero - 0.2, 0.4)))
  const wedge = ease.outCubic(progress(t, closeAt + 0.2, 0.6))
  const narrowPulse = interpolate(t, [narrow, narrow + 0.25, narrow + 0.8], [0, 1, 0])
  const sliceK = spring(t, pizza, { stiffness: 190, damping: 14 }) * (1 - ease.inOutCubic(progress(t, bigger - 0.1, 0.35)))

  // hero: the big hinge flies into the obtuse slot, acute + right pop in beside it
  const fly = ease.inOutCubic(progress(t, hero, 0.9))
  const SL = 185
  const slots = [
    { v: [80, 335] as Pt, theta: 40, color: ACUTE, txt: ACUTE_TXT, name: 'acute', cap: 'smaller', cx: 172 },
    { v: [400, 335] as Pt, theta: 90, color: M.gold, txt: RIGHT_TXT, name: 'right', cap: 'square corner', cx: 492 },
    { v: [750, 335] as Pt, theta: 135, color: OBTUSE, txt: OBTUSE_TXT, name: 'obtuse', cap: 'bigger', cx: 777 },
  ]
  if (fly > 0) theta = lerp(theta, 135, fly)
  const v = lerpPt(V, slots[2].v, fly)
  const len = lerp(LEN, SL, fly)
  const bob = (i: number) => Math.sin(t * 1.6 + i * 1.3) * 4 * idle

  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 470, y: 280, zoom: 1.03 },
          { at: acute, x: 480, y: 270, zoom: 1 },
        ]}
      >
        {/* pizza slice fits the acute angle */}
        {sliceK > 0.01 && (
          <g transform={`translate(${V[0]} ${V[1]}) scale(${sliceK}) translate(${-V[0]} ${-V[1]})`} opacity={clamp(sliceK * 1.5)}>
            <path d={wedgePath(V, 255, 0, -deg(40))} fill={PIZZA_CRUST} stroke={M.ink} strokeWidth={4} strokeLinejoin="round" />
            <path d={wedgePath(V, 218, 0, -deg(40))} fill={PIZZA_CHEESE} />
            {[
              [125, 11],
              [185, 12],
              [165, 29],
            ].map(([r, a], i) => (
              <circle key={i} cx={V[0] + r * Math.cos(deg(a))} cy={V[1] - r * Math.sin(deg(a))} r={13} fill={M.coral} stroke={M.ink} strokeWidth={2} />
            ))}
          </g>
        )}
        <g transform={`translate(0 ${bob(2)})`}>
          <Hinge v={v} len={len} theta={theta} color={fly > 0.5 ? OBTUSE : color} wedgeR={lerp(100 + 14 * narrowPulse, 58, fly)} wedge={sliceK > 0.6 ? 0 : wedge} box={fly > 0 ? 0 : box} ghost={ghost} width={lerp(10, 8, fly)} />
        </g>
        <Pop t={t} at={0.35} x={V[0] + 60} y={V[1] - LEN - 34} out={closeAt + 0.2}>
          <Title x={V[0] + 60} y={V[1] - LEN - 34} size={30} color={RIGHT_TXT} stroke={M.white}>
            right angle
          </Title>
        </Pop>
        <Burst t={t} at={bigger + 0.1 + 0.55} x={V[0] + 20} y={V[1] - 20} color={M.gold} r={60} />

        {/* right panel labels */}
        <Fade t={t} at={acute - 0.05} out={bigger} dur={0.3}>
          <Kinetic t={t} at={acute} text="acute" x={745} y={190} size={72} color={ACUTE_TXT} />
          <Fade t={t} at={acute + 0.4}>
            <Title x={745} y={258} size={24} color={M.inkSoft}>
              smaller than a right angle
            </Title>
          </Fade>
        </Fade>
        <Fade t={t} at={obtuse - 0.05} out={hero - 0.1} dur={0.3}>
          <Kinetic t={t} at={obtuse} text="obtuse" x={745} y={190} size={72} color={OBTUSE_TXT} />
          <Fade t={t} at={obtuse + 0.4}>
            <Title x={745} y={258} size={24} color={M.inkSoft}>
              bigger than a right angle
            </Title>
          </Fade>
        </Fade>

        {/* hero line-up */}
        {slots.slice(0, 2).map((s, i) => (
          <Pop key={s.name} t={t} at={hero + 0.5 + i * 0.18} x={s.v[0] + 60} y={s.v[1] - 60}>
            <g transform={`translate(0 ${bob(i)})`}>
              <Hinge v={s.v} len={SL} theta={s.theta} color={s.color} wedgeR={58} box={i === 1 ? 1 : 0} wedge={i === 1 ? 0 : 1} width={8} />
            </g>
          </Pop>
        ))}
        {slots.map((s, i) => (
          <Fade key={s.name} t={t} at={hero + 0.7 + i * 0.18}>
            <g transform={`translate(0 ${bob(i)})`}>
              <Title x={s.cx} y={402} size={42} color={s.txt} stroke={M.white}>
                {s.name}
              </Title>
              <Title x={s.cx} y={446} size={24} color={M.inkSoft}>
                {s.cap}
              </Title>
            </g>
          </Fade>
        ))}
      </Camera>
    </>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
/** A straight line with an arrowhead at each end ("goes on forever"). */
function InfLine({ a, b, color, k = 1, w = 9 }: { a: Pt; b: Pt; color: string; k?: number; w?: number }) {
  if (k <= 0.001) return null
  const m = mid(a, b)
  const A = lerpPt(m, a, k)
  const B = lerpPt(m, b, k)
  const ang = Math.atan2(B[1] - A[1], B[0] - A[0])
  const head = (p: Pt, dir: number) => {
    const h = 20
    const x1 = p[0] - dir * h * Math.cos(ang - 0.55)
    const y1 = p[1] - dir * h * Math.sin(ang - 0.55)
    const x2 = p[0] - dir * h * Math.cos(ang + 0.55)
    const y2 = p[1] - dir * h * Math.sin(ang + 0.55)
    return `M ${x1} ${y1} L ${p[0]} ${p[1]} L ${x2} ${y2}`
  }
  return (
    <g>
      {[M.ink, color].map((c, i) => (
        <g key={i}>
          <line x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={c} strokeWidth={i ? w : w + 6} strokeLinecap="round" />
          <path d={head(B, 1)} fill="none" stroke={c} strokeWidth={i ? w : w + 6} strokeLinecap="round" strokeLinejoin="round" />
          <path d={head(A, -1)} fill="none" stroke={c} strokeWidth={i ? w : w + 6} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
    </g>
  )
}

/** Rotate point p about c by `a` radians. */
const rot = (p: Pt, c: Pt, a: number): Pt => [c[0] + (p[0] - c[0]) * Math.cos(a) - (p[1] - c[1]) * Math.sin(a), c[1] + (p[0] - c[0]) * Math.sin(a) + (p[1] - c[1]) * Math.cos(a)]

/**
 * geometry/lines — "Lines that run side by side and never cross are called
 * parallel, like train tracks. Lines that cross to make square corners are
 * called perpendicular, like a plus sign."
 * Two lines race side by side (equal-gap markers show they never get closer);
 * railway ties drop between them and a little cart rolls along. Then one line
 * swings round to cross the other: four gold square corners pop — a plus sign.
 */
const lines: Scene = ({ t, cue, reduced }: SceneProps) => {
  const run = cue('side by side')
  const never = cue('never cross')
  const parallel = cue('called parallel')
  const tracks = cue('train tracks')
  const cross = cue('lines that cross')
  const corners = cue('square corners')
  const perp = cue('called perpendicular')
  const plus = cue('plus sign')
  const hero = plus + 1.3
  const idle = idleRamp(t, hero + 1.2, reduced)
  const BLUE = SIDE
  const RED = M.coral
  // parallel layout
  const X0 = 110
  const X1 = 590
  const Y1 = 195
  const Y2 = 335
  // perpendicular layout (cross at C)
  const C: Pt = [350, 268]
  const HL = 200
  const sw = ease.inOutCubic(progress(t, cross, 1.1))
  const drawK = ease.inOutCubic(progress(t, 0.2, 0.9))
  // line 1 (blue): slides to the middle and shortens
  const l1y = lerp(Y1, C[1], sw)
  const l1a: Pt = [lerp(X0, C[0] - HL, sw), l1y]
  const l1b: Pt = [lerp(X1, C[0] + HL, sw), l1y]
  // line 2 (coral): rotates 90° about its moving middle
  const c2: Pt = [lerp((X0 + X1) / 2, C[0], sw), lerp(Y2, C[1], sw)]
  const half2 = lerp((X1 - X0) / 2, HL, sw)
  const a2 = deg(90) * sw
  const l2a = rot([c2[0] - half2, c2[1]], c2, a2)
  const l2b = rot([c2[0] + half2, c2[1]], c2, a2)
  // hero: shrink the cross to the right, mini parallel lines pop on the left
  const fly = ease.inOutCubic(progress(t, hero, 0.9))
  const heroT = (p: Pt): Pt => [lerp(p[0], 720 + (p[0] - C[0]) * 0.62, fly), lerp(p[1], 225 + (p[1] - C[1]) * 0.62, fly)]
  const runner = ease.inOutSine(progress(t, run, 1.5))
  const tieOut = 1 - progress(t, cross - 0.3, 0.3)
  const cart = ease.inOutCubic(progress(t, tracks + 0.5, 1.6))
  const plusPulse = interpolate(t, [plus, plus + 0.2, plus + 0.7], [0, 1, 0])
  const ib = (i: number) => Math.sin(t * 1.6 + i) * 3 * idle

  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 440, y: 268, zoom: 1.05 },
          { at: parallel, x: 480, y: 270, zoom: 1 },
        ]}
      >
        {/* railway ties between the parallel lines (they drop in, left to right) */}
        {tieOut > 0 &&
          Array.from({ length: 12 }, (_, i) => {
            const x = X0 + 30 + i * 38
            const k = ease.outBack(progress(t, tracks + i * 0.05, 0.35))
            if (k <= 0.01) return null
            const h = (Y2 - Y1 + 40) * k
            return <rect key={i} x={x - 9} y={(Y1 + Y2) / 2 - h / 2} width={18} height={h} rx={4} fill={M.wood} stroke={M.ink} strokeWidth={3} opacity={tieOut * clamp(k * 2)} />
          })}
        {/* a little cart rolling along the track */}
        {cart > 0 && cart < 1 && tieOut > 0 && (
          <g transform={`translate(${lerp(X0 - 40, X1 + 60, cart)} ${(Y1 + Y2) / 2})`} opacity={clamp(Math.min(cart, 1 - cart) * 8)}>
            <rect x={-56} y={-86} width={112} height={172} rx={20} fill={M.gold} stroke={M.ink} strokeWidth={4} filter="url(#sq-shadow)" />
            <rect x={-40} y={-66} width={80} height={132} rx={12} fill={M.coral} stroke={M.ink} strokeWidth={3} />
            <rect x={-26} y={-48} width={52} height={36} rx={8} fill={M.sky} stroke={M.ink} strokeWidth={3} />
            <rect x={-26} y={12} width={52} height={36} rx={8} fill={M.sky} stroke={M.ink} strokeWidth={3} />
          </g>
        )}
        {/* equal-gap markers: the lines stay the same distance apart */}
        {[0, 1, 2].map((i) => {
          const x = X0 + 80 + i * 160
          const k = ease.outBack(progress(t, never + i * 0.2, 0.4)) * (1 - progress(t, tracks - 0.1, 0.3))
          if (k <= 0.01) return null
          const y0 = Y1 + 14
          const y1 = Y2 - 14
          return (
            <g key={i} opacity={clamp(k)}>
              <line x1={x} y1={lerp((y0 + y1) / 2, y0, k)} x2={x} y2={lerp((y0 + y1) / 2, y1, k)} stroke={M.inkSoft} strokeWidth={4} strokeDasharray="8 8" />
              <path d={`M ${x - 9} ${y0 + 10} L ${x} ${y0} L ${x + 9} ${y0 + 10} M ${x - 9} ${y1 - 10} L ${x} ${y1} L ${x + 9} ${y1 - 10}`} fill="none" stroke={M.inkSoft} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )
        })}
        {/* four square corners at the crossing (under the lines, which split them) */}
        {(
          [
            [[1, 0], [0, -1]],
            [[0, -1], [-1, 0]],
            [[-1, 0], [0, 1]],
            [[0, 1], [1, 0]],
          ] as [Pt, Pt][]
        ).map(([u1, u2], i) => (
          <RightMark key={i} v={heroT(C)} u1={u1} u2={u2} size={lerp(34, 24, fly) * (1 + 0.15 * plusPulse)} k={ease.outBack(progress(t, corners + i * 0.18, 0.35))} width={lerp(4, 3, fly)} />
        ))}
        {/* the two lines */}
        <g filter="url(#sq-shadow)">
          <InfLine a={heroT(l2a)} b={heroT(l2b)} color={RED} k={drawK} w={lerp(9, 7, fly)} />
          <InfLine a={heroT(l1a)} b={heroT(l1b)} color={BLUE} k={drawK} w={lerp(9, 7, fly)} />
        </g>
        {/* runners racing side by side */}
        {runner > 0 && runner < 1 && sw === 0 && (
          <g opacity={clamp(Math.min(runner, 1 - runner) * 6)}>
            {[Y1, Y2].map((y) => {
              const x = lerp(X0 + 20, X1 - 20, runner)
              return (
                <g key={y}>
                  <line x1={Math.max(X0, x - 90)} y1={y} x2={x} y2={y} stroke={M.white} strokeWidth={7} strokeLinecap="round" opacity={0.8} />
                  <circle cx={x} cy={y} r={16} fill={M.gold} stroke={M.ink} strokeWidth={4} />
                </g>
              )
            })}
          </g>
        )}
        <Burst t={t} at={plus} x={C[0]} y={C[1]} color={M.gold} r={110} rays={12} />
        <Fade t={t} at={corners + 0.1} out={hero}>
          <circle cx={C[0]} cy={C[1]} r={9} fill={M.ink} />
        </Fade>

        {/* labels */}
        <Fade t={t} at={parallel} out={cross} dur={0.3}>
          <Kinetic t={t} at={parallel} text="parallel" x={775} y={250} size={60} color={SIDE_TXT} />
          <Fade t={t} at={parallel + 0.4}>
            <Title x={775} y={312} size={26} color={M.inkSoft}>
              never cross
            </Title>
          </Fade>
        </Fade>
        <Fade t={t} at={perp} out={hero - 0.1} dur={0.3}>
          <Kinetic t={t} at={perp} text="perpendicular" x={770} y={250} size={44} color={CORNER_TXT} />
          <Fade t={t} at={perp + 0.4}>
            <Title x={770} y={306} size={24} color={M.inkSoft}>
              cross at square corners
            </Title>
          </Fade>
        </Fade>
        {/* hero: parallel mini on the left */}
        <Pop t={t} at={hero + 0.45} x={240} y={225}>
          <g transform={`translate(0 ${ib(0)})`} filter="url(#sq-shadow)">
            <InfLine a={[110, 180]} b={[370, 180]} color={BLUE} w={7} />
            <InfLine a={[110, 270]} b={[370, 270]} color={RED} w={7} />
          </g>
        </Pop>
        <Fade t={t} at={hero + 0.6}>
          <g transform={`translate(0 ${ib(0)})`}>
            <Title x={240} y={400} size={40} color={SIDE_TXT} stroke={M.white}>
              parallel
            </Title>
            <Title x={240} y={442} size={24} color={M.inkSoft}>
              never cross
            </Title>
          </g>
        </Fade>
        <Fade t={t} at={hero + 0.75}>
          <g transform={`translate(0 ${ib(1)})`}>
            <Title x={720} y={400} size={40} color={CORNER_TXT} stroke={M.white}>
              perpendicular
            </Title>
            <Title x={720} y={442} size={24} color={M.inkSoft}>
              square corners
            </Title>
          </g>
        </Fade>
      </Camera>
    </>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
/**
 * geometry/count (a check: "How many sides does a square have?") — "Let us check
 * what you remember about a square. Think about its straight edges and count
 * them carefully."
 * A thinking "?" pops; a pencil draws a square; a shine runs along each straight
 * edge, then a finger taps each edge in turn (it turns blue) — no numbers, so the
 * counting is the child's. The taps keep cycling gently while they answer.
 */
const count: Scene = ({ t, cue, reduced }: SceneProps) => {
  const check = cue('let us check')
  const sq = cue('about a square')
  const edges = cue('straight edges')
  const countC = cue('count them')
  const C: Pt = [360, 268]
  const S = 240
  const P = squarePts(C, S)
  const tapAt = (i: number) => countC + 0.2 + i * 0.6
  const loopFrom = tapAt(3) + 2
  const idle = idleRamp(t, loopFrom - 1, reduced)
  // after the first pass the taps repeat gently: blue fades, then 4 taps again
  const cycle = 6
  const looping = t >= loopFrom && !reduced
  const ph = looping ? (t - loopFrom) % cycle : 0
  const lt = looping ? tapAt(0) + (ph - 0.9) : t
  const tapped = (i: number) => {
    if (reduced) return 1
    if (looping && ph < 0.5) return 1 - ease.inOutSine(ph / 0.5)
    return ease.outCubic(progress(lt, tapAt(i), 0.25))
  }
  const shineK = (i: number) => interpolate(t, [edges + i * 0.18, edges + i * 0.18 + 0.15, edges + i * 0.18 + 0.6], [0, 1, 0])
  // finger position: hops to each edge's middle
  let finger: Pt | null = null
  let press = 0
  for (let i = 0; i < 4; i++) {
    const at = tapAt(i)
    if (lt >= at - 0.35 && lt < at + 0.45) {
      const m = mid(P[i], P[(i + 1) % 4])
      const o = outward(P[i], P[(i + 1) % 4], C)
      const from: Pt = i === 0 ? [m[0] + 30, m[1] - 120] : (() => {
        const pm = mid(P[i - 1], P[i])
        return pm
      })()
      const k = ease.inOutCubic(progress(lt, at - 0.35, 0.35))
      finger = lerpPt(from, [m[0] + o[0] * 2, m[1] + o[1] * 2], k)
      press = interpolate(lt, [at - 0.05, at, at + 0.2], [0, 1, 0])
    }
  }
  const qBob = Math.sin(t * 2.2) * 5

  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 480, y: 270, zoom: 1 },
          { at: edges, x: 420, y: 270, zoom: 1.08 },
        ]}
      >
        <Backdrop t={t} at={0.3} x={C[0]} y={C[1]} r={215} reduced={reduced} />
        <g filter="url(#sq-shadow)">
          <BuiltPolygon t={t} pts={P} w={12} at={sq} dur={1.4} fillAt={sq + 1.0} colorOf={(i) => (i < 0 ? M.ink : mixColor(M.ink, SIDE, tapped(i)))} glowOf={shineK} />
        </g>
        {P.map(([x, y], i) => (
          <Pop key={i} t={t} at={sq + 1.3 + i * 0.08} x={x} y={y} bounce={10}>
            <circle cx={x} cy={y} r={11} fill={CORNER} stroke={M.ink} strokeWidth={3} />
          </Pop>
        ))}
        {/* tap ripples */}
        {P.map((p, i) => {
          const m = mid(p, P[(i + 1) % 4])
          const k = progress(lt, tapAt(i), 0.6)
          if (k <= 0 || k >= 1 || reduced) return null
          return <circle key={i} cx={m[0]} cy={m[1]} r={12 + 40 * ease.outCubic(k)} fill="none" stroke={SIDE_TXT} strokeWidth={5 * (1 - k)} opacity={1 - k} />
        })}
        {finger && !reduced && (
          <g transform={`translate(${finger[0]} ${finger[1] + 4 * press})`}>
            <circle cx={0} cy={0} r={17 - 3 * press} fill={M.pink} stroke={M.ink} strokeWidth={4} filter="url(#sq-shadow)" />
            <circle cx={-5} cy={-5} r={4} fill={M.white} opacity={0.7} />
          </g>
        )}
        {/* the thinking bubble */}
        <Pop t={t} at={check + 0.3} x={720} y={215}>
          <g transform={`translate(0 ${qBob * (1 - 0.5 * idle)})`} filter="url(#sq-shadow)">
            <circle cx={640} cy={330} r={12} fill={M.white} stroke={M.ink} strokeWidth={3} />
            <circle cx={612} cy={366} r={7} fill={M.white} stroke={M.ink} strokeWidth={3} />
            <circle cx={720} cy={215} r={92} fill={M.white} stroke={M.ink} strokeWidth={4} />
            <g transform={`rotate(${Math.sin(t * 2.6) * 7} 720 215)`}>
              <Title x={720} y={220} size={120} color={M.gold} stroke={M.ink}>
                ?
              </Title>
            </g>
          </g>
        </Pop>
      </Camera>
      <Kinetic t={t} at={countC + 0.1} text="count them carefully" x={480} y={482} size={40} color={SIDE_TXT} />
    </>
  )
}

export const geometryScenes: Record<string, Scene> = { shapes, family, angles, angleTypes, lines, count }
