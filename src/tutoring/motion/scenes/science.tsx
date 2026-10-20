/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import type { ReactNode } from 'react'
import { ease, interpolate, mixColor, progress, pulse, spring } from '../anim'
import { Burst, Camera, Draw, Kinetic, Paper } from '../kit'
import { M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { Cloud, Drop, Fox, Leaf, Pot, Sun, jarPath, shade } from './_b3art'
import { Head, Scale, Sparkles, Tick, Twinkle, Txt, arc, ep, popS, rand, textW } from './_b3kit'

// ── states of matter: three jars of particles ────────────────────────────────
const JAR_Y = 452
const JARS = [
  { x: 172, label: 'solid', color: M.coral, caption: 'keeps its shape' },
  { x: 480, label: 'liquid', color: '#4aa6d6', caption: 'takes the cup’s shape' },
  { x: 788, label: 'gas', color: '#5cc49a', caption: 'fills all the space' },
]
const JAR_W = 190
const JAR_H = 236
const PR = 12 // particle radius

/** A particle: a shaded ball with a highlight. */
function Ball({ x, y, r = PR, color, opacity }: { x: number; y: number; r?: number; color: string; opacity?: number }) {
  // (dozens of these on screen: no wrapper group unless it fades, and fill-opacity,
  // which draws the same as opacity on a fill-only shape without a compositing pass)
  const ball = (
    <>
      <circle cx={x} cy={y} r={r} fill={color} stroke={M.ink} strokeWidth={2.5} />
      <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.3} fill="#fff" fillOpacity={0.6} />
    </>
  )
  return opacity === undefined ? ball : <g opacity={opacity}>{ball}</g>
}

/** Glass jar outline drawn on top of its contents (contents are clipped to the inside). */
function JarGlass({ x, w, h, id, lid = 0, children }: { x: number; w: number; h: number; id: string; lid?: number; children?: ReactNode }) {
  const d = jarPath(x, JAR_Y, w, h)
  return (
    <>
      <defs>
        <clipPath id={id}>
          <path d={d} />
        </clipPath>
      </defs>
      <path d={d} fill={M.sky} opacity={0.55} />
      <g clipPath={`url(#${id})`}>{children}</g>
      <path d={d} fill="none" stroke={M.ink} strokeWidth={4.5} strokeLinejoin="round" />
      <path d={`M ${x - w / 2 + 16} ${JAR_Y - h + 36} L ${x - w / 2 + 16} ${JAR_Y - 44}`} stroke="#fff" strokeWidth={7} strokeLinecap="round" opacity={0.75} />
      {lid > 0 && (
        <g transform={`translate(0 ${(1 - lid) * -60})`} opacity={Math.min(1, lid * 2)}>
          <rect x={x - w / 2 - 14} y={JAR_Y - h - 22} width={w + 28} height={26} rx={9} fill={M.wood} stroke={M.ink} strokeWidth={4} />
          <rect x={x - 18} y={JAR_Y - h - 34} width={36} height={14} rx={6} fill={M.wood} stroke={M.ink} strokeWidth={3.5} />
        </g>
      )}
    </>
  )
}

/** The beaker that pours the liquid: centre (x, y), tipping left by `tilt` (0..1). */
const BEAKER: [number, number] = [JARS[1].x + 110, JAR_Y - JAR_H - 94]
const BEAKER_TIP = -105 // degrees at full tilt
/** Where the beaker's lip ends up at full tilt (the stream starts here). */
const SPOUT: [number, number] = (() => {
  const a = (BEAKER_TIP * Math.PI) / 180
  const [lx, ly] = [-30, -42]
  return [BEAKER[0] + lx * Math.cos(a) - ly * Math.sin(a), BEAKER[1] + lx * Math.sin(a) + ly * Math.cos(a)]
})()
function Beaker({ x, y, tilt, level, color }: { x: number; y: number; tilt: number; level: number; color: string }) {
  const lv = Math.max(0, level)
  return (
    <g transform={`rotate(${BEAKER_TIP * ease.inOutCubic(tilt)} ${x} ${y})`} opacity={Math.min(1, tilt * 4)}>
      {lv > 0.02 && <rect x={x - 26} y={y + 40 - 72 * lv} width={52} height={72 * lv} rx={6} fill={color} opacity={0.7} />}
      <path d={`M ${x - 36} ${y - 44} L ${x - 30} ${y - 42} L ${x - 30} ${y + 34} Q ${x - 30} ${y + 44} ${x - 20} ${y + 44} L ${x + 20} ${y + 44} Q ${x + 30} ${y + 44} ${x + 30} ${y + 34} L ${x + 30} ${y - 44}`} fill={M.sky} fillOpacity={0.4} stroke={M.ink} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
      {[-14, 2, 18].map((dy) => (
        <line key={dy} x1={x + 14} y1={y + dy} x2={x + 30} y2={y + dy} stroke={M.ink} strokeWidth={3} />
      ))}
    </g>
  )
}

/** A label that types itself above a jar, with the state's colour as an underline. */
function JarLabel({ t, at, x, text, color }: { t: number; at: number; x: number; text: string; color: string }) {
  return (
    <>
      <Kinetic t={t} at={at} text={text} x={x} y={JAR_Y - JAR_H - 66} size={44} color={M.ink} />
      <Draw t={t} at={at + 0.2} dur={0.4} d={`M ${x - 54} ${JAR_Y - JAR_H - 36} L ${x + 54} ${JAR_Y - JAR_H - 36}`} stroke={color} width={7} />
    </>
  )
}

/**
 * science/states — "Matter comes in three states: solid, liquid, and gas. A
 * solid keeps its own shape. A liquid flows and takes the shape of whatever cup
 * you pour it into. A gas spreads out to fill all the space it can."
 * Three glass jars, three ways particles behave. The camera visits each: a
 * solid block drops in and stays a block (jiggling in place); a liquid pours in
 * from a beaker, settles flat, and when the jar morphs wide and short it
 * flows to take the new shape; a puff of gas under a lid spreads out until it
 * fills the whole jar, particles zipping about.
 */
