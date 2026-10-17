/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import type { ReactNode } from 'react'
import { clamp, ease, interpolate, mixColor, progress, spring } from '../anim'
import { Arrow, Burst, Camera, Chip, Draw, Fade, Kinetic, Paper, Pop, Ring, Title } from '../kit'
import { M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { Backdrop, Badge, bracePath, idleRamp, lerp, lerpPt, type Pt } from './_b2kit'

// ── one data set for the whole lesson (matches the lesson's FRUIT_GRAPH) ─────
// Apple 5, Pear 3, Plum 8 — each fruit keeps its colour on every step.
const FRUIT = [
  { name: 'Apple', value: 5, color: '#f2766b', txt: '#d9534a' },
  { name: 'Pear', value: 3, color: '#b5d65a', txt: '#5f8f17' },
  { name: 'Plum', value: 8, color: '#9b7be0', txt: '#7a5cc4' },
]
const GOLD_TXT = '#b77f00'

// chart geometry
const OX = 140
const OY = 440
const UH = 38
const MAXV = 9
const BW = 100
const BX = [262, 402, 542]
const AX1 = 622
const yOf = (v: number) => OY - v * UH
const PANEL = 795

// ── fruit icons (centred on 0,0, about 50px) ────────────────────────────────
function FruitIcon({ i, x, y, s = 1, rot = 0 }: { i: number; x: number; y: number; s?: number; rot?: number }) {
  const c = FRUIT[i].color
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      {i === 0 && (
        <>
          <path d="M 0 -13 C -10 -21 -27 -15 -25 3 C -23 19 -10 25 0 21 C 10 25 23 19 25 3 C 27 -15 10 -21 0 -13 Z" fill={c} stroke={M.ink} strokeWidth={3} />
          <path d="M 0 -13 L 2 -24" stroke={M.wood} strokeWidth={4} strokeLinecap="round" />
          <ellipse cx={11} cy={-21} rx={8} ry={4.5} transform="rotate(-25 11 -21)" fill={M.leaf} stroke={M.ink} strokeWidth={2} />
          <ellipse cx={-11} cy={-4} rx={4} ry={7} fill={M.white} opacity={0.45} />
        </>
      )}
      {i === 1 && (
        <>
          <path d="M 0 -24 C 9 -24 11 -13 11 -6 C 21 2 23 23 0 25 C -23 23 -21 2 -11 -6 C -11 -13 -9 -24 0 -24 Z" fill={c} stroke={M.ink} strokeWidth={3} />
          <path d="M 0 -24 L 3 -32" stroke={M.wood} strokeWidth={4} strokeLinecap="round" />
          <ellipse cx={-8} cy={6} rx={4} ry={7} fill={M.white} opacity={0.45} />
        </>
      )}
      {i === 2 && (
        <>
          <ellipse cx={0} cy={2} rx={21} ry={23} fill={c} stroke={M.ink} strokeWidth={3} />
          <path d="M 2 -19 C 7 -6 7 10 2 23" fill="none" stroke={M.ink} strokeWidth={2} opacity={0.4} />
          <ellipse cx={-9} cy={-4} rx={4} ry={7} fill={M.white} opacity={0.45} />
          <ellipse cx={8} cy={-24} rx={9} ry={4.5} transform="rotate(-20 8 -24)" fill={M.leaf} stroke={M.ink} strokeWidth={2} />
        </>
      )}
    </g>
  )
}

/** Bar with rounded top corners, from the baseline up `v` units. */
function barPath(i: number, v: number, w = BW): string {
  const x0 = BX[i] - w / 2
  const x1 = BX[i] + w / 2
  const top = yOf(v)
  const r = Math.min(12, Math.max(0, (OY - top) / 2))
  return `M ${x0} ${OY} L ${x0} ${top + r} Q ${x0} ${top} ${x0 + r} ${top} L ${x1 - r} ${top} Q ${x1} ${top} ${x1} ${top + r} L ${x1} ${OY} Z`
}

