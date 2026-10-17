/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { ease, interpolate, progress, pulse, slicePath, spring } from '../anim'
import { Arrow, Burst, Camera, Chip, Draw, Fade, Kinetic, Paper, Pop, Ring, Title } from '../kit'
import { M } from '../palette'
import type { Scene, SceneProps } from '../types'

// ── shared pizza ─────────────────────────────────────────────────────────────
const CRUST = '#f2b866'
const CHEESE = '#ffd96a'
const PEPPERONI: [number, number][] = [
  [0.55, 0.5], [0.7, 1.25], [0.45, 2.1], [0.68, 2.75], [0.5, 3.6], [0.72, 4.3], [0.42, 5.0], [0.66, 5.75],
]

/** One pizza slice (crust + cheese + its pepperoni), angles from 12 o'clock clockwise. */
function Slice({ cx, cy, r, a0, a1, cheese = CHEESE, glow = false }: { cx: number; cy: number; r: number; a0: number; a1: number; cheese?: string; glow?: boolean }) {
  return (
    <g filter={glow ? 'url(#sq-glow)' : undefined}>
      {glow && <path d={slicePath(cx, cy, r + 6, a0 - 0.04, a1 + 0.04)} fill="none" stroke={M.gold} strokeWidth={12} strokeLinejoin="round" />}
      <path d={slicePath(cx, cy, r, a0, a1)} fill={CRUST} stroke={M.ink} strokeWidth={4} strokeLinejoin="round" />
      <path d={slicePath(cx, cy, r * 0.86, a0, a1)} fill={cheese} />
      {PEPPERONI.filter(([, a]) => a >= a0 && a < a1).map(([k, a], i) => (
        <circle key={i} cx={cx + Math.sin(a) * r * k} cy={cy - Math.cos(a) * r * k} r={r * 0.09} fill={M.coral} stroke={M.ink} strokeWidth={2} />
      ))}
    </g>
  )
}

/** A stacked fraction (numerator / bar / denominator) whose parts appear on cue. */
function Fraction({ t, x, y, num, den, numAt, denAt, barAt, size = 96, numColor = M.ink, denColor = M.ink }: { t: number; x: number; y: number; num: string; den: string; numAt: number; denAt: number; barAt: number; size?: number; numColor?: string; denColor?: string }) {
  return (
    <g>
      <Draw t={t} at={barAt} dur={0.45} d={`M ${x - size * 0.55} ${y} L ${x + size * 0.55} ${y}`} width={size * 0.1} />
      <Pop t={t} at={numAt} x={x} y={y - size * 0.62}>
        <Title x={x} y={y - size * 0.62} size={size} color={numColor} stroke={M.white}>
          {num}
        </Title>
      </Pop>
      <Pop t={t} at={denAt} x={x} y={y + size * 0.66}>
        <Title x={x} y={y + size * 0.66} size={size} color={denColor} stroke={M.white}>
          {den}
        </Title>
      </Pop>
    </g>
  )
}

/**
 * fractions/parts — "A fraction shows part of a whole. The bottom number tells
 * how many equal pieces the whole is cut into, and the top number tells how many
 * of those pieces we have."
 * A whole pizza pops in; the 4 appears and the knife cuts 4 equal pieces (they
 * breathe apart and get counted); then the 1 appears and one slice glows gold
 * and slides toward it.
 */