const states: Scene = ({ t, cue }: SceneProps) => {
  const three = cue('three states')
  const lSolid = cue('solid,')
  const lLiquid = cue('liquid,')
  const lGas = cue('gas.')
  const solid = cue('A solid keeps')
  const ownShape = cue('own shape')
  const liquid = cue('A liquid flows')
  const takes = cue('takes the shape')
  const cup = cue('whatever cup')
  const gas = cue('A gas spreads')
  const fill = cue('fill all the space')
  const done = cue('it can') + 0.8

  // ── solid: a 5×5 block drops in, bounces, keeps its shape
  const sDrop = spring(t, solid + 0.15, { stiffness: 200, damping: 11 })
  const sBlock = { x: JARS[0].x, bottom: JAR_Y - 8 }
  const tilt = Math.sin(Math.PI * progress(t, ownShape - 0.1, 1.2)) * 12 * Math.sin(Math.max(0, t - ownShape) * 9)

  // ── liquid: 36 particles pour in, then re-pack when the jar morphs wide
  const LN = 36
  const pourAt = liquid + 0.35
  const morph = ep(t, cup + 0.1, 1.0, ease.inOutCubic)
  const lw = JAR_W + (290 - JAR_W) * morph
  const lh = JAR_H + (170 - JAR_H) * morph
  const slot = (i: number, cols: number, w: number) => {
    const c = i % cols
    const r = Math.floor(i / cols)
    const x0 = JARS[1].x - ((cols - 1) * (PR * 2 + 1)) / 2
    return [x0 + c * (PR * 2 + 1) + (r % 2 ? PR * 0.5 : 0) * (w > 0 ? 1 : 1), JAR_Y - 8 - PR - r * (PR * 1.8)] as [number, number]
  }
  const beakerTilt = ep(t, liquid, 0.4) * (1 - ep(t, pourAt + LN * 0.045 + 0.2, 0.4))

  // ── gas: a puff under the lid spreads out to fill the jar
  const GN = 16
  const gasIn = ep(t, gas - 0.2, 0.3)
  const spread = ep(t, gas + 0.4, 1.6, ease.inOutCubic)

  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 480, y: 270, zoom: 1 },
          { at: solid + 0.3, x: 260, y: 296, zoom: 1.28 },
          { at: ownShape + 1.0, x: 260, y: 296, zoom: 1.28 },
          { at: liquid + 0.5, x: 480, y: 280, zoom: 1.2 },
          { at: cup + 1.4, x: 480, y: 290, zoom: 1.2 },
          { at: gas + 0.5, x: 700, y: 296, zoom: 1.28 },
          { at: done, x: 480, y: 270, zoom: 1 },
        ]}
      >
        <Kinetic t={t} at={0.15} text="Matter" x={480} y={46} size={40} color={M.inkSoft} />
        {/* three jars */}
        {JARS.map((j, i) => {
          const s = popS(t, three + i * 0.18, 12)
          const isLiquid = i === 1
          const w = isLiquid ? lw : JAR_W
          const h = isLiquid ? lh : JAR_H
          return (
            <Scale key={i} s={s} x={j.x} y={JAR_Y - JAR_H / 2} rot={i === 0 ? tilt : 0}>
              <JarGlass x={j.x} w={w} h={h} id={`sq-b3-jar-${i}`} lid={i === 2 ? ep(t, gas - 0.5, 0.5, ease.outBack) : 0}>
                {i === 0 && sDrop > 0 && (
                  <g transform={`translate(0 ${(1 - Math.min(1, sDrop)) * -300})`}>
                    <rect x={sBlock.x - 70} y={sBlock.bottom - 140} width={140} height={140} rx={14} fill={j.color} opacity={0.25} />
                    {/* "same shape": its outline is traced and stays put as the jar rocks */}
                    <Draw t={t} at={ownShape} dur={0.8} d={`M ${sBlock.x - 76} ${sBlock.bottom - 146} L ${sBlock.x + 76} ${sBlock.bottom - 146} L ${sBlock.x + 76} ${sBlock.bottom + 2} L ${sBlock.x - 76} ${sBlock.bottom + 2} Z`} stroke={M.coral} width={4} dash="9 8" />
                    {Array.from({ length: 25 }, (_, k) => {
                      const c = k % 5
                      const r = Math.floor(k / 5)
                      const jx = Math.sin(t * 16 + k * 1.7) * 1.4
                      const jy = Math.cos(t * 14 + k * 2.3) * 1.4
                      return <Ball key={k} x={sBlock.x - 52 + c * 26 + jx} y={sBlock.bottom - 18 - r * 26 + jy} color={j.color} />
                    })}
                  </g>
                )}
                {isLiquid && (
                  <>
                    {/* the liquid body: fills the jar up to its level, whatever its shape */}
                    {(() => {
                      const landed = Array.from({ length: LN }, (_, k) => t > pourAt + k * 0.045 + 0.35).filter(Boolean).length
                      const rowsA = Math.ceil(landed / 6)
                      const rowsB = Math.ceil(landed / 10)
                      const rows = rowsA + (rowsB - rowsA) * morph
                      const top = JAR_Y - 8 - rows * PR * 1.8 - 2 + Math.sin(t * 2.4) * 1.5
                      return landed > 0 ? <rect x={j.x - lw / 2} y={top} width={lw} height={JAR_Y - top} fill={j.color} opacity={0.3} /> : null
                    })()}
                    {Array.from({ length: LN }, (_, k) => {
                      const land = pourAt + k * 0.045 + 0.35
                      const fall = progress(t, pourAt + k * 0.045, 0.35)
                      if (fall <= 0) return null
                      const a = slot(k, 6, 0)
                      const b = slot(k, 10, 1)
                      const mk = ep(t, cup + 0.1 + (k % 10) * 0.02, 0.9, ease.inOutCubic)
                      let x = a[0] + (b[0] - a[0]) * mk + Math.sin(t * 2 + k) * 2
                      let y = a[1] + (b[1] - a[1]) * mk + Math.cos(t * 2.6 + k * 1.3) * 1.5
                      if (t < land) {
                        // falling from the spout
                        const sx = SPOUT[0]
                        const sy = SPOUT[1]
                        x = sx + (x - sx) * fall * fall * fall
                        y = sy + (y - sy) * fall * fall
                      }
                      return <Ball key={k} x={x} y={y} color={j.color} />
                    })}
                  </>
                )}
                {i === 2 &&
                  gasIn > 0 &&
                  Array.from({ length: GN }, (_, k) => {
                    const r0 = rand(k + 3) * 30
                    const a0 = rand(k + 9) * Math.PI * 2
                    const px = j.x + Math.cos(a0) * r0
                    const py = JAR_Y - 40 + Math.sin(a0) * r0 * 0.6
                    const gx = j.x - 66 + (k % 4) * 44 + (rand(k * 5) - 0.5) * 20
                    const gy = JAR_Y - 40 - Math.floor(k / 4) * 50 + (rand(k * 7) - 0.5) * 18
                    const wx = Math.sin(t * (1.6 + rand(k) * 1.4) + k) * 20 * spread
                    const wy = Math.cos(t * (1.3 + rand(k + 1) * 1.6) + k * 2) * 16 * spread
                    return <Ball key={k} x={px + (gx - px) * spread + wx} y={py + (gy - py) * spread + wy} color={j.color} opacity={gasIn} />
                  })}
              </JarGlass>
            </Scale>
          )
        })}
        {/* the pouring beaker */}
        {beakerTilt > 0.01 && <Beaker x={BEAKER[0]} y={BEAKER[1]} tilt={beakerTilt} level={1 - ep(t, pourAt, LN * 0.045 + 0.2, ease.linear)} color={JARS[1].color} />}
        {t > pourAt && t < pourAt + LN * 0.045 + 0.1 && (
          <path d={`M ${SPOUT[0]} ${SPOUT[1]} Q ${SPOUT[0] - 6} ${SPOUT[1] + 110} ${JARS[1].x + 16} ${JAR_Y - 46}`} fill="none" stroke={JARS[1].color} strokeWidth={9} strokeLinecap="round" opacity={0.45} />
        )}
        {/* labels + captions */}
        <JarLabel t={t} at={lSolid} x={JARS[0].x} text="solid" color={JARS[0].color} />
        <JarLabel t={t} at={lLiquid} x={JARS[1].x} text="liquid" color={JARS[1].color} />
        <JarLabel t={t} at={lGas} x={JARS[2].x} text="gas" color={JARS[2].color} />
        {[ownShape + 0.2, takes + 0.6, fill + 0.3].map((at, i) => (
          <g key={i}>
            <Kinetic t={t} at={at} text={JARS[i].caption} x={JARS[i].x - 10} y={JAR_Y + 40} size={24} color={shade(JARS[i].color, 0.35)} stroke={M.paper} />
            <Tick t={t} at={at + 0.5} x={JARS[i].x + textHalf(JARS[i].caption) + 8} y={JAR_Y + 40} s={0.7} color={M.leaf} width={6} />
          </g>
        ))}
        <Sparkles t={t} at={fill + 0.2} x={JARS[2].x} y={JAR_Y - JAR_H / 2} r={110} n={8} seed={4} />
        <Burst t={t} at={solid + 0.45} x={JARS[0].x} y={JAR_Y - 10} color={M.gold} r={70} />
        <Twinkle t={t} at={done} x={JARS[0].x + 96} y={JAR_Y - JAR_H} r={10} />
        <Twinkle t={t} at={done} x={JARS[2].x - 100} y={JAR_Y - 30} r={9} phase={0.5} color={M.pink} />
      </Camera>
    </>
  )
}

/** Half the width of a 24px caption (for placing its tick). */
function textHalf(s: string) {
  return textW(s, 24) / 2
}

// ── water: one drop, three states ────────────────────────────────────────────
type P = [number, number]
const SHAPE_N = 48
/** Unit outlines (radius ~1, starting at 12 o'clock, clockwise) the mascot morphs between. */
const SHAPES: Record<'drop' | 'cube' | 'cloud', P[]> = (() => {
  const make = (f: (u: number) => P) => Array.from({ length: SHAPE_N }, (_, i) => f((i / SHAPE_N) * Math.PI * 2))
  const sp = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e)
  return {
    drop: make((u) => [1.02 * Math.sin(u) * Math.sin(u / 2), -1.08 * Math.cos(u) + 0.08]),
    cube: make((u) => [0.86 * sp(Math.sin(u), 2 / 7), -0.86 * sp(Math.cos(u), 2 / 7)]),
    cloud: make((u) => {
      const r = 1 + 0.11 * Math.cos(7 * u)
      return [1.18 * r * Math.sin(u), -0.78 * r * Math.cos(u)]
    }),
  }
})()