function Bar({ i, v, dim = 0, glow = 0, shine = -1, scaleY = 1 }: { i: number; v: number; dim?: number; glow?: number; shine?: number; scaleY?: number }) {
  if (v <= 0.01) return null
  const f = FRUIT[i]
  const vv = v * scaleY
  return (
    <g opacity={1 - 0.6 * dim}>
      {glow > 0.01 && <path d={barPath(i, vv + 0.12, BW + 16)} fill={M.gold} opacity={0.6 * glow} />}
      <path d={barPath(i, vv)} fill={f.color} stroke={M.ink} strokeWidth={3.5} strokeLinejoin="round" filter="url(#sq-shadow)" />
      <path d={barPath(i, Math.max(0, vv - 0.15), 14)} transform={`translate(${-BW / 2 + 18} 0)`} fill={M.white} opacity={0.28} />
      {shine >= 0 && shine <= 1 && (
        <>
          <clipPath id={`b2-bar-${i}`}>
            <path d={barPath(i, vv)} />
          </clipPath>
          {(() => {
            const cx = BX[i] - BW / 2 - 50 + shine * (BW + 100)
            const top = yOf(vv)
            return <path clipPath={`url(#b2-bar-${i})`} d={`M ${cx - 12 + 24} ${top} L ${cx + 12 + 24} ${top} L ${cx + 12 - 24} ${OY} L ${cx - 12 - 24} ${OY} Z`} fill={M.white} opacity={0.4} />
          })()}
        </>
      )}
    </g>
  )
}

/** Axes, gridlines and the side scale. `k` draws them on; `hi(v)` highlights a scale number. */
function Axes({ t, at, hi = () => 0, wave = () => 0 }: { t: number; at: number; hi?: (v: number) => number; wave?: (v: number) => number }) {
  const k = ease.inOutCubic(progress(t, at, 0.7))
  if (k <= 0) return null
  return (
    <g>
      {Array.from({ length: MAXV }, (_, j) => {
        const v = j + 1
        const gk = ease.outCubic(progress(t, at + 0.2 + j * 0.04, 0.5))
        return <line key={v} x1={OX} y1={yOf(v)} x2={OX + (AX1 - OX) * gk} y2={yOf(v)} stroke={M.ink} strokeWidth={1.5} strokeDasharray="5 7" opacity={0.22} />
      })}
      <line x1={OX} y1={OY} x2={OX + (AX1 - OX) * k} y2={OY} stroke={M.ink} strokeWidth={5} strokeLinecap="round" />
      <line x1={OX} y1={OY} x2={OX} y2={OY - (OY - yOf(MAXV) + 10) * k} stroke={M.ink} strokeWidth={5} strokeLinecap="round" />
      {Array.from({ length: MAXV + 1 }, (_, v) => {
        const a = progress(t, at + 0.15 + v * 0.05, 0.3)
        const h = hi(v)
        const w = wave(v)
        return (
          <g key={v} opacity={a}>
            {h > 0.01 && <circle cx={OX - 26} cy={yOf(v)} r={17 + 4 * h} fill={M.coral} opacity={0.3 + 0.5 * h} stroke={FRUIT[0].txt} strokeWidth={3 * h} />}
            <line x1={OX - 8} y1={yOf(v)} x2={OX} y2={yOf(v)} stroke={M.ink} strokeWidth={3} />
            <Title x={OX - 26} y={yOf(v) + 1} size={22 + 8 * Math.max(h, w)} color={w > h ? mixColor(M.ink, FRUIT[0].txt, w) : M.ink}>
              {v}
            </Title>
          </g>
        )
      })}
    </g>
  )
}

/** Fruit icon + name under each bar. */
function XLabels({ t, at, bounce = () => 0, names = true }: { t: number; at: number; bounce?: (i: number) => number; names?: boolean }) {
  return (
    <>
      {FRUIT.map((f, i) => (
        <g key={f.name}>
          <Pop t={t} at={at + i * 0.12} x={BX[i]} y={472}>
            <FruitIcon i={i} x={BX[i]} y={472 - 14 * bounce(i)} s={0.85} />
          </Pop>
          {names && (
            <Fade t={t} at={at + 0.2 + i * 0.12}>
              <Title x={BX[i]} y={510} size={22} color={f.txt}>
                {f.name}
              </Title>
            </Fade>
          )}
        </g>
      ))}
    </>
  )
}

/** A value tag sitting on top of a bar. */
function TopTag({ t, at, i, v, size = 34 }: { t: number; at: number; i: number; v?: number; size?: number }) {
  const val = v ?? FRUIT[i].value
  const y = yOf(FRUIT[i].value) - 32
  return <Badge t={t} at={at} x={BX[i]} y={y} label={val} color={M.white} ink={FRUIT[i].txt} r={size * 0.8} size={size} />
}

const ChartTitle = ({ t, at }: { t: number; at: number }) => <Kinetic t={t} at={at} text="Fruit sold" x={OX + (AX1 - OX) / 2} y={52} size={40} />