const parts: Scene = ({ t, cue }: SceneProps) => {
  const whole = cue('part of a whole')
  const bottom = cue('the bottom number')
  const equal = cue('equal pieces')
  const cut = cue('cut into')
  const top = cue('the top number')
  const have = cue('we have')
  const cx = 320
  const cy = 280
  const r = 150
  const n = 4
  // pieces spread apart, then settle back
  const spread = interpolate(t, [equal, equal + 0.5, cut + 0.8, cut + 1.4], [0, 22, 22, 6], ease.inOutCubic)
  const lift = ease.outBack(progress(t, top + 0.3, 0.8)) // the chosen slice slides out
  const bob = t > top + 1.2 ? Math.sin((t - top) * 2.2) * 4 : 0
  return (
    <>
      <Paper />
      <Camera
        t={t}
        keys={[
          { at: 0, x: 480, y: 270, zoom: 1 },
          { at: equal, x: 440, y: 280, zoom: 1.08 },
          { at: top, x: 480, y: 270, zoom: 1 },
        ]}
      >
        {/* the pizza: one whole, then four equal slices */}
        <Pop t={t} at={0.15} x={cx} y={cy} bounce={10}>
          <g filter="url(#sq-shadow)">
            {Array.from({ length: n }, (_, i) => {
              const a0 = (i / n) * Math.PI * 2
              const a1 = ((i + 1) / n) * Math.PI * 2
              const mid = (a0 + a1) / 2
              const chosen = i === 0
              const d = spread + (chosen ? lift * 46 : 0)
              const dx = Math.sin(mid) * d + (chosen ? lift * 60 : 0)
              const dy = -Math.cos(mid) * d + (chosen ? bob : 0)
              const cheese = chosen && t > top + 0.3 ? '#ffe9a8' : CHEESE
              return (
                <g key={i} transform={`translate(${dx} ${dy})`}>
                  <Slice cx={cx} cy={cy} r={r} a0={a0} a1={a1} cheese={cheese} glow={chosen && t > top + 0.3} />
                </g>
              )
            })}
          </g>
        </Pop>
        {/* knife lines draw across before the pieces separate */}
        {t < equal + 0.5 && (
          <>
            <Draw t={t} at={bottom + 0.5} dur={0.4} d={`M ${cx} ${cy - r - 14} L ${cx} ${cy + r + 14}`} stroke={M.white} width={7} />
            <Draw t={t} at={bottom + 0.9} dur={0.4} d={`M ${cx - r - 14} ${cy} L ${cx + r + 14} ${cy}`} stroke={M.white} width={7} />
          </>
        )}
        {/* count the pieces: 1, 2, 3, 4 */}
        {Array.from({ length: n }, (_, i) => {
          const mid = ((i + 0.5) / n) * Math.PI * 2
          const px = cx + Math.sin(mid) * (r * 0.55 + spread)
          const py = cy - Math.cos(mid) * (r * 0.55 + spread)
          return (
            <Pop key={i} t={t} at={cut + i * 0.25} x={px} y={py} out={top}>
              <circle cx={px} cy={py} r={24} fill={M.white} stroke={M.ink} strokeWidth={3} />
              <Title x={px} y={py + 1} size={30}>
                {i + 1}
              </Title>
            </Pop>
          )
        })}
        <Chip t={t} at={0.6} x={cx} y={cy + r + 52} text="1 whole" color={M.mint} out={whole + 1.2} />
        <Chip t={t} at={cut + 1.1} x={cx} y={cy + r + 56} text="4 equal pieces" color={M.sky} out={top} />

        {/* the fraction */}
        <Fraction t={t} x={720} y={270} num="1" den="4" barAt={bottom - 0.2} denAt={bottom + 0.1} numAt={top + 0.1} numColor={M.ink} />
        <Ring t={t} at={bottom + 0.2} x={720} y={333} r={58} color={M.coral} out={top} />
        <Ring t={t} at={top + 0.2} x={720} y={211} r={58} color={M.gold} />
        <Fade t={t} at={bottom + 0.4} out={top}>
          <Title x={720} y={430} size={30} color={M.coral}>
            how many pieces
          </Title>
        </Fade>
        <Fade t={t} at={top + 0.4}>
          <Title x={720} y={110} size={30} color={'#c98a00'}>
            how many we have
          </Title>
        </Fade>
        <Arrow t={t} at={top + 0.9} from={[470, 170]} to={[655, 205]} bend={-0.2} color={'#c98a00'} />
        <Burst t={t} at={have} x={720} y={211} color={M.gold} r={80} />
      </Camera>
      <Kinetic t={t} at={have + 0.2} text="1 out of 4 equal pieces" x={480} y={500} size={40} />
    </>
  )
}

// ── fraction strips ──────────────────────────────────────────────────────────
const STRIP_X = 250
const STRIP_W = 520
const STRIP_H = 74

/** A fraction strip of `d` equal cells; the first `n` fill in one by one from `fillAt`. */
function Strip({ t, y, d, n, color, at, fillAt }: { t: number; y: number; d: number; n: number; color: string; at: number; fillAt: number }) {
  const w = STRIP_W / d
  return (
    <Pop t={t} at={at} x={STRIP_X + STRIP_W / 2} y={y + STRIP_H / 2} bounce={14}>
      <g filter="url(#sq-shadow)">
        <rect x={STRIP_X} y={y} width={STRIP_W} height={STRIP_H} rx={14} fill={M.white} stroke={M.ink} strokeWidth={4} />
        {Array.from({ length: n }, (_, i) => {
          const k = ease.outCubic(progress(t, fillAt + i * 0.35, 0.4))
          return k > 0 ? <rect key={i} x={STRIP_X + i * w + 4} y={y + 4} width={(w - 8) * k} height={STRIP_H - 8} rx={10} fill={color} /> : null
        })}
        {Array.from({ length: d - 1 }, (_, i) => (
          <line key={i} x1={STRIP_X + (i + 1) * w} y1={y} x2={STRIP_X + (i + 1) * w} y2={y + STRIP_H} stroke={M.ink} strokeWidth={4} />
        ))}
      </g>
    </Pop>
  )
}

