/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { ease, lerp, progress, spring, wobble } from '../anim'
import { Burst, Draw, Glow, Paper, Pop, T, Title } from '../kit'
import { M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { PointerHand } from './_kart'
import { LengthThingArt, MEASURE_PALETTE, START_GREEN } from '../../../games/listenPlay/activities/measureArt'
import { UnitArt } from '../../../games/listenPlay/activities/unitsArt'

/*
 * 1st-grade measuring colour code (whole lesson), the same pictures as Measure
 * Marsh: lengths start at a GREEN start line; a DASHED line marks each end;
 * the order goes in GOLD number badges (1, 2, 3); paper clips lie end to end
 * under the thing measured. On the clock the short hand is INK and the long
 * hand CORAL (the Listen & Play clock); a digital clock shows the time too.
 * Nothing to read but numerals.
 */

const COLORS = { green: MEASURE_PALETTE[6], coral: MEASURE_PALETTE[0], mint: MEASURE_PALETTE[2], gold: MEASURE_PALETTE[1], blue: MEASURE_PALETTE[3], lilac: MEASURE_PALETTE[4] }

/** 0 → 1 → 0 over `dur` from `at` (a hop). */
const bump = (t: number, at: number, dur = 0.36) => {
  const k = progress(t, at, dur)
  return k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI)
}

/** "Your turn": a hand waves from a corner and taps the air. */
function TurnHand({ t, at, x = 892, y = 520 }: { t: number; at: number; x?: number; y?: number }) {
  return (
    <Pop t={t} at={at} x={x} y={y} bounce={11}>
      <T x={x} y={y - bump(t, at + 0.5, 0.4) * 22} r={-22 + wobble(t, at + 0.3, { amp: 14, freq: 1.6, decay: 2.6 })}>
        <PointerHand press={bump(t, at + 0.5, 0.4)} />
      </T>
    </Pop>
  )
}

/** A gold number badge that pops in. */
function NumBadge({ t, at, x, y, n }: { t: number; at: number; x: number; y: number; n: number }) {
  return (
    <Pop t={t} at={at} x={x} y={y} bounce={10}>
      <circle cx={x} cy={y} r={30} fill={M.gold} stroke={M.ink} strokeWidth={5} />
      <Title x={x} y={y + 2} size={38}>
        {n}
      </Title>
    </Pop>
  )
}

/** The green start line with its flag, drawing on at `at`. */
function StartLine({ t, at, x, y0, y1 }: { t: number; at: number; x: number; y0: number; y1: number }) {
  return (
    <>
      <Draw t={t} at={at} dur={0.5} d={`M ${x} ${y1} V ${y0}`} stroke={START_GREEN} width={8} />
      <Pop t={t} at={at + 0.4} x={x} y={y0}>
        <path d={`M ${x} ${y0} L ${x + 34} ${y0 + 13} L ${x} ${y0 + 26} Z`} fill={START_GREEN} stroke={M.ink} strokeWidth={3} strokeLinejoin="round" />
      </Pop>
    </>
  )
}

// ── order ────────────────────────────────────────────────────────────────────

const U = 64
const X0 = 150
const ROWS = [150, 280, 410]
const SIZES = [5, 9, 3]
const STARTS = [3, 0, 5]

/**
 * g1Measure/order — "Line them up at the start. Look at the ends. Longest
 * first, then the next one, then the shortest!" Three ribbons, out of line (the
 * short ones sticking out furthest); they slide back to the green start line;
 * a dashed line marks each end; then the badges 1, 2, 3 pop at the ends of
 * the longest, the next and the shortest, on their words.
 */
const order: Scene = ({ t, cue }: SceneProps) => {
  const line = cue('Line them up')
  const slide = ease.inOutCubic(progress(t, cue('at the start'), 0.9))
  const ends = cue('Look at the ends')
  const colors = [COLORS.blue, COLORS.coral, COLORS.mint]
  const badgeAt = [cue('next one'), cue('Longest first'), cue('the shortest')]
  const badgeN = [2, 1, 3]
  return (
    <>
      <Paper />
      <StartLine t={t} at={line} x={X0} y0={ROWS[0] - 80} y1={ROWS[2] + 70} />
      {ROWS.map((y, i) => {
        const x = X0 + lerp(STARTS[i], 0, slide) * U
        return (
          <Pop key={i} t={t} at={0.1 + i * 0.15} x={x + (SIZES[i] * U) / 2} y={y}>
            <T x={x} y={y}>
              <LengthThingArt thing="ribbon" len={SIZES[i] * U} thick={62} unit={U} color={colors[i]} />
            </T>
          </Pop>
        )
      })}
      {ROWS.map((y, i) => {
        const k = ease.outCubic(progress(t, ends + i * 0.15, 0.4))
        if (k <= 0 || slide < 0.99) return null
        const x = X0 + SIZES[i] * U
        return <path key={`e${i}`} d={`M ${x} ${y - 52} V ${y + 52}`} stroke={M.ink} strokeWidth={5} strokeDasharray="12 10" strokeLinecap="round" opacity={k} />
      })}
      {ROWS.map((y, i) => (
        <NumBadge key={`b${i}`} t={t} at={badgeAt[i]} x={X0 + SIZES[i] * U + 52} y={y} n={badgeN[i]} />
      ))}
      <Burst t={t} at={badgeAt[2] + 0.4} x={X0 + SIZES[1] * U + 52} y={ROWS[1]} r={70} />
    </>
  )
}