// ═════════════════════════════════════════════════════════════════════════════
// tally layout
const ROW_Y = [168, 290, 412]
const MARK_H = 66
const markX = (j: number) => (j < 4 ? 360 + j * 26 : j === 4 ? 360 + 39 : 360 + 135 + (j - 5) * 26)
/** One tally mark (j = 4 is the diagonal of a bundle), `k` draws it on. */
function Mark({ j, y, k, color = M.ink }: { j: number; y: number; k: number; color?: string }) {
  if (k <= 0) return null
  const b = Math.floor(j / 5) * 135
  const a: Pt = j % 5 === 4 ? [360 + b - 16, y + MARK_H / 2 - 8] : [markX(j), y - MARK_H / 2]
  const e: Pt = j % 5 === 4 ? [360 + b + 3 * 26 + 16, y - MARK_H / 2 + 8] : [markX(j), y + MARK_H / 2]
  const p = lerpPt(a, e, k)
  return <line x1={a[0]} y1={a[1]} x2={p[0]} y2={p[1]} stroke={color} strokeWidth={8} strokeLinecap="round" />
}

function RowCard({ i, y, children }: { i: number; y: number; children?: ReactNode }) {
  return (
    <g>
      <rect x={90} y={y - 50} width={740} height={100} rx={24} fill={M.white} stroke={M.ink} strokeWidth={3} filter="url(#sq-shadow)" />
      <FruitIcon i={i} x={142} y={y} s={0.95} />
      <Title x={226} y={y + 1} size={30} color={FRUIT[i].txt}>
        {FRUIT[i].name}
      </Title>
      <line x1={300} y1={y - 38} x2={300} y2={y + 38} stroke={M.ink} strokeWidth={2} opacity={0.25} />
      <line x1={690} y1={y - 38} x2={690} y2={y + 38} stroke={M.ink} strokeWidth={2} opacity={0.25} />
      {children}
    </g>
  )
}

/**
 * dataGraph/tally — "To collect data, make one tally mark for each fruit sold.
 * The fifth mark crosses the other four, making a bundle of five. Count the
 * bundle as five, then six, seven, eight. Eight plums!"
 * Close on the Plum row of a tally chart: each plum that's sold drops in and
 * becomes a mark; the fifth slashes across the first four (a gold "bundle of
 * five"); the count goes 5 (the bundle), 6, 7, 8, and 8 lands in the total.
 * The camera pulls back to the whole chart: Apple 5, Pear 3, Plum 8.
 */