/**
 * fractions/equivalent — "Watch this. Two fourths covers the same amount of space
 * as one half. They look like different numbers, but they are the exact same
 * amount. We call those equivalent fractions."
 * 2/4 fills on one strip, 1/2 on another; a dashed line drops through both, the
 * half slides down onto the two fourths and fits exactly; "1/2 = 2/4".
 */
const equivalent: Scene = ({ t, cue }: SceneProps) => {
  const fourths = cue('two fourths')
  const half = cue('one half')
  const same = cue('same amount of space')
  const diff = cue('different numbers')
  const exact = cue('exact same amount')
  const equiv = cue('equivalent fractions')
  const topY = 150
  const botY = 300
  // the half strip slides down onto the fourths, then back up
  const slide = interpolate(t, [same + 0.6, same + 1.4, diff - 0.2, diff + 0.5], [0, botY - topY, botY - topY, 0], ease.inOutCubic)
  const wobble = t > diff && t < exact ? Math.sin((t - diff) * 14) * 4 * (1 - progress(t, diff, exact - diff)) : 0
  const lineX = STRIP_X + STRIP_W / 2
  return (
    <>
      <Paper />
      {/* bottom: 2/4 */}
      <Strip t={t} y={botY} d={4} n={2} color={M.coral} at={fourths - 0.2} fillAt={fourths + 0.2} />
      <Pop t={t} at={fourths} x={160} y={botY + STRIP_H / 2}>
        <g transform={`rotate(${-wobble} 160 ${botY + STRIP_H / 2})`}>
          <Title x={160} y={botY + STRIP_H / 2} size={54} color={M.coral} stroke={M.white}>
            2/4
          </Title>
        </g>
      </Pop>
      {/* top: 1/2 (slides down over the fourths to compare) */}
      <g transform={`translate(0 ${slide})`} opacity={slide > 4 ? 0.82 : 1}>
        <Strip t={t} y={topY} d={2} n={1} color={M.mint} at={half - 0.2} fillAt={half + 0.15} />
      </g>
      <Pop t={t} at={half} x={160} y={topY + STRIP_H / 2}>
        <g transform={`rotate(${wobble} 160 ${topY + STRIP_H / 2})`}>
          <Title x={160} y={topY + STRIP_H / 2} size={54} color={'#2a9b75'} stroke={M.white}>
            1/2
          </Title>
        </g>
      </Pop>
      {/* the match line */}
      <Draw t={t} at={same} dur={0.6} d={`M ${lineX} ${topY - 34} L ${lineX} ${botY + STRIP_H + 34}`} stroke={M.ink} width={4} dash="10 10" />
      <Burst t={t} at={same + 1.45} x={lineX} y={botY + STRIP_H / 2} color={M.gold} r={70} />
      <Chip t={t} at={same + 1.5} x={lineX + 170} y={botY + STRIP_H + 56} text="same space!" color={M.gold} out={exact} />
      {/* question marks while they "look different" */}
      <Fade t={t} at={diff} out={exact}>
        <Title x={160} y={topY + STRIP_H + 40} size={40} color={M.inkSoft}>
          ?
        </Title>
      </Fade>
      {/* 1/2 = 2/4 */}
      <g transform={`translate(0 ${-6 * pulse(t, 1.4) * (t > equiv ? 1 : 0)})`}>
        <Pop t={t} at={exact} x={480} y={482}>
          <Title x={480} y={482} size={64} stroke={M.white}>
            <tspan fill={'#2a9b75'}>1/2</tspan>
            <tspan fill={M.ink}> = </tspan>
            <tspan fill={M.coral}>2/4</tspan>
          </Title>
        </Pop>
      </g>
      <Kinetic t={t} at={equiv} text="equivalent fractions" x={480} y={70} size={48} color={M.ink} />
      <Burst t={t} at={equiv + 0.4} x={250} y={70} color={M.pink} r={50} />
      <Burst t={t} at={equiv + 0.55} x={710} y={70} color={M.sea} r={50} />
      {/* idle sparkle on the finished equation */}
      {t > equiv + 1 && spring(t, equiv + 1) > 0.5 && <circle cx={612} cy={448} r={6 + 3 * pulse(t, 0.9)} fill={M.gold} />}
    </>
  )
}

export const fractionsScenes: Record<string, Scene> = { parts, equivalent }