// ── paper clips ──────────────────────────────────────────────────────────────

const CU = 92
const CX = 170

/** Paper clips under a thing, `n` of them, laid one by one from `at` (`gap` s apart), on the row y. */
function ClipRow({ t, at, n, y, gap = 0.32 }: { t: number; at: number; n: number; y: number; gap?: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, k) => {
        const s = spring(t, at + k * gap, { stiffness: 260, damping: 16 })
        if (s <= 0.01) return null
        return (
          <g key={k} transform={`translate(0 ${-(1 - Math.min(1, s)) * 30})`} opacity={Math.min(1, s * 1.5)}>
            <UnitArt unit="clip" x={CX + k * CU} y={y} u={CU} i={k} />
          </g>
        )
      })}
    </>
  )
}

/**
 * g1Measure/clips — "Lay paper clips end to end. No gaps, and no overlaps.
 * This pencil is five clips long. Your turn!" A pencil at the start line; five
 * paper clips are laid under it one by one, end to end; on "five clips long"
 * each gets its number; on "Your turn" a ribbon with three clips under it
 * pops in below. (The check: how many paper clips long is the ribbon?)
 */
const clips: Scene = ({ t, cue }: SceneProps) => {
  const lay = cue('end to end')
  const count = cue('five clips long')
  const turn = cue('Your turn')
  const out = turn - 0.1
  return (
    <>
      <Paper />
      <StartLine t={t} at={0.1} x={CX} y0={60} y1={500} />
      <Pop t={t} at={0.25} x={CX + 2.5 * CU} y={130} out={out}>
        <T x={CX} y={130}>
          <LengthThingArt thing="pencil" len={5 * CU} thick={56} unit={CU} color={COLORS.gold} />
        </T>
      </Pop>
      {t < out + 0.3 && (
        <g opacity={1 - ease.inOutCubic(progress(t, out, 0.3))}>
          <ClipRow t={t} at={lay} n={5} y={215} />
          {Array.from({ length: 5 }, (_, k) => (
            <NumBadge key={k} t={t} at={count + k * 0.22} x={CX + k * CU + CU / 2} y={290} n={k + 1} />
          ))}
        </g>
      )}
      <Glow t={t} at={cue('No gaps')} x={CX + 2.5 * CU} y={215} r={260} color={M.mint} out={cue('This pencil')} breathe={false} />
      <Pop t={t} at={turn} x={CX + 1.5 * CU} y={330}>
        <T x={CX} y={330}>
          <LengthThingArt thing="ribbon" len={3 * CU} thick={60} unit={CU} color={COLORS.lilac} />
        </T>
      </Pop>
      {t > turn && <ClipRow t={t} at={turn + 0.3} n={3} y={420} gap={0.2} />}
      <TurnHand t={t} at={turn + 0.4} />
    </>
  )
}

// ── the clock ────────────────────────────────────────────────────────────────

const CLX = 380
const CLY = 280
const R = 210

/**
 * A big clock, the Listen & Play clock's proportions (numbers 1–12, the short
 * hour hand in ink, the long minute hand in coral). Angles in degrees from 12.
 */
function BigClock({ hourDeg, minuteDeg, glowShort = 0, glowLong = 0 }: { hourDeg: number; minuteDeg: number; glowShort?: number; glowLong?: number }) {
  const k = R / 45
  const tip = (deg: number, len: number) => {
    const a = (deg * Math.PI) / 180
    return { x: CLX + Math.sin(a) * len * k, y: CLY - Math.cos(a) * len * k }
  }
  const h = tip(hourDeg, 16)
  const m = tip(minuteDeg, 23.5)
  return (
    <g>
      <circle cx={CLX} cy={CLY} r={R} fill="#fffaf0" stroke={M.ink} strokeWidth={10} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        const big = i % 3 === 0
        const r0 = (big ? 35 : 37.5) * k
        return <line key={i} x1={CLX + Math.sin(a) * r0} y1={CLY - Math.cos(a) * r0} x2={CLX + Math.sin(a) * 41 * k} y2={CLY - Math.cos(a) * 41 * k} stroke={M.ink} strokeWidth={big ? 9 : 5} strokeLinecap="round" />
      })}
      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
        const a = ((n % 12) / 12) * Math.PI * 2
        return (
          <Title key={n} x={CLX + Math.sin(a) * 30.5 * k} y={CLY - Math.cos(a) * 30.5 * k + 4} size={n % 3 === 0 ? 50 : 44}>
            {n}
          </Title>
        )
      })}
      {glowShort > 0 && <line x1={CLX} y1={CLY} x2={h.x} y2={h.y} stroke={M.gold} strokeWidth={46} strokeLinecap="round" opacity={0.55 * glowShort} />}
      {glowLong > 0 && <line x1={CLX} y1={CLY} x2={m.x} y2={m.y} stroke={M.gold} strokeWidth={40} strokeLinecap="round" opacity={0.55 * glowLong} />}
      <line x1={CLX} y1={CLY} x2={h.x} y2={h.y} stroke={M.ink} strokeWidth={30} strokeLinecap="round" />
      <line x1={CLX} y1={CLY} x2={m.x} y2={m.y} stroke={MEASURE_PALETTE[0]} strokeWidth={20} strokeLinecap="round" />
      <circle cx={CLX} cy={CLY} r={22} fill={M.gold} stroke={M.ink} strokeWidth={8} />
    </g>
  )
}