const tally: Scene = ({ t, cue, reduced }: SceneProps) => {
  const markCue = cue('tally mark')
  const crosses = cue('crosses')
  const bundle = cue('bundle of five')
  const asFive = cue('as five')
  const counts = [cue('six'), cue('seven'), cue('eight')]
  const eightPlums = cue('eight plums')
  const hero = eightPlums + 1.2
  const idle = idleRamp(t, hero + 1.4, reduced)
  const markAt = [0, 1, 2, 3].map((j) => markCue + j * 0.45).concat([crosses], [0, 1, 2].map((j) => bundle + 0.8 + j * 0.3))
  const py = ROW_Y[2]
  const lasso = ease.outBack(progress(t, bundle, 0.45))
  const fivePulse = interpolate(t, [asFive, asFive + 0.15, asFive + 0.7], [0, 1, 0])
  const bob = (ph: number) => Math.sin(t * 1.6 + ph) * 3 * idle

  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 460, y: 372, zoom: 1.16 },
          { at: hero + 0.9, x: 480, y: 280, zoom: 1 },
        ]}
      >
        <ChartTitle t={t} at={hero + 0.2} />
        {/* the other rows arrive with the pull-back */}
        {[0, 1].map((i) => (
          <Pop key={i} t={t} at={hero + 0.3 + i * 0.15} x={480} y={ROW_Y[i]} bounce={15}>
            <g transform={`translate(0 ${bob(i)})`}>
              <RowCard i={i} y={ROW_Y[i]}>
                {Array.from({ length: FRUIT[i].value }, (_, j) => (
                  <Mark key={j} j={j} y={ROW_Y[i]} k={ease.outCubic(progress(t, hero + 0.6 + i * 0.3 + j * 0.07, 0.2))} />
                ))}
                <Badge t={t} at={hero + 1.2 + i * 0.2} x={760} y={ROW_Y[i]} label={FRUIT[i].value} color={FRUIT[i].color} r={30} size={36} />
              </RowCard>
            </g>
          </Pop>
        ))}
        {/* the plum row */}
        <Pop t={t} at={0.1} x={480} y={py} bounce={15}>
          <g transform={`translate(0 ${bob(2)})`}>
            <RowCard i={2} y={py}>
              {/* bundle highlight */}
              {lasso > 0.01 && (
                <rect x={340 - 6 * fivePulse} y={py - 44 - 6 * fivePulse} width={(118 + 12 * fivePulse) * clamp(lasso, 0, 1.2)} height={88 + 12 * fivePulse} rx={20} fill={M.gold} opacity={0.35 + 0.3 * fivePulse} stroke={GOLD_TXT} strokeWidth={3} />
              )}
              {markAt.map((at, j) => {
                const lit = j >= 5 ? interpolate(t, [counts[j - 5], counts[j - 5] + 0.12, counts[j - 5] + 0.7], [0, 1, 0]) : 0
                return <Mark key={j} j={j} y={py - 6 * lit} k={ease.inOutCubic(progress(t, at + 0.3, j === 4 ? 0.5 : 0.22))} color={lit > 0.01 ? mixColor(M.ink, FRUIT[2].txt, lit) : M.ink} />
              })}
              <Badge t={t} at={eightPlums} x={760} y={py} label="8" color={FRUIT[2].color} r={30} size={36} />
            </RowCard>
          </g>
        </Pop>
        {/* each plum sold drops in and becomes a mark */}
        {markAt.map((at, j) => {
          const k = progress(t, at - 0.25, 0.55)
          if (k <= 0 || k >= 1) return null
          const target: Pt = j === 4 ? [360 + 39, py] : [markX(j), py]
          const y = lerp(py - 150, target[1], ease.inQuad(clamp(k / 0.85)))
          const s = 1.15 * (1 - ease.inQuad(clamp((k - 0.6) / 0.4)))
          return <FruitIcon key={j} i={2} x={target[0]} y={y} s={s * spring(t, at - 0.25, { stiffness: 300, damping: 14 })} rot={(1 - k) * 30} />
        })}
        {/* one counting bubble hops along: 5 (the bundle), 6, 7, 8 */}
        {(() => {
          const stops = [asFive, ...counts]
          const xs = [360 + 39, markX(5), markX(6), markX(7)]
          let n = 0
          for (let j = 1; j < 4; j++) if (t >= stops[j] - 0.15) n = j
          const k = n > 0 ? ease.inOutCubic(progress(t, stops[n] - 0.15, 0.25)) : 1
          const x = n > 0 ? lerp(xs[n - 1], xs[n], k) : xs[0]
          const y = py - 84 - Math.sin(k * Math.PI) * 26
          const bump = 1 + 0.25 * (1 - ease.outCubic(progress(t, stops[n], 0.3)))
          return (
            <Pop t={t} at={asFive} x={xs[0]} y={py - 84} out={hero}>
              <g transform={`translate(${x} ${y}) scale(${bump})`}>
                <circle r={26} fill={n === 0 ? M.gold : M.white} stroke={M.ink} strokeWidth={3} />
                <Title x={0} y={1} size={30} color={n === 0 ? M.ink : FRUIT[2].txt}>
                  {5 + n}
                </Title>
              </g>
            </Pop>
          )
        })()}
        <Fade t={t} at={bundle + 0.1} out={asFive - 0.3}>
          <Title x={399} y={py + 72} size={26} color={GOLD_TXT}>
            bundle of 5
          </Title>
        </Fade>
        <Burst t={t} at={eightPlums} x={760} y={py} color={FRUIT[2].color} r={70} />
        <Fade t={t} at={markCue} out={bundle - 0.3}>
          <Title x={620} y={py + 82} size={22} color={M.inkSoft}>
            one mark for each plum
          </Title>
        </Fade>
      </Camera>
    </>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// bars: the tally marks fly into unit blocks that merge into bars
const T_ROW = [140, 205, 270]
const T_X0 = 330
const tallyPos = (r: number, j: number): { x: number; y: number; diag: boolean } => {
  const b = Math.floor(j / 5) * 112
  if (j % 5 === 4) return { x: T_X0 + b + 33, y: T_ROW[r], diag: true }
  return { x: T_X0 + b + (j % 5) * 22, y: T_ROW[r], diag: false }
}

/**
 * dataGraph/bars — "A bar graph shows amounts using bars. Each bar stands for
 * one thing, and the taller a bar is, the bigger its number. A short bar means a
 * small number."
 * The tally chart from before: every mark flies down, turns and stacks as a
 * block — the blocks fuse into bars. The fruit drop under their bars; the tall
 * plum bar glows with its 8, the short pear bar with its 3.
 */