/** Smooth closed path through points (Catmull-Rom → cubic Bézier). */
function smoothClosed(pts: P[]): string {
  const n = pts.length
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    d += ` C ${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return `${d} Z`
}

const ICE = '#c5ecff'
const WATER = '#6cc7ea'
const STEAM = '#f6f8fc'

/**
 * The water mascot: a blob that morphs between shapes `a` → `b` by `k`, with
 * a face. `mood`: 0 cold (shivery wavy mouth), 1 happy, 2 dreamy (closed eyes).
 */
function Blob({ x, y, R, a, b, k, color, mood, t }: { x: number; y: number; R: number; a: keyof typeof SHAPES; b: keyof typeof SHAPES; k: number; color: string; mood: number; t: number }) {
  const A = SHAPES[a]
  const B = SHAPES[b]
  const pts = A.map(([ax, ay], i) => [x + (ax + (B[i][0] - ax) * k) * R, y + (ay + (B[i][1] - ay) * k) * R] as P)
  const shiver = mood < 0.5 ? Math.sin(t * 40) * 1.2 : 0
  const ey = y + R * 0.08
  const closed = mood > 1.5
  return (
    <g transform={`translate(${shiver} 0)`}>
      <path d={smoothClosed(pts)} fill={color} stroke={M.ink} strokeWidth={4.5} strokeLinejoin="round" />
      <ellipse cx={x - R * 0.36} cy={y - R * 0.3} rx={R * 0.14} ry={R * 0.24} fill="#fff" opacity={0.7} transform={`rotate(20 ${x - R * 0.36} ${y - R * 0.3})`} />
      {closed ? (
        <>
          <path d={`M ${x - R * 0.36} ${ey} q ${R * 0.11} ${-R * 0.12} ${R * 0.22} 0`} fill="none" stroke={M.ink} strokeWidth={3.5} strokeLinecap="round" />
          <path d={`M ${x + R * 0.14} ${ey} q ${R * 0.11} ${-R * 0.12} ${R * 0.22} 0`} fill="none" stroke={M.ink} strokeWidth={3.5} strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx={x - R * 0.25} cy={ey} r={R * 0.09} fill={M.ink} />
          <circle cx={x + R * 0.25} cy={ey} r={R * 0.09} fill={M.ink} />
          <circle cx={x - R * 0.22} cy={ey - R * 0.04} r={R * 0.03} fill="#fff" />
          <circle cx={x + R * 0.28} cy={ey - R * 0.04} r={R * 0.03} fill="#fff" />
        </>
      )}
      {mood < 0.5 ? (
        <path d={`M ${x - R * 0.18} ${y + R * 0.34} q ${R * 0.06} ${-R * 0.06} ${R * 0.12} 0 t ${R * 0.12} 0 t ${R * 0.12} 0`} fill="none" stroke={M.ink} strokeWidth={3} strokeLinecap="round" />
      ) : (
        <path d={`M ${x - R * 0.18} ${y + R * 0.3} Q ${x} ${y + R * 0.46} ${x + R * 0.18} ${y + R * 0.3}`} fill="none" stroke={M.ink} strokeWidth={3.5} strokeLinecap="round" />
      )}
      <ellipse cx={x - R * 0.46} cy={y + R * 0.28} rx={R * 0.1} ry={R * 0.06} fill={M.pink} opacity={0.7} />
      <ellipse cx={x + R * 0.46} cy={y + R * 0.28} rx={R * 0.1} ry={R * 0.06} fill={M.pink} opacity={0.7} />
    </g>
  )
}

/** A six-armed snowflake. */
function Snowflake({ x, y, r, rot = 0, opacity = 1 }: { x: number; y: number; r: number; rot?: number; opacity?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} opacity={opacity}>
      {Array.from({ length: 6 }, (_, i) => (
        <g key={i} transform={`rotate(${i * 60})`}>
          <line x1={0} y1={0} x2={0} y2={-r} stroke="#7cc6f0" strokeWidth={3.5} strokeLinecap="round" />
          <path d={`M ${-r * 0.3} ${-r * 0.75} L 0 ${-r * 0.5} L ${r * 0.3} ${-r * 0.75}`} fill="none" stroke="#7cc6f0" strokeWidth={3} strokeLinecap="round" />
        </g>
      ))}
    </g>
  )
}

const ST_X = [170, 480, 790]
const ST_Y = 300
const MR = 66 // mascot radius

/**
 * science/water — "Water is amazing because it can be all three states. When
 * it is frozen, ice is a solid. When you pour it, water is a liquid. And when
 * it boils away, steam is a gas."
 * A water-drop buddy hops between three stations and morphs as it goes: it
 * freezes into a shivering ice cube (solid), melts back into a drop that
 * splashes into a glass (liquid), then drops into a boiling pot and rises out
 * as a puffy steam cloud (gas). A thermometer under it all runs cold → hot.
 */
const water: Scene = ({ t, cue }: SceneProps) => {
  const amazing = cue('amazing')
  const allThree = cue('all three states')
  const frozen = cue('frozen')
  const iceSolid = cue('ice is a solid')
  const pour = cue('pour it')
  const liquidAt = cue('water is a liquid')
  const boils = cue('boils away')
  const steamAt = cue('steam is a gas')
  const tr1 = [frozen - 0.45, frozen + 0.55]
  const tr2 = [pour - 0.35, pour + 0.6]
  const tr3 = [boils - 0.3, boils + 0.45]
  const rise = [boils + 0.55, steamAt + 0.5]
  const k1 = ease.inOutCubic(progress(t, tr1[0], tr1[1] - tr1[0]))
  const k2 = ease.inOutCubic(progress(t, tr2[0], tr2[1] - tr2[0]))
  const k3 = ease.inOutCubic(progress(t, tr3[0], tr3[1] - tr3[0]))
  const kr = ease.inOutSine(progress(t, rise[0], rise[1] - rise[0]))
  const intro = spring(t, 0.2, { stiffness: 170, damping: 10 })
  const glassY = ST_Y + 70
  const potTop = 368
  const cloudY = 196
  // the travelling mascot (only while moving)
  let mascot: { x: number; y: number; a: keyof typeof SHAPES; b: keyof typeof SHAPES; k: number; color: string; mood: number; R: number } | null = null
  if (t < tr1[1]) {
    const [x, y] = arc(k1, [480, ST_Y - 30], [ST_X[0], ST_Y], 120)
    mascot = { x, y, a: 'drop', b: 'cube', k: k1, color: mixColor(WATER, ICE, k1), mood: k1 > 0.6 ? 0 : 1, R: MR * Math.min(1, intro) }
  } else if (t >= tr2[0] && t < tr2[1]) {
    const [x, y] = arc(k2, [ST_X[0], ST_Y], [ST_X[1], glassY - 20], 140)
    mascot = { x, y, a: 'cube', b: 'drop', k: k2, color: mixColor(ICE, WATER, k2), mood: 1, R: MR - 18 * k2 }
  } else if (t >= tr3[0] && t < tr3[1]) {
    const [x, y] = arc(k3, [ST_X[1], glassY - 20], [ST_X[2], potTop + 10], 150)
    mascot = { x, y, a: 'drop', b: 'drop', k: 0, color: WATER, mood: 1, R: 48 - 10 * k3 }
  } else if (t >= rise[0] && t < rise[1]) {
    mascot = { x: ST_X[2], y: potTop - 10 + (cloudY - potTop + 10) * kr, a: 'drop', b: 'cloud', k: kr, color: mixColor(WATER, STEAM, kr), mood: kr > 0.5 ? 2 : 1, R: 38 + 36 * kr }
  }
  const at1 = tr1[1]
  const at2 = tr2[1]
  const at3 = rise[1]
  const fill = ep(t, at2 - 0.05, 0.6)
  const boil = ep(t, boils - 0.2, 0.4)
  const bob = (i: number) => Math.sin(t * 2.2 + i) * 4
  const steamFloat = Math.sin(t * 1.4) * 6
  const therm = interpolate(t, [allThree, at1, tr2[0], at2, tr3[0], at3], [0.5, 0.06, 0.06, 0.5, 0.5, 0.94], ease.inOutCubic)
  return (
    <>
      <Paper />
      <defs>
        <linearGradient id="sq-b3-therm" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#7cc6f0" />
          <stop offset="0.5" stopColor="#ffe08a" />
          <stop offset="1" stopColor="#f2766b" />
        </linearGradient>
      </defs>
      <Camera
        t={t}
        keys={[
          { at: 0, x: 480, y: 282, zoom: 1.06 },
          { at: allThree + 0.4, x: 480, y: 280, zoom: 1 },
          { at: tr1[1], x: 330, y: 282, zoom: 1.07 },
          { at: liquidAt, x: 430, y: 282, zoom: 1.06 },
          { at: rise[0], x: 630, y: 280, zoom: 1.07 },
          { at: steamAt + 1.2, x: 480, y: 270, zoom: 1 },
        ]}
      >
        <Kinetic t={t} at={0.3} text="Water is amazing!" x={480} y={56} size={44} color={M.ink} />
        {/* stations: placeholders until the mascot arrives */}
        {ST_X.map((x, i) => {
          const s = popS(t, allThree + i * 0.2, 12)
          // a placeholder clears as soon as its station starts to fill
          const arrived = [at1, tr2[0] + 0.45, tr3[0] - 0.1][i]
          const o = 1 - ep(t, arrived - 0.2, 0.3)
          return o > 0.01 ? (
            <Scale key={i} s={s} x={x} y={ST_Y}>
              <g opacity={o}>
                <circle cx={x} cy={ST_Y} r={78} fill="none" stroke={M.inkSoft} strokeWidth={4} strokeDasharray="12 10" />
                <Txt x={x} y={ST_Y + 2} size={48} anchor="middle" color={M.inkSoft}>
                  ?
                </Txt>
              </g>
            </Scale>
          ) : null
        })}
        {/* station 1: ice */}
        {t >= at1 && (
          <>
            <Blob x={ST_X[0]} y={ST_Y + bob(0) * 0.3} R={MR} a="cube" b="cube" k={0} color={ICE} mood={0} t={t} />
            {[0, 1, 2].map((i) => (
              <Snowflake key={i} x={ST_X[0] + [-82, 86, 70][i]} y={ST_Y + [-70, -40, 74][i]} r={[16, 12, 10][i]} rot={t * 30 + i * 40} opacity={ep(t, at1 + i * 0.15, 0.4)} />
            ))}
          </>
        )}
        {/* station 2: a glass of water */}
        {t > tr2[0] && (
          <Scale s={popS(t, tr2[0] + 0.2, 12)} x={ST_X[1]} y={ST_Y + 140}>
            <path d={`M ${ST_X[1] - 74} ${ST_Y - 40} L ${ST_X[1] - 60} ${ST_Y + 140} Q ${ST_X[1] - 58} ${ST_Y + 152} ${ST_X[1] - 46} ${ST_Y + 152} L ${ST_X[1] + 46} ${ST_Y + 152} Q ${ST_X[1] + 58} ${ST_Y + 152} ${ST_X[1] + 60} ${ST_Y + 140} L ${ST_X[1] + 74} ${ST_Y - 40}`} fill={M.sky} fillOpacity={0.5} stroke="none" />
            {fill > 0 && <path d={`M ${ST_X[1] - 70 + 12 * (1 - fill)} ${ST_Y + 152 - 150 * fill} Q ${ST_X[1]} ${ST_Y + 152 - 150 * fill + Math.sin(t * 3) * 5} ${ST_X[1] + 70 - 12 * (1 - fill)} ${ST_Y + 152 - 150 * fill} L ${ST_X[1] + 60} ${ST_Y + 140} Q ${ST_X[1] + 58} ${ST_Y + 152} ${ST_X[1] + 46} ${ST_Y + 152} L ${ST_X[1] - 46} ${ST_Y + 152} Q ${ST_X[1] - 58} ${ST_Y + 152} ${ST_X[1] - 60} ${ST_Y + 140} Z`} fill={WATER} opacity={0.85} />}
            {t >= at2 && <Blob x={ST_X[1]} y={glassY - 26 + bob(1)} R={48} a="drop" b="drop" k={0} color={WATER} mood={1} t={t} />}
            <path d={`M ${ST_X[1] - 74} ${ST_Y - 40} L ${ST_X[1] - 60} ${ST_Y + 140} Q ${ST_X[1] - 58} ${ST_Y + 152} ${ST_X[1] - 46} ${ST_Y + 152} L ${ST_X[1] + 46} ${ST_Y + 152} Q ${ST_X[1] + 58} ${ST_Y + 152} ${ST_X[1] + 60} ${ST_Y + 140} L ${ST_X[1] + 74} ${ST_Y - 40}`} fill="none" stroke={M.ink} strokeWidth={4.5} strokeLinejoin="round" strokeLinecap="round" />
            <path d={`M ${ST_X[1] - 56} ${ST_Y - 20} L ${ST_X[1] - 46} ${ST_Y + 120}`} stroke="#fff" strokeWidth={7} strokeLinecap="round" opacity={0.7} />
          </Scale>
        )}
        {/* splash as the drop lands */}
        {[0, 1, 2, 3, 4].map((i) => {
          const k = progress(t, at2 - 0.05, 0.5)
          if (k <= 0 || k >= 1) return null
          const a = -Math.PI / 2 + (i - 2) * 0.45
          return <circle key={i} cx={ST_X[1] + Math.cos(a) * 70 * k} cy={glassY - 40 + Math.sin(a) * 60 * k + 80 * k * k} r={7 * (1 - k) + 2} fill={WATER} stroke={M.ink} strokeWidth={2} />
        })}
        {/* station 3: pot on the stove, then steam */}
        {t > tr3[0] - 0.4 && (
          <Scale s={popS(t, tr3[0] - 0.4, 12)} x={ST_X[2]} y={450}>
            <Flame x={ST_X[2] - 26} y={474} s={0.7} t={t} on={boil} />
            <Flame x={ST_X[2] + 26} y={474} s={0.7} t={t + 0.3} on={boil} />
            <Pot x={ST_X[2]} y={454} w={150} h={86} t={t} bubbles={boil} />
          </Scale>
        )}
        {t > rise[0] &&
          [0, 1, 2].map((i) => {
            const ph = ((t * 0.7 + i / 3) % 1 + 1) % 1
            const y0 = potTop - 6
            const y1 = cloudY + 70
            const yy = y0 + (y1 - y0) * ph
            const xx = ST_X[2] - 36 + i * 36 + Math.sin(ph * 8 + i) * 8
            return <path key={i} d={`M ${xx} ${yy} q 8 -10 0 -20 q -8 -10 0 -20`} fill="none" stroke={M.inkSoft} strokeWidth={4} strokeLinecap="round" opacity={Math.sin(Math.PI * ph) * 0.7} />
          })}
        {t >= at3 && <Blob x={ST_X[2]} y={cloudY + steamFloat} R={74} a="cloud" b="cloud" k={0} color={STEAM} mood={2} t={t} />}
        {/* the travelling mascot */}
        {mascot && mascot.R > 1 && <Blob x={mascot.x} y={mascot.y} R={mascot.R} a={mascot.a} b={mascot.b} k={mascot.k} color={mascot.color} mood={mascot.mood} t={t} />}
        {/* labels: name = state */}
        {[
          { at: iceSolid, name: 'ice', state: 'solid', color: '#7cc6f0' },
          { at: liquidAt, name: 'water', state: 'liquid', color: WATER },
          { at: steamAt, name: 'steam', state: 'gas', color: '#b9c3d3' },
        ].map((l, i) => {
          const x = ST_X[i]
          const y = i === 2 ? 110 : 470
          const w = textW(`${l.name} = ${l.state}`, 28) + 36
          return (
            <Scale key={i} s={popS(t, l.at + 0.1, 12)} x={x} y={y}>
              <rect x={x - w / 2} y={y - 23} width={w} height={46} rx={23} fill={M.white} stroke={M.ink} strokeWidth={3.5} />
              <Txt x={x - w / 2 + 18} y={y + 1} size={28} color={shade(l.color, 0.35)}>
                {l.name}
              </Txt>
              <Txt x={x + w / 2 - 18} y={y + 1} size={28} anchor="end">
                {`= ${l.state}`}
              </Txt>
            </Scale>
          )
        })}
        {/* melt → / boil → arrows */}
        <Draw t={t} at={tr2[0]} dur={0.6} d={`M ${ST_X[0] + 70} ${ST_Y - 96} Q ${(ST_X[0] + ST_X[1]) / 2} ${ST_Y - 170} ${ST_X[1] - 70} ${ST_Y - 100}`} stroke={M.coral} width={4.5} dash="3 10" />
        <Scale s={popS(t, tr2[0] + 0.3, 12)} x={(ST_X[0] + ST_X[1]) / 2} y={ST_Y - 152}>
          <Txt x={(ST_X[0] + ST_X[1]) / 2} y={ST_Y - 152} size={24} anchor="middle" color={M.coral} stroke={M.paper}>
            melts
          </Txt>
        </Scale>
        <Draw t={t} at={tr3[0]} dur={0.6} d={`M ${ST_X[1] + 80} ${ST_Y - 50} Q ${(ST_X[1] + ST_X[2]) / 2} ${ST_Y - 150} ${ST_X[2] - 96} ${ST_Y - 80}`} stroke={M.coral} width={4.5} dash="3 10" />
        <Scale s={popS(t, tr3[0] + 0.3, 12)} x={(ST_X[1] + ST_X[2]) / 2} y={ST_Y - 128}>
          <Txt x={(ST_X[1] + ST_X[2]) / 2} y={ST_Y - 128} size={24} anchor="middle" color={M.coral} stroke={M.paper}>
            boils
          </Txt>
        </Scale>
        {/* the thermometer: cold → hot */}
        <Scale s={popS(t, allThree + 0.5, 13)} x={480} y={520}>
          <rect x={150} y={508} width={660} height={20} rx={10} fill="url(#sq-b3-therm)" stroke={M.ink} strokeWidth={3} />
          <Snowflake x={124} y={518} r={14} />
          <Flame x={838} y={530} s={0.42} t={t} on={1} />
          <path d={`M ${150 + 660 * therm} 502 l -9 -14 l 18 0 Z`} fill={M.ink} />
        </Scale>
        <Sparkles t={t} at={at1} x={ST_X[0]} y={ST_Y} r={90} n={8} seed={1} colors={[M.white, '#7cc6f0', M.gold]} />
        <Sparkles t={t} at={at3} x={ST_X[2]} y={cloudY} r={100} n={8} seed={3} />
        <Burst t={t} at={amazing + 0.1} x={480} y={ST_Y - 30} color={M.sea} r={110} />
        <Twinkle t={t} at={at3 + 1} x={ST_X[1] + 80} y={ST_Y - 30} r={10} />
      </Camera>
    </>
  )
}

/** A gas flame (fades/shrinks when `on` is 0). */
function Flame({ x, y, s = 1, t, on }: { x: number; y: number; s?: number; t: number; on: number }) {
  const f = (1 + 0.12 * Math.sin(t * 17) + 0.07 * Math.sin(t * 29)) * (0.3 + 0.7 * on)
  return (
    <g transform={`translate(${x} ${y}) scale(${s} ${s * f})`} opacity={0.4 + 0.6 * on}>
      <path d="M 0 -46 C 16 -26 24 -14 22 0 Q 0 10 -22 0 C -24 -14 -10 -22 0 -46 Z" fill={M.coral} stroke={M.ink} strokeWidth={3.5} strokeLinejoin="round" />
      <path d="M 0 -26 C 8 -16 12 -8 10 0 Q 0 4 -10 0 C -12 -8 -6 -14 0 -26 Z" fill={M.gold} />
    </g>
  )
}

// ── the water cycle ──────────────────────────────────────────────────────────
const LAKE = { x: 232, y: 482, rx: 196, ry: 30 }
const CLOUD_A: P = [470, 152]
const CLOUD_B: P = [716, 132]
const EVAP_D = 'M 262 440 C 214 350 222 250 330 176'
const COND_D = 'M 392 70 Q 540 22 668 64'
const PREC_D = 'M 878 168 C 918 250 914 330 880 400'
const COLL_D = 'M 640 506 Q 540 530 448 500'

/** A labelled stage of the cycle: an arrow that draws on + a pill label. */
function CycleStep({ t, at, d, end, ang, color, label, lx, ly }: { t: number; at: number; d: string; end: P; ang: number; color: string; label: string; lx: number; ly: number }) {
  const w = textW(label, 26) + 34
  return (
    <>
      <Draw t={t} at={at} dur={0.8} d={d} stroke={M.ink} width={13} />
      <Draw t={t} at={at} dur={0.8} d={d} stroke={color} width={7} />
      {t > at + 0.78 && (
        <>
          <Head x={end[0]} y={end[1]} ang={ang} size={22} color={M.ink} width={13} />
          <Head x={end[0]} y={end[1]} ang={ang} size={22} color={color} width={7} />
        </>
      )}
      <Scale s={popS(t, at + 0.35, 11)} x={lx} y={ly}>
        <rect x={lx - w / 2} y={ly - 22} width={w} height={44} rx={22} fill={color} stroke={M.ink} strokeWidth={3.5} />
        <Txt x={lx} y={ly + 1} size={26} anchor="middle" color={M.ink}>
          {label}
        </Txt>
      </Scale>
    </>
  )
}

/**
 * science/cycle — "Water moves in a cycle. The sun warms the lake, and water
 * rises as vapor. That's evaporation. Up high, the vapor cools into tiny drops
 * that make clouds. That's condensation. When the drops get heavy, they fall
 * as rain. That's precipitation!"
 * A little landscape builds (lake, hills, mountain). The sun warms the lake and
 * wisps of vapor rise (Evaporation ↑). High up, the vapor gathers into tiny
 * drops that puff into a cloud, which drifts across (Condensation →). It
 * darkens and swells, and rain falls on the mountain (Precipitation ↓); a
 * stream carries it back to the lake, closing the loop.
 */
const cycle: Scene = ({ t, cue }: SceneProps) => {
  const cyc = cue('moves in a cycle')
  const warms = cue('sun warms the lake')
  const rises = cue('rises as vapor')
  const evap = cue('evaporation')
  const upHigh = cue('Up high')
  const cools = cue('vapor cools')
  const drops = cue('tiny drops')
  const clouds = cue('make clouds')
  const cond = cue('condensation')
  const heavy = cue('get heavy')
  const rain = cue('fall as rain')
  const prec = cue('precipitation')
  const land = (i: number) => popS(t, 0.2 + i * 0.18, 13)
  const sunS = popS(t, warms - 0.1, 10)
  const warm = ep(t, warms + 0.3, 0.6)
  // vapor gathers up high, becomes drops, then a cloud that drifts and darkens
  const gather = ep(t, upHigh, 1.4, ease.inOutCubic)
  const toDrops = ep(t, drops - 0.1, 0.5)
  const cloudK = spring(t, clouds, { stiffness: 140, damping: 11 })
  const drift = ep(t, cond + 0.4, 1.4, ease.inOutCubic)
  const cx = CLOUD_A[0] + (CLOUD_B[0] - CLOUD_A[0]) * drift
  const cy = CLOUD_A[1] + (CLOUD_B[1] - CLOUD_A[1]) * drift + Math.sin(t * 1.3) * 4
  const dark = ep(t, heavy - 0.1, 0.8)
  const swell = 1 + 0.12 * dark
  const raining = ep(t, rain - 0.1, 0.3)
  const loop = prec + 1.0
  return (
    <>
      <Paper />
      <defs>
        <linearGradient id="sq-b3-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#cfeafb" />
          <stop offset="1" stopColor="#cfeafb" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={960} height={420} fill="url(#sq-b3-sky)" />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 480, y: 270, zoom: 1 },
          { at: warms + 0.4, x: 360, y: 300, zoom: 1.1 },
          { at: evap + 0.3, x: 400, y: 260, zoom: 1.06 },
          { at: clouds + 0.4, x: 520, y: 220, zoom: 1.1 },
          { at: rain + 0.3, x: 640, y: 270, zoom: 1.08 },
          { at: prec + 1.2, x: 480, y: 270, zoom: 1 },
        ]}
      >
        <g opacity={1 - ep(t, cond - 0.8, 0.4)}>
          <Kinetic t={t} at={Math.max(0.1, cyc - 0.9)} text="The water cycle" x={480} y={44} size={42} color={M.ink} />
        </g>
        {/* landscape */}
        <Scale s={land(3)} x={770} y={500}>
          <path d="M 812 506 L 920 304 L 1030 506 Z" fill="#d3d6de" stroke={M.ink} strokeWidth={4} strokeLinejoin="round" />
          <path d="M 556 506 L 762 204 L 980 506 Z" fill="#b9bcc6" stroke={M.ink} strokeWidth={4} strokeLinejoin="round" />
          <path d="M 702 292 L 762 204 L 824 294 L 802 282 L 784 302 L 762 284 L 742 304 L 722 284 Z" fill={M.white} stroke={M.ink} strokeWidth={3.5} strokeLinejoin="round" />
        </Scale>
        <Scale s={land(0)} x={480} y={540}>
          <path d="M -400 478 L -20 476 Q 200 452 430 474 T 980 468 L 1400 470 L 1400 600 L -400 600 Z" fill="#8fd27a" stroke={M.ink} strokeWidth={4} />
        </Scale>
        <Scale s={land(1)} x={LAKE.x} y={LAKE.y}>
          <ellipse cx={LAKE.x} cy={LAKE.y} rx={LAKE.rx} ry={LAKE.ry} fill={mixColor('#6cc7ea', '#8fdcf2', warm * (0.5 + 0.5 * pulse(t, 1.4)))} stroke={M.ink} strokeWidth={4} />
          <path d={`M ${LAKE.x - 120} ${LAKE.y - 6} q 20 -6 40 0 M ${LAKE.x + 30} ${LAKE.y + 8} q 20 -6 40 0`} fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.7} />
        </Scale>
        {[500, 548].map((x, i) => (
          <Scale key={x} s={land(2 + i * 0.5)} x={x} y={470}>
            <rect x={x - 5} y={436} width={10} height={34} rx={4} fill="#9a6a46" stroke={M.ink} strokeWidth={3} />
            <circle cx={x} cy={426 - i * 6} r={24 - i * 4} fill="#6cc56b" stroke={M.ink} strokeWidth={3.5} />
          </Scale>
        ))}
        {/* the sun warms the lake */}
        <Scale s={sunS} x={110} y={96}>
          <Sun x={110} y={96} r={44} spin={t * 12} glow={warm} />
        </Scale>
        {[0, 1, 2].map((i) => {
          const k = progress(t, warms + 0.3 + i * 0.15, 0.6)
          const o = (1 - ep(t, evap + 0.4, 0.5)) * Math.min(1, k * 3)
          if (k <= 0 || o <= 0.01) return null
          const x0 = 150 + i * 34
          const y0 = 154 + i * 6
          return <path key={i} d={`M ${x0} ${y0} q 14 18 0 36 q -14 18 0 36 q 14 18 0 36`} transform={`translate(${12 * k} ${60 * k})`} fill="none" stroke={M.gold} strokeWidth={5} strokeLinecap="round" opacity={o} />
        })}
        {/* vapor rising (keeps going) */}
        {t > rises - 0.3 &&
          Array.from({ length: 6 }, (_, i) => {
            const p = (((t - rises + 0.3) / 2.6 + i / 6) % 1 + 1) % 1
            const x = 90 + i * 56 + Math.sin(p * 7 + i) * 10
            const y = 460 - p * 230
            const o = Math.sin(Math.PI * p) * 0.85 * ep(t, rises - 0.3, 0.6)
            return <path key={i} d={`M ${x} ${y} q 9 -11 0 -22 q -9 -11 0 -22`} fill="none" stroke="#9fd3ef" strokeWidth={5} strokeLinecap="round" opacity={o} />
          })}
        {/* up high: vapor gathers, cools into tiny drops… */}
        {t > upHigh && cloudK < 0.95 &&
          Array.from({ length: 12 }, (_, i) => {
            const a0: P = [140 + (i % 6) * 50 + rand(i) * 20, 250 + Math.floor(i / 6) * 40 + rand(i + 4) * 20]
            const a1: P = [CLOUD_A[0] - 70 + (i % 6) * 28 + rand(i + 2) * 10, CLOUD_A[1] - 14 + Math.floor(i / 6) * 28 + rand(i + 7) * 10]
            const x = a0[0] + (a1[0] - a0[0]) * gather + Math.sin(t * 3 + i) * 3
            const y = a0[1] + (a1[1] - a0[1]) * gather + Math.cos(t * 2.6 + i) * 3
            const o = Math.min(1, (t - upHigh) * 3) * (1 - Math.min(1, cloudK))
            return toDrops > 0.5 ? <Drop key={i} x={x} y={y} r={6} color="#8fd0f0" opacity={o} /> : <circle key={i} cx={x} cy={y} r={7} fill={mixColor('#ffffff', '#cfeafb', gather)} stroke="#9fd3ef" strokeWidth={2.5} opacity={o} />
          })}
        {t > cools && t < clouds + 0.6 && (
          <g opacity={1 - ep(t, clouds, 0.5)}>
            <Snowflake x={CLOUD_A[0] + 110} y={CLOUD_A[1] - 30} r={16} rot={t * 40} opacity={ep(t, cools, 0.4)} />
          </g>
        )}
        {/* …that make a cloud */}
        {cloudK > 0.01 && (
          <g transform={`translate(${cx} ${cy}) scale(${Math.min(1.1, cloudK)} ${Math.min(1.1, cloudK) * swell}) translate(${-cx} ${-cy})`}>
            <Cloud x={cx} y={cy} w={210} color={mixColor('#ffffff', '#aeb6c4', dark)} face />
          </g>
        )}
        {/* rain */}
        {raining > 0 &&
          Array.from({ length: 14 }, (_, i) => {
            const p = (((t - rain) / 0.75 + rand(i * 3)) % 1 + 1) % 1
            const x = cx - 80 + ((i * 37) % 170) - p * 14
            const y = cy + 50 + p * (300 - (x > 740 ? 40 : 0))
            return <Drop key={i} x={x} y={y} r={7} color={M.sea} opacity={raining * Math.min(1, (1 - p) * 4)} />
          })}
        {/* the cycle, step by step */}
        <CycleStep t={t} at={evap} d={EVAP_D} end={[330, 176]} ang={-0.6} color="#ffb59f" label="Evaporation" lx={150} ly={300} />
        <CycleStep t={t} at={cond} d={COND_D} end={[668, 64]} ang={0.32} color="#bfe0ff" label="Condensation" lx={486} ly={238} />
        <CycleStep t={t} at={prec} d={PREC_D} end={[880, 400]} ang={1.95} color="#9fd3ef" label="Precipitation" lx={826} ly={450} />
        {/* …and back to the lake */}
        <Draw t={t} at={loop} dur={0.8} d={COLL_D} stroke={M.leaf} width={7} dash="2 12" />
        {t > loop + 0.8 && <Head x={448} y={500} ang={-2.75} size={18} color={M.leaf} width={7} />}
        <Sparkles t={t} at={clouds + 0.2} x={CLOUD_A[0]} y={CLOUD_A[1]} r={120} n={8} seed={2} />
        <Twinkle t={t} at={loop + 1} x={330} y={150} r={10} />
        <Twinkle t={t} at={loop + 1} x={900} y={150} r={9} phase={0.5} color={M.sea} />
      </Camera>
    </>
  )
}

// ── plants: photosynthesis ───────────────────────────────────────────────────
const STEM_X = 330
const SOIL_Y = 394
const STEM_TOP = 150
const LEAVES: { y: number; side: -1 | 1; len: number }[] = [
  { y: 336, side: -1, len: 96 },
  { y: 300, side: 1, len: 100 },
  { y: 250, side: -1, len: 92 },
  { y: 208, side: 1, len: 84 },
]
const leafTip = (i: number): P => {
  const l = LEAVES[i]
  const a = l.side < 0 ? (-160 * Math.PI) / 180 : (-20 * Math.PI) / 180
  return [STEM_X + Math.cos(a) * l.len * 0.62, l.y + Math.sin(a) * l.len * 0.62]
}
const ROOTS = ['M 330 394 Q 326 450 318 520', 'M 326 420 Q 290 440 250 470', 'M 322 460 Q 290 490 262 524', 'M 330 430 Q 372 450 402 486', 'M 328 478 Q 360 500 384 530']
const ROOT_TIPS: P[] = [[318, 520], [250, 470], [262, 524], [402, 486], [384, 530]]
const PANEL = { x: 592, y: 24, w: 340, h: 352 }

/** A chemical formula with a subscript 2 (CO₂, O₂), centred on (x, y). */
function Chem({ x, y, base, size, color = M.ink }: { x: number; y: number; base: string; size: number; color?: string }) {
  return (
    <text x={x - size * 0.12} y={y} fontFamily={M.font} fontWeight={700} fontSize={size} textAnchor="middle" dominantBaseline="central" fill={color}>
      {base}
      <tspan fontSize={size * 0.62} dy={size * 0.28}>
        2
      </tspan>
    </text>
  )
}

/** A gas bubble with its formula. */
function GasBubble({ x, y, r = 23, base, fill, opacity = 1 }: { x: number; y: number; r?: number; base: string; fill: string; opacity?: number }) {
  return (
    <g opacity={opacity}>
      <circle cx={x} cy={y} r={r} fill={fill} stroke={M.ink} strokeWidth={2.5} />
      <circle cx={x - r * 0.4} cy={y - r * 0.4} r={r * 0.2} fill="#fff" opacity={0.7} />
      <Chem x={x} y={y - 1} base={base} size={r * (base === 'CO' ? 0.86 : 1)} />
    </g>
  )
}

/** A little sugar cube. */
function SugarCube({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M -12 -6 L 0 -12 L 12 -6 L 0 0 Z" fill="#ffffff" stroke={M.ink} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M -12 -6 L 0 0 L 0 14 L -12 8 Z" fill="#eef1f6" stroke={M.ink} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M 12 -6 L 0 0 L 0 14 L 12 8 Z" fill="#dfe5ee" stroke={M.ink} strokeWidth={2.5} strokeLinejoin="round" />
    </g>
  )
}

/** Point `k` (0..1) along a polyline. */
function along(pts: P[], k: number): P {
  const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]))
  const total = segs.reduce((a, b) => a + b, 0)
  let d = Math.max(0, Math.min(1, k)) * total
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i] || i === segs.length - 1) {
      const f = segs[i] ? Math.min(1, d / segs[i]) : 0
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]
    }
    d -= segs[i]
  }
  return pts[pts.length - 1]
}

/** One row of the recipe card: an icon and a word, popping in at `at`. */
function RecipeRow({ t, at, y, icon, text, color = M.ink }: { t: number; at: number; y: number; icon: ReactNode; text: string; color?: string }) {
  const k = ep(t, at, 0.5, ease.outBack)
  if (k <= 0) return null
  return (
    <g transform={`translate(${(1 - k) * 40} 0)`} opacity={Math.min(1, k * 2)}>
      {icon}
      <Txt x={PANEL.x + 92} y={y + 1} size={28} color={color}>
        {text}
      </Txt>
    </g>
  )
}

/**
 * science/plants — "Plants make their own food! Leaves catch sunlight, roots
 * soak up water, and leaves take in a gas called carbon dioxide. Using the
 * sun's energy, the plant turns them into sugar, and gives off the oxygen we
 * breathe. That's photosynthesis!"
 * A sprout grows and a recipe card opens beside it. Sunbeams draw onto the
 * leaves; roots spread and water droplets climb the stem; CO₂ bubbles drift
 * into the leaves — each ingredient lands on the card. The leaves pulse with
 * the sun's energy, sugar cubes slide down the stem (food!), and O₂ bubbles
 * float out to a fox who takes a happy breath. "Photosynthesis!"
 */
const plants: Scene = ({ t, cue }: SceneProps) => {
  const food = cue('make their own food')
  const sunlight = cue('catch sunlight')
  const roots = cue('roots soak up')
  const water2 = cue('water,')
  const gasIn = cue('take in a gas')
  const co2 = cue('carbon dioxide')
  const energy = cue('energy')
  const sugar = cue('into sugar')
  const oxygen = cue('the oxygen')
  const breathe = cue('we breathe')
  const photo = cue('photosynthesis')
  const grow = ep(t, 0.15, 1.1, ease.inOutCubic)
  const leafK = (i: number) => popS(t, 0.6 + i * 0.18, 11)
  const sunS = popS(t, sunlight - 0.15, 10)
  const glow = ep(t, sunlight + 0.6, 0.5) * (0.55 + 0.45 * pulse(t, 1.2)) + 0.8 * Math.sin(Math.PI * progress(t, energy - 0.1, 1.6))
  const sway = (i: number) => Math.sin(t * 1.6 + i * 1.3) * 3
  const foxIn = popS(t, oxygen - 0.3, 12)
  const inhale = Math.sin(Math.PI * progress(t, breathe, 1.0))
  const done = photo + 1
  return (
    <>
      <Paper />
      <defs>
        <linearGradient id="sq-b3-sky2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#d6eefb" />
          <stop offset="1" stopColor="#d6eefb" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={960} height={400} fill="url(#sq-b3-sky2)" />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 340, y: 290, zoom: 1.18 },
          { at: food + 0.6, x: 480, y: 270, zoom: 1 },
          { at: roots + 0.4, x: 400, y: 320, zoom: 1.1 },
          { at: gasIn + 0.4, x: 480, y: 270, zoom: 1 },
        ]}
      >
        {/* soil and roots */}
        <path d="M -300 398 Q 120 386 480 398 T 1300 394 L 1300 640 L -300 640 Z" fill="#c7955f" stroke={M.ink} strokeWidth={4} />
        {Array.from({ length: 16 }, (_, i) => (
          <ellipse key={i} cx={30 + ((i * 131) % 900)} cy={430 + ((i * 47) % 95)} rx={7 + (i % 3) * 3} ry={5 + (i % 2) * 2} fill="#a8774a" opacity={0.6} />
        ))}
        {[60, 180, 470, 560].map((x, i) => (
          <path key={i} d={`M ${x} 398 l 6 -16 l 4 14 l 6 -12 l 3 14`} fill="none" stroke="#6fbb63" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {ROOTS.map((d, i) => (
          <g key={i}>
            <Draw t={t} at={roots + i * 0.1} dur={0.6} d={d} stroke={M.ink} width={9} />
            <Draw t={t} at={roots + i * 0.1} dur={0.6} d={d} stroke="#f2e1b8" width={4.5} />
          </g>
        ))}
        {/* the plant */}
        <Draw t={t} at={0.15} dur={1.1} d={`M ${STEM_X} ${SOIL_Y} C ${STEM_X - 6} 320 ${STEM_X + 6} 230 ${STEM_X} ${STEM_TOP}`} stroke={M.ink} width={14} />
        <Draw t={t} at={0.15} dur={1.1} d={`M ${STEM_X} ${SOIL_Y} C ${STEM_X - 6} 320 ${STEM_X + 6} 230 ${STEM_X} ${STEM_TOP}`} stroke="#6cc56b" width={8} />
        {LEAVES.map((l, i) => {
          const s = leafK(i)
          if (s <= 0.01) return null
          return (
            <g key={i} transform={`translate(${STEM_X} ${l.y}) scale(${s}) rotate(${sway(i)}) translate(${-STEM_X} ${-l.y})`}>
              <Leaf x={STEM_X} y={l.y} len={l.len} ang={l.side < 0 ? -160 : -20} color="#6cc56b" glow={Math.min(1, glow)} />
            </g>
          )
        })}
        {grow > 0.95 && (
          <Scale s={popS(t, 1.3, 10)} x={STEM_X} y={STEM_TOP}>
            {[0, 1, 2, 3, 4].map((i) => (
              <ellipse key={i} cx={STEM_X + Math.cos((i / 5) * Math.PI * 2) * 13} cy={STEM_TOP - 6 + Math.sin((i / 5) * Math.PI * 2) * 13} rx={11} ry={11} fill={M.pink} stroke={M.ink} strokeWidth={3} />
            ))}
            <circle cx={STEM_X} cy={STEM_TOP - 6} r={9} fill={M.gold} stroke={M.ink} strokeWidth={3} />
          </Scale>
        )}
        {/* sunlight */}
        <Scale s={sunS} x={96} y={92}>
          <Sun x={96} y={92} r={44} spin={t * 10} glow={Math.min(1, glow)} />
        </Scale>
        {[0, 2, 3].map((li, k) => {
          const [lx, ly] = leafTip(li)
          const from: P = [130 + k * 10, 120 + k * 12]
          const d = `M ${from[0]} ${from[1]} L ${lx - 10} ${ly - 14}`
          return (
            <g key={li} opacity={0.9}>
              {t < sunlight + 0.8 + k * 0.15 ? (
                <Draw t={t} at={sunlight + 0.25 + k * 0.15} dur={0.5} d={d} stroke={M.gold} width={7} dash="14 10" />
              ) : (
                // light keeps streaming down the beam (and surges on "energy")
                <path d={d} fill="none" stroke={M.gold} strokeWidth={7 + 3 * Math.sin(Math.PI * progress(t, energy - 0.1, 1.6))} strokeLinecap="round" strokeDasharray="14 10" strokeDashoffset={-t * 40} />
              )}
              {t > sunlight + 0.75 + k * 0.15 && <Head x={lx - 10} y={ly - 14} ang={Math.atan2(ly - 14 - from[1], lx - 10 - from[0])} color={M.gold} size={16} width={6} />}
            </g>
          )
        })}
        {/* water climbs from the roots up the stem */}
        {t > roots + 0.6 &&
          Array.from({ length: 7 }, (_, i) => {
            const tip = ROOT_TIPS[i % ROOT_TIPS.length]
            const leaf = leafTip(i % 4)
            const path: P[] = [tip, [STEM_X, SOIL_Y + 6], [STEM_X, LEAVES[i % 4].y], leaf]
            const p = (((t - roots - 0.6) / 2.6 + i / 7) % 1 + 1) % 1
            const [x, y] = along(path, p)
            return <Drop key={i} x={x} y={y} r={7} color={M.sea} opacity={Math.min(1, (t - roots - 0.6) * 2) * Math.min(1, (1 - p) * 6)} />
          })}
        {/* carbon dioxide drifts into the leaves */}
        {t > gasIn &&
          Array.from({ length: 5 }, (_, i) => {
            const p = (((t - gasIn) / 3.2 + i / 5) % 1 + 1) % 1
            const target = leafTip(i % 2 === 0 ? 1 : 3)
            const start: P = [PANEL.x - 20, 150 + i * 46]
            const x = start[0] + (target[0] + 20 - start[0]) * p
            const y = start[1] + (target[1] - start[1]) * p + Math.sin(p * 9 + i) * 8
            return <GasBubble key={i} x={x} y={y} base="CO" fill="#c9d3e0" opacity={Math.min(1, (t - gasIn) * 2) * Math.min(1, p * 5, (1 - p) * 5)} />
          })}
        {/* the sun's energy */}
        {[0, 1, 2, 3].map((i) => (
          <Sparkles key={i} t={t} at={energy + i * 0.2} x={leafTip(i)[0]} y={leafTip(i)[1]} r={40} n={5} seed={i + 1} />
        ))}
        {/* sugar slides down the stem (food!) */}
        {t > sugar &&
          Array.from({ length: 3 }, (_, i) => {
            const p = (((t - sugar) / 2.4 + i / 3) % 1 + 1) % 1
            const leaf = leafTip(i % 4)
            const [x, y] = along([leaf, [STEM_X, LEAVES[i % 4].y], [STEM_X, SOIL_Y - 10]], p)
            return (
              <g key={i} opacity={Math.min(1, (t - sugar) * 2) * Math.min(1, (1 - p) * 5)}>
                <SugarCube x={x + 14} y={y} s={0.9} />
              </g>
            )
          })}
        {/* oxygen floats out to a fox, who breathes it in */}
        <Scale s={foxIn} x={110} y={392}>
          <Fox x={112} y={338} s={0.78} look={[0.8, -0.3]} blink={inhale > 0.4 ? 1 : 0} smile={1 + inhale} />
          {/* peeking out from behind a bush */}
          {[
            [68, 410, 26],
            [110, 402, 30],
            [152, 412, 24],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="#6fbb63" stroke={M.ink} strokeWidth={4} />
          ))}
          {[
            [68, 410, 26],
            [110, 402, 30],
            [152, 412, 24],
          ].map(([x, y, r], i) => (
            <circle key={`f${i}`} cx={x} cy={y} r={r - 2} fill="#6fbb63" />
          ))}
        </Scale>
        {t > oxygen &&
          Array.from({ length: 4 }, (_, i) => {
            const p = (((t - oxygen) / 2.8 + i / 4) % 1 + 1) % 1
            const from = leafTip(i % 2 === 0 ? 0 : 2)
            const to: P = [150, 360]
            const x = from[0] + (to[0] - from[0]) * p
            const y = from[1] + (to[1] - from[1]) * p - Math.sin(Math.PI * p) * 50
            return <GasBubble key={i} x={x} y={y} r={21} base="O" fill="#bfe8ff" opacity={Math.min(1, (t - oxygen) * 2) * Math.min(1, p * 5, (1 - p) * 4)} />
          })}
        {/* the recipe card */}
        <Scale s={popS(t, food, 13)} x={PANEL.x + PANEL.w / 2} y={PANEL.y + PANEL.h / 2}>
          <rect x={PANEL.x} y={PANEL.y + 7} width={PANEL.w} height={PANEL.h} rx={22} fill={M.ink} />
          <rect x={PANEL.x} y={PANEL.y} width={PANEL.w} height={PANEL.h} rx={22} fill={M.white} stroke={M.ink} strokeWidth={4} />
          <rect x={PANEL.x} y={PANEL.y} width={PANEL.w} height={56} rx={22} fill={M.leaf} stroke={M.ink} strokeWidth={4} />
          <rect x={PANEL.x + 4} y={PANEL.y + 30} width={PANEL.w - 8} height={24} fill={M.leaf} />
          <Txt x={PANEL.x + PANEL.w / 2} y={PANEL.y + 29} size={27} anchor="middle" color={M.white} stroke={shade(M.leaf, 0.4)}>
            Plant food recipe
          </Txt>
        </Scale>
        <RecipeRow t={t} at={sunlight + 0.6} y={112} text="sunlight" icon={<Sun x={PANEL.x + 52} y={112} r={13} spin={t * 20} />} />
        <RecipeRow t={t} at={water2} y={162} text="water" icon={<Drop x={PANEL.x + 52} y={170} r={11} color={M.sea} />} />
        <RecipeRow t={t} at={co2 + 0.3} y={212} text="carbon dioxide" icon={<GasBubble x={PANEL.x + 52} y={212} r={19} base="CO" fill="#c9d3e0" />} />
        {t > sugar - 0.3 && (
          <g opacity={ep(t, sugar - 0.3, 0.3)}>
            <line x1={PANEL.x + 24} y1={248} x2={PANEL.x + PANEL.w - 24} y2={248} stroke={M.inkSoft} strokeWidth={3} strokeDasharray="6 8" />
            <Txt x={PANEL.x + PANEL.w / 2} y={248} size={20} anchor="middle" color={M.inkSoft} stroke={M.white}>
              makes
            </Txt>
          </g>
        )}
        <RecipeRow t={t} at={sugar + 0.4} y={288} text="sugar (food!)" icon={<SugarCube x={PANEL.x + 52} y={286} s={1.3} />} />
        <RecipeRow t={t} at={oxygen + 0.4} y={338} text="oxygen" icon={<GasBubble x={PANEL.x + 52} y={338} r={19} base="O" fill="#bfe8ff" />} />
        <Kinetic t={t} at={photo + 0.1} text="Photosynthesis!" x={700} y={470} size={46} color={M.white} stroke={M.ink} />
        <Burst t={t} at={photo + 0.1} x={PANEL.x + PANEL.w / 2} y={PANEL.y + 29} color={M.gold} r={130} />
        <Sparkles t={t} at={photo + 0.3} x={700} y={470} r={200} n={10} seed={6} />
        <Twinkle t={t} at={done} x={PANEL.x + PANEL.w - 10} y={PANEL.y + 70} r={10} />
        <Twinkle t={t} at={done} x={STEM_X + 40} y={STEM_TOP - 20} r={9} phase={0.5} color={M.pink} />
      </Camera>
    </>
  )
}

export const scienceScenes: Record<string, Scene> = { states, water, cycle, plants }