/** A digital clock showing `text`, popping in at (x, y). */
function Digital({ t, at, x, y, text }: { t: number; at: number; x: number; y: number; text: string }) {
  return (
    <Pop t={t} at={at} x={x} y={y} bounce={10}>
      <rect x={x - 130} y={y - 70} width={260} height={140} rx={30} fill="#8ab8ff" stroke={M.ink} strokeWidth={7} />
      <rect x={x - 106} y={y - 48} width={212} height={96} rx={16} fill="#22313f" stroke={M.ink} strokeWidth={5} />
      <Title x={x} y={y + 4} size={72} color="#7cf0b4">
        {text}
      </Title>
    </Pop>
  )
}

/**
 * g1Measure/clock — "This is a clock. The short hand shows the hour. The long
 * hand points up to twelve. It is three o'clock!" The clock pops in at 3:00;
 * the short hand glows on "short hand", the long hand on "long hand"; on
 * "three o'clock" a digital clock pops in beside it showing 3:00.
 */
const clock: Scene = ({ t, cue }: SceneProps) => {
  const pop = spring(t, cue('a clock') - 0.3, { stiffness: 190, damping: 14 })
  const short = cue('short hand')
  const long = cue('long hand')
  const glowS = ease.outCubic(progress(t, short, 0.4)) * (1 - ease.inOutCubic(progress(t, long - 0.2, 0.4)))
  const glowL = ease.outCubic(progress(t, long, 0.4)) * (1 - ease.inOutCubic(progress(t, cue('It is') - 0.1, 0.4)))
  return (
    <>
      <Paper />
      <T x={CLX} y={CLY} s={Math.max(0, pop)}>
        <T x={-CLX} y={-CLY}>
          <BigClock hourDeg={90} minuteDeg={0} glowShort={glowS} glowLong={glowL} />
        </T>
      </T>
      <Digital t={t} at={cue("three o'clock")} x={790} y={280} text="3:00" />
      <Burst t={t} at={cue("three o'clock") + 0.3} x={790} y={280} r={140} />
    </>
  )
}

/**
 * g1Measure/halfPast — "Now the long hand goes down to six. The short hand
 * moves halfway to four. It is half past three! Your turn!" From 3:00 the long
 * hand sweeps round to 6 while the short hand moves on half a step, to halfway
 * between 3 and 4 (a gold wedge between them glows on "halfway"); on "half past
 * three" the digital clock shows 3:30; a hand waves on "Your turn".
 */
const halfPast: Scene = ({ t, cue }: SceneProps) => {
  const sweep = ease.inOutCubic(progress(t, cue('goes down'), 1.6))
  const half = cue('halfway')
  const w = ease.outCubic(progress(t, half, 0.5))
  const k = R / 45
  const wedge = (a0: number, a1: number, r: number) => {
    const p = (deg: number) => [CLX + Math.sin((deg * Math.PI) / 180) * r, CLY - Math.cos((deg * Math.PI) / 180) * r]
    const [x0, y0] = p(a0)
    const [x1, y1] = p(a1)
    return `M ${CLX} ${CLY} L ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1} Z`
  }
  return (
    <>
      <Paper />
      {w > 0 && <path d={wedge(90, 120, 34 * k)} fill={M.gold} opacity={0.45 * w} />}
      <BigClock hourDeg={90 + 15 * sweep} minuteDeg={180 * sweep} glowLong={bump(t, cue('long hand'), 1.2)} glowShort={bump(t, cue('short hand'), 1.2)} />
      <Digital t={t} at={cue('half past three')} x={790} y={280} text="3:30" />
      <Burst t={t} at={cue('half past three') + 0.3} x={790} y={280} r={140} />
      <TurnHand t={t} at={cue('Your turn')} />
    </>
  )
}

export const g1MeasureScenes: Record<string, Scene> = { order, clips, clock, halfPast }