const bars: Scene = ({ t, cue, reduced }: SceneProps) => {
  const shows = cue('shows amounts')
  const using = cue('using bars')
  const oneThing = cue('one thing')
  const taller = cue('the taller')
  const bigger = cue('bigger its number')
  const short = cue('a short bar')
  const small = cue('small number')
  const hero = small + 1
  const idle = idleRamp(t, hero + 1, reduced)
  const flyStart = Math.max(0.9, using - 0.5)
  const flyAt = (r: number, j: number) => flyStart + r * 0.18 + j * 0.06
  const mergeAt = flyAt(2, 7) + 0.7
  const merge = ease.inOutCubic(progress(t, mergeAt, 0.45))
  const tallGlow = interpolate(t, [taller, taller + 0.3, short - 0.2, short + 0.2], [0, 1, 1, 0.25])
  const shortGlow = interpolate(t, [short, short + 0.3, hero, hero + 0.5], [0, 1, 1, 0.25])
  const dimOf = (i: number) => (i === 2 ? 0 : 0.6) * interpolate(t, [taller, taller + 0.3, short, short + 0.3], [0, 1, 1, 0]) + (i === 1 ? 0 : 0.6) * interpolate(t, [short, short + 0.3, hero, hero + 0.5], [0, 1, 1, 0])
  const shine = (i: number) => (idle > 0 ? ((t * 0.32 + i * 0.22) % 1.4) / 0.9 : -1)
  const rowsOut = 1 - progress(t, flyStart + 0.1, 0.5)

  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 440, y: 230, zoom: 1.12 },
          { at: mergeAt, x: 480, y: 280, zoom: 1 },
        ]}
      >
        <Axes t={t} at={shows - 0.2} />
        <Fade t={t} at={shows}>
          <ChartTitle t={t} at={shows} />
        </Fade>
        {/* the tally rows (recap) — their marks leave for the bars */}
        {rowsOut > 0 &&
          FRUIT.map((f, r) => (
            <Pop key={f.name} t={t} at={0.05 + r * 0.1} x={480} y={T_ROW[r]} bounce={16}>
              <g opacity={rowsOut}>
                <rect x={210} y={T_ROW[r] - 30} width={420} height={60} rx={18} fill={M.white} stroke={M.ink} strokeWidth={2.5} />
              </g>
            </Pop>
          ))}
        {rowsOut > 0 &&
          FRUIT.map((f, r) => (
            <Pop key={f.name} t={t} at={0.1 + r * 0.1} x={250} y={T_ROW[r]}>
              <g opacity={rowsOut}>
                <FruitIcon i={r} x={250} y={T_ROW[r]} s={0.75} />
              </g>
            </Pop>
          ))}
        {/* each bar stands for one thing */}
        <XLabels t={t} at={oneThing} bounce={(i) => interpolate(t, [oneThing + i * 0.12 + 0.3, oneThing + i * 0.12 + 0.45, oneThing + i * 0.12 + 0.75], [0, 1, 0])} />
        {/* marks → blocks */}
        {merge < 1 &&
          FRUIT.map((f, r) =>
            Array.from({ length: f.value }, (_, j) => {
              const k = ease.inOutCubic(progress(t, flyAt(r, j), 0.6))
              const from = tallyPos(r, j)
              if (t < 0.1 + r * 0.1) return null
              const cx = lerp(from.x, BX[r], k)
              const cy = lerp(from.y, OY - (j + 0.5) * UH, k) - Math.sin(k * Math.PI) * 30
              const w = lerp(7, BW - 8, k)
              const h = lerp(from.diag ? 70 : 48, UH - 6 + 6 * merge, k)
              const rot = lerp(from.diag ? 58 : 0, 0, k)
              const fill = mixColor(M.ink, f.color, k)
              return (
                <g key={`${r}-${j}`} transform={`translate(${cx} ${cy}) rotate(${rot})`} opacity={1 - merge}>
                  <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={Math.min(w, h) / 2 - k * (Math.min(w, h) / 2 - 6)} fill={fill} stroke={M.ink} strokeWidth={k * 3} />
                </g>
              )
            }),
          )}
        {/* the bars */}
        {merge > 0 &&
          FRUIT.map((f, i) => (
            <g key={f.name} opacity={merge}>
              <Bar i={i} v={f.value} dim={dimOf(i)} glow={i === 2 ? tallGlow : i === 1 ? shortGlow : 0} shine={shine(i)} />
            </g>
          ))}
        {/* taller → bigger */}
        <Fade t={t} at={taller + 0.2} out={short}>
          <Arrow t={t} at={taller + 0.2} from={[BX[2] + BW / 2 + 26, OY - 20]} to={[BX[2] + BW / 2 + 26, yOf(8) + 6]} bend={0} color={FRUIT[2].txt} width={6} dur={0.7} />
        </Fade>
        <TopTag t={t} at={bigger} i={2} size={36} />
        <TopTag t={t} at={small} i={1} size={36} />
        <TopTag t={t} at={hero + 0.2} i={0} size={36} />
        <Burst t={t} at={bigger + 0.05} x={BX[2]} y={yOf(8) - 32} color={M.gold} r={60} />

        {/* the rule, in words */}
        <g transform={`translate(0 ${Math.sin(t * 1.6) * 3 * idle})`}>
          <Fade t={t} at={taller + 0.2}>
            <Title x={PANEL} y={190} size={36} color={FRUIT[2].txt}>
              taller bar
            </Title>
          </Fade>
          <Fade t={t} at={bigger + 0.1}>
            <Title x={PANEL} y={236} size={30} color={M.ink}>
              = bigger number
            </Title>
          </Fade>
          <Fade t={t} at={short + 0.2}>
            <Title x={PANEL} y={318} size={36} color={FRUIT[1].txt}>
              short bar
            </Title>
          </Fade>
          <Fade t={t} at={small + 0.1}>
            <Title x={PANEL} y={364} size={30} color={M.ink}>
              = small number
            </Title>
          </Fade>
        </g>
      </Camera>
    </>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
/** The finished chart that the read / compare steps start from (bars grow in fast). */
function BuiltChart({ t, dim = () => 0, glow = () => 0, idle, scaleY = () => 1, hi, wave }: { t: number; dim?: (i: number) => number; glow?: (i: number) => number; idle: number; scaleY?: (i: number) => number; hi?: (v: number) => number; wave?: (v: number) => number }) {
  return (
    <>
      <Axes t={t} at={0.05} hi={hi} wave={wave} />
      <ChartTitle t={t} at={0.2} />
      {FRUIT.map((f, i) => {
        const g = spring(t, 0.35 + i * 0.12, { stiffness: 150, damping: 15 })
        return <Bar key={f.name} i={i} v={f.value * g} dim={dim(i)} glow={glow(i)} scaleY={scaleY(i)} shine={idle > 0 ? ((t * 0.32 + i * 0.22) % 1.4) / 0.9 : -1} />
      })}
    </>
  )
}

/**
 * dataGraph/read (a check: "Which fruit sold the most?") — "To read a bar, find
 * its top, then slide straight across to the numbers on the side. The apple bar
 * lines up with five, so five apples were sold. The tallest bar shows the
 * biggest number."
 * A gold marker lands on top of the apple bar and slides along a dashed line to
 * the side scale, where the 5 lights up; "5" lands on the bar. Then a scan line
 * drops from the top of the chart: the first bar it touches is the plum bar (8).
 */
const read: Scene = ({ t, cue, reduced }: SceneProps) => {
  const top = cue('find its top')
  const slide = cue('slide straight across')
  const side = cue('numbers on the side')
  const linesUp = cue('lines up with five')
  const fiveApples = cue('five apples')
  const tallest = cue('the tallest bar')
  const biggest = cue('biggest number')
  const hero = biggest + 1.3
  const idle = idleRamp(t, hero + 0.8, reduced)
  const yA = yOf(5)
  const slideK = ease.inOutCubic(progress(t, slide + 0.1, 1.2))
  const marker: Pt = [lerp(BX[0], OX, slideK), yA]
  const apple = interpolate(t, [top - 0.2, top + 0.2, tallest - 0.2, tallest + 0.2], [0, 1, 1, 0])
  const scanY = interpolate(t, [tallest, tallest + 0.9], [yOf(MAXV) - 10, yOf(8)], ease.inOutCubic)
  const scanOn = t > tallest && t < hero + 0.3
  const plumGlow = interpolate(t, [tallest + 0.85, tallest + 1.05], [0, 1])
  const wave = (v: number) => interpolate(t, [side + v * 0.08, side + v * 0.08 + 0.15, side + v * 0.08 + 0.5], [0, 1, 0])
  const hi = (v: number) => Math.max(v === 5 ? interpolate(t, [slide + 1.2, slide + 1.35, hero, hero + 0.6], [0, 1, 1, 0.35]) : 0, v === 8 ? interpolate(t, [biggest, biggest + 0.2], [0, 1]) * 0.8 : 0)

  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 480, y: 280, zoom: 1 },
          { at: top + 0.4, x: 340, y: 285, zoom: 1.12 },
          { at: fiveApples, x: 480, y: 280, zoom: 1 },
        ]}
      >
        <BuiltChart t={t} idle={idle} hi={hi} wave={wave} dim={(i) => (i === 0 ? 0 : apple) * 0.9} glow={(i) => (i === 0 ? apple * 0.6 : i === 2 ? plumGlow : 0)} />
        <XLabels t={t} at={0.5} />
        {/* apple: top → across → 5 */}
        {t > slide && t < tallest + 0.5 && <Draw t={t} at={slide + 0.1} dur={1.2} d={`M ${BX[0]} ${yA} L ${OX} ${yA}`} stroke={FRUIT[0].txt} width={5} dash="12 10" />}
        {t > slide + 0.1 && <line x1={BX[0]} y1={yA} x2={marker[0]} y2={yA} stroke={FRUIT[0].txt} strokeWidth={5} strokeDasharray="12 10" strokeLinecap="round" opacity={1 - progress(t, hero, 0.6) * 0.6} />}
        <Pop t={t} at={top + 0.1} x={marker[0]} y={yA} out={linesUp + 0.6}>
          <circle cx={marker[0]} cy={yA} r={15} fill={M.gold} stroke={M.ink} strokeWidth={4} />
        </Pop>
        <Ring t={t} at={top + 0.15} x={BX[0]} y={yA} r={28} color={M.gold} out={slide + 0.1} />
        <Burst t={t} at={slide + 1.3} x={OX - 26} y={yA} color={M.coral} r={50} />
        <TopTag t={t} at={fiveApples} i={0} size={36} />
        <TopTag t={t} at={hero} i={1} size={36} />
        {/* the tallest: a scan line drops until it touches a bar */}
        {scanOn && (
          <g opacity={1 - progress(t, hero, 0.3)}>
            <line x1={OX} y1={scanY} x2={AX1} y2={scanY} stroke={FRUIT[2].txt} strokeWidth={5} strokeLinecap="round" />
            <circle cx={AX1} cy={scanY} r={8} fill={FRUIT[2].txt} />
          </g>
        )}
        {t > biggest && <Draw t={t} at={biggest} dur={0.6} d={`M ${BX[2]} ${yOf(8)} L ${OX} ${yOf(8)}`} stroke={FRUIT[2].txt} width={5} dash="12 10" />}
        <TopTag t={t} at={tallest + 1.0} i={2} size={38} />
        <Burst t={t} at={tallest + 1.0} x={BX[2]} y={yOf(8) - 32} color={M.gold} r={70} />

        {/* words */}
        <g transform={`translate(0 ${Math.sin(t * 1.6) * 3 * idle})`}>
          <Pop t={t} at={fiveApples + 0.1} x={PANEL} y={200}>
            <FruitIcon i={0} x={PANEL - 112} y={200} s={0.9} />
            <Title x={PANEL - 80} y={202} size={44} color={FRUIT[0].txt} anchor="start">
              5 apples
            </Title>
          </Pop>
          <Pop t={t} at={biggest + 0.2} x={PANEL} y={300}>
            <FruitIcon i={2} x={PANEL - 112} y={300} s={0.9} />
            <Title x={PANEL - 80} y={302} size={44} color={FRUIT[2].txt} anchor="start">
              8 plums
            </Title>
          </Pop>
          <Chip t={t} at={biggest + 0.6} x={PANEL} y={366} text="the most!" color={M.gold} size={26} />
        </g>
      </Camera>
    </>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
/**
 * dataGraph/compare (a check: "How many more apples than pears?") — "How many
 * more plums were sold than apples? Draw a line across from the top of the apple
 * bar. The plum bar reaches three spaces higher: six, seven, eight. Eight minus
 * five equals three!"
 * Plum and apple bars hop as they're named (pear steps back). A dashed line runs
 * from the apple bar's top across the plum bar; the part above it splits into
 * three gold blocks, counted 6, 7, 8, with a brace "3 more"; then 8 − 5 = 3.
 */
const compare: Scene = ({ t, cue, reduced }: SceneProps) => {
  const howMany = cue('how many more')
  const plums = cue('plums')
  const apples = cue('than apples')
  const line = cue('draw a line across')
  const higher = cue('three spaces higher')
  const counts = [cue('six'), cue('seven'), cue('eight')]
  const eightMinus = cue('eight minus')
  const minus = cue('minus')
  const five = cue('five equals')
  const equals = cue('equals three')
  const three = cue('three!')
  const hero = three + 1
  const idle = idleRamp(t, hero + 0.8, reduced)
  const hop = (at: number) => interpolate(t, [at, at + 0.15, at + 0.45], [0, 1, 0])
  const scaleY = (i: number) => 1 + 0.04 * (i === 2 ? hop(plums) : i === 0 ? hop(apples) : 0)
  const pearDim = interpolate(t, [howMany, howMany + 0.4], [0, 0.9])
  const y5 = yOf(5)
  const split = ease.outCubic(progress(t, higher, 0.5))
  const x0 = BX[2] - BW / 2
  const x1 = BX[2] + BW / 2
  const braceK = ease.inOutCubic(progress(t, higher + 0.2, 0.6))
  const tok = (x: number, at: number, txt: string, color: string, size = 66) => (
    <Pop t={t} at={at} x={x} y={250}>
      <Title x={x} y={250} size={size} color={color} stroke={M.white}>
        {txt}
      </Title>
    </Pop>
  )

  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 480, y: 280, zoom: 1 },
          { at: higher, x: 470, y: 250, zoom: 1.12 },
          { at: eightMinus, x: 480, y: 275, zoom: 1 },
        ]}
      >
        <Backdrop t={t} at={higher} x={BX[2]} y={(yOf(5) + yOf(8)) / 2} r={130} color={'#fff1c2'} reduced={reduced} />
        <BuiltChart t={t} idle={idle} scaleY={scaleY} dim={(i) => (i === 1 ? pearDim : 0)} glow={(i) => (i === 2 ? 0.5 * split * (1 - progress(t, hero, 0.5)) : 0)} hi={(v) => (v === 5 ? interpolate(t, [line, line + 0.2], [0, 0.8]) : 0)} />
        <XLabels t={t} at={0.5} bounce={(i) => (i === 2 ? hop(plums) : i === 0 ? hop(apples) : 0)} />
        <TopTag t={t} at={0.9} i={0} size={34} />
        <TopTag t={t} at={1.0} i={2} size={34} />
        {/* the line across from the apple's top */}
        <Draw t={t} at={line + 0.1} dur={0.9} d={`M ${OX} ${y5} L ${x1 + 34} ${y5}`} stroke={FRUIT[0].txt} width={5} dash="12 10" />
        {/* the three spaces above the line */}
        {split > 0 &&
          [0, 1, 2].map((j) => {
            const yb = yOf(5 + j)
            const yt = yOf(6 + j)
            const lit = interpolate(t, [counts[j], counts[j] + 0.12], [0, 1])
            const g = 4 * split
            return (
              <g key={j}>
                <rect x={x0 + 4} y={yt + g / 2} width={BW - 8} height={yb - yt - g} rx={6} fill={mixColor(FRUIT[2].color, M.gold, lit)} stroke={M.ink} strokeWidth={3} opacity={split} />
                <Pop t={t} at={counts[j]} x={BX[2]} y={(yt + yb) / 2}>
                  <Title x={BX[2]} y={(yt + yb) / 2 + 1} size={28} color={M.ink} stroke={M.white}>
                    {6 + j}
                  </Title>
                </Pop>
              </g>
            )
          })}
        {braceK > 0 && <path d={bracePath([x1 + 16, y5], [x1 + 16, y5 - (y5 - yOf(8)) * braceK], 16, 1)} fill="none" stroke={GOLD_TXT} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />}
        <Pop t={t} at={counts[2] + 0.3} x={x1 + 80} y={(y5 + yOf(8)) / 2}>
          <Title x={x1 + 82} y={(y5 + yOf(8)) / 2 - 16} size={36} color={GOLD_TXT} stroke={M.white}>
            3
          </Title>
          <Title x={x1 + 82} y={(y5 + yOf(8)) / 2 + 16} size={22} color={GOLD_TXT} stroke={M.white}>
            more
          </Title>
        </Pop>
        {/* the question, then the number sentence */}
        <Fade t={t} at={howMany + 0.1} out={higher - 0.2}>
          <Kinetic t={t} at={howMany + 0.1} text="how many more?" x={PANEL} y={250} size={34} />
          <g transform={`translate(0 ${Math.sin(t * 2) * 4})`}>
            <FruitIcon i={2} x={PANEL - 40} y={320} s={1} />
            <Title x={PANEL + 10} y={322} size={30} color={M.inkSoft}>
              vs
            </Title>
            <FruitIcon i={0} x={PANEL + 60} y={320} s={1} />
          </g>
        </Fade>
        <g transform={`translate(0 ${Math.sin(t * 1.6) * 3 * idle})`}>
          {tok(PANEL - 116, eightMinus, '8', FRUIT[2].txt)}
          {tok(PANEL - 58, minus, '−', M.ink, 60)}
          {tok(PANEL, five, '5', FRUIT[0].txt)}
          {tok(PANEL + 58, equals, '=', M.ink, 60)}
          {tok(PANEL + 116, three, '3', GOLD_TXT, 74)}
          <Chip t={t} at={three + 0.5} x={PANEL} y={330} text="3 more plums" color={M.gold} size={26} />
        </g>
        <Burst t={t} at={three + 0.05} x={PANEL + 116} y={250} color={M.gold} r={70} />
      </Camera>
    </>
  )
}

export const dataGraphScenes: Record<string, Scene> = { tally, bars, read, compare }
