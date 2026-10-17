/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { arc, clamp, ease, interpolate, lerp, mixColor, progress, pulse, slicePath, spring, wobble } from '../anim'
import { Arrow, Badge, Brace, Burst, Camera, Chip, Confetti, Draw, Fade, Flip, Pop, Paper, Ring, T, Title, Twinkle, Words } from '../kit'
import { textWidth } from '../layout'
import { DEEP, M } from '../palette'
import { Crown } from '../shapes'
import type { Scene, SceneProps } from '../types'

/*
 * Fractions colour code (whole lesson):
 *   ring around a BOTTOM number = coral ("how many equal pieces")
 *   ring around a TOP number    = gold  ("how many pieces we have")
 *   the first fraction named    = mint / teal, the second = coral
 *   the bigger fraction gets the crown.
 */
const A = { fill: M.mint, ink: DEEP.mint }
const B = { fill: M.coral, ink: DEEP.coral }

// ── shared pizza ─────────────────────────────────────────────────────────────
const CRUST = '#f2b866'
const CHEESE = '#ffd96a'
const PEPPERONI: [number, number][] = [
  [0.55, 0.5], [0.7, 1.25], [0.45, 2.1], [0.68, 2.75], [0.5, 3.6], [0.72, 4.3], [0.42, 5.0], [0.66, 5.75],
]

/** One pizza slice (crust + cheese + its pepperoni), angles from 12 o'clock clockwise. `dim` fades it toward the paper. */
function Slice({ cx, cy, r, a0, a1, cheese = CHEESE, glow = false, dim = 0 }: { cx: number; cy: number; r: number; a0: number; a1: number; cheese?: string; glow?: boolean; dim?: number }) {
  const crust = mixColor(CRUST, M.paperDeep, dim)
  const ch = mixColor(cheese, M.paper, dim)
  const pep = mixColor(M.coral, M.paperDeep, dim)
  return (
    <g filter={glow ? 'url(#sq-glow)' : undefined}>
      {glow && <path d={slicePath(cx, cy, r + 6, a0 - 0.04, a1 + 0.04)} fill="none" stroke={M.gold} strokeWidth={12} strokeLinejoin="round" />}
      <path d={slicePath(cx, cy, r, a0, a1)} fill={crust} stroke={M.ink} strokeWidth={4} strokeLinejoin="round" />
      <path d={slicePath(cx, cy, r * 0.86, a0, a1)} fill={ch} />
      {PEPPERONI.filter(([, a]) => a >= a0 && a < a1).map(([k, a], i) => (
        <circle key={i} cx={cx + Math.sin(a) * r * k} cy={cy - Math.cos(a) * r * k} r={r * 0.09} fill={pep} stroke={M.ink} strokeWidth={2} />
      ))}
    </g>
  )
}

/** A chef's knife, tip at (0, 0), blade pointing down (+y). */
function Knife() {
  return (
    <g>
      <path d="M -9 -96 L 9 -96 L 9 -16 Q 4 -2 0 0 Q -2 -8 -9 -14 Z" fill="#e8eef5" stroke={M.ink} strokeWidth={3.5} strokeLinejoin="round" />
      <path d="M 3 -90 L 3 -24" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />
      <rect x={-11} y={-146} width={22} height={50} rx={8} fill={M.wood} stroke={M.ink} strokeWidth={3.5} />
      <circle cx={0} cy={-133} r={3} fill={M.paper} />
      <circle cx={0} cy={-112} r={3} fill={M.paper} />
    </g>
  )
}

// ── stacked fractions ────────────────────────────────────────────────────────

/** Width of a stacked fraction at `size`. */
const fracW = (num: string, den: string, size: number) => Math.max(textWidth(num, size), textWidth(den, size)) + size * 0.34

/**
 * A stacked fraction centred on its bar at (x, y). Parts pop in at `numAt` /
 * `denAt` (default `at`); `flipAt` + `to` flips it to another fraction.
 */
function Frac({ t, x, y, num, den, size = 64, color = M.ink, at = -1, numAt, denAt, barAt, flipAt, to, toColor, numColor, denColor }: { t: number; x: number; y: number; num: string; den: string; size?: number; color?: string; at?: number; numAt?: number; denAt?: number; barAt?: number; flipAt?: number; to?: [string, string]; toColor?: string; numColor?: string; denColor?: string }) {
  const w = fracW(to ? (to[0].length > num.length ? to[0] : num) : num, to ? (to[1].length > den.length ? to[1] : den) : den, size)
  const ny = y - size * 0.6
  const dy = y + size * 0.64
  const nc = numColor ?? color
  const dc = denColor ?? color
  return (
    <g>
      <Draw t={t} at={barAt ?? at} dur={0.4} d={`M ${x - w / 2} ${y} L ${x + w / 2} ${y}`} stroke={color} width={size * 0.1} />
      <Pop t={t} at={numAt ?? at} x={x} y={ny}>
        {flipAt !== undefined && to ? (
          <Flip t={t} at={flipAt} x={x} y={ny} from={num} to={to[0]} size={size} color={nc} toColor={toColor ?? nc} />
        ) : (
          <Title x={x} y={ny} size={size} color={nc} stroke={M.white}>
            {num}
          </Title>
        )}
      </Pop>
      <Pop t={t} at={denAt ?? at} x={x} y={dy}>
        {flipAt !== undefined && to ? (
          <Flip t={t} at={flipAt + 0.08} x={x} y={dy} from={den} to={to[1]} size={size} color={dc} toColor={toColor ?? dc} />
        ) : (
          <Title x={x} y={dy} size={size} color={dc} stroke={M.white}>
            {den}
          </Title>
        )}
      </Pop>
    </g>
  )
}

type EqTok = { frac: [string, string]; color: string; at: number; flipAt?: number; to?: [string, string] } | { op: string; at: number; color?: string }

/** Centres of the tokens of a stacked-fraction equation laid out around x. */
function eqLayout(toks: EqTok[], x: number, size: number): number[] {
  const gap = size * 0.4
  const ws = toks.map((k) => ('frac' in k ? fracW(k.frac[0], k.frac[1], size) : textWidth(k.op, size * 1.1)))
  const total = ws.reduce((a, b) => a + b, 0) + gap * (toks.length - 1)
  let cx = x - total / 2
  return ws.map((w) => {
    const c = cx + w / 2
    cx += w + gap
    return c
  })
}

/** "1/2 = 2/4"-style line of stacked fractions and operators, each popping in on cue. */
function FracEq({ t, x, y, size = 50, toks }: { t: number; x: number; y: number; size?: number; toks: EqTok[] }) {
  const xs = eqLayout(toks, x, size)
  return (
    <g>
      {toks.map((k, i) =>
        'frac' in k ? (
          <Frac key={i} t={t} x={xs[i]} y={y} num={k.frac[0]} den={k.frac[1]} size={size} color={k.color} at={k.at} flipAt={k.flipAt} to={k.to} />
        ) : (
          <Pop key={i} t={t} at={k.at} x={xs[i]} y={y} bounce={9}>
            <Title x={xs[i]} y={y + 2} size={size * 1.1} color={k.color ?? M.ink} stroke={M.white}>
              {k.op}
            </Title>
          </Pop>
        ),
      )}
    </g>
  )
}

// ── fraction bars ────────────────────────────────────────────────────────────

interface CellFill {
  k: number
  color: string
}

/**
 * A fraction bar of `d` equal cells. `fill(i)` says how full cell i is (0…1,
 * growing left→right) and its colour. `sub` > 1 splits every cell into `sub`
 * smaller ones; `subK(i)` (0…1) draws those new cut lines on.
 */
function Bar({ x, y, w, h = 74, d, fill, sub = 1, subK, ghost }: { x: number; y: number; w: number; h?: number; d: number; fill: (i: number) => CellFill | null; sub?: number; subK?: (i: number) => number; ghost?: (i: number) => string | null }) {
  const cw = w / d
  return (
    <g filter="url(#sq-shadow)">
      <rect x={x} y={y} width={w} height={h} rx={14} fill={M.white} stroke={M.ink} strokeWidth={4} />
      {Array.from({ length: d }, (_, i) => {
        const g = ghost?.(i)
        const f = fill(i)
        return (
          <g key={i}>
            {g && <rect x={x + i * cw + 6} y={y + 6} width={cw - 12} height={h - 12} rx={9} fill="none" stroke={g} strokeWidth={3} strokeDasharray="7 7" />}
            {f && f.k > 0.001 && <rect x={x + i * cw + 4} y={y + 4} width={(cw - 8) * f.k} height={h - 8} rx={10} fill={f.color} />}
          </g>
        )
      })}
      {Array.from({ length: d - 1 }, (_, i) => (
        <line key={i} x1={x + (i + 1) * cw} y1={y} x2={x + (i + 1) * cw} y2={y + h} stroke={M.ink} strokeWidth={4} />
      ))}
      {sub > 1 &&
        Array.from({ length: d }, (_, i) => {
          const k = subK ? subK(i) : 1
          if (k <= 0) return null
          return Array.from({ length: sub - 1 }, (_, j) => {
            const lx = x + i * cw + ((j + 1) * cw) / sub
            return <line key={`${i}-${j}`} x1={lx} y1={y + 2} x2={lx} y2={y + 2 + (h - 4) * k} stroke={M.ink} strokeWidth={3.5} strokeLinecap="round" />
          })
        })}
    </g>
  )
}

const fillTo = (t: number, at: number, n: number, color: string, gap = 0.3) => (i: number) => (i < n ? { k: ease.outCubic(progress(t, at + i * gap, 0.4)), color } : null)

// ── 1. parts ─────────────────────────────────────────────────────────────────

/**
 * fractions/parts — "A fraction shows part of a whole. The bottom number tells
 * how many equal pieces the whole is cut into, and the top number tells how
 * many of those pieces we have."
 * One whole pizza; the 4 appears and a knife cuts it into 4 equal pieces (they
 * breathe apart and get counted); then the 1 appears, one slice lifts out and
 * glows while the other three fade back: 1 out of 4 equal pieces.
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
  const cut1 = bottom + 0.45
  const cut2 = cut1 + 0.55
  const sliced = cut2 + 0.45
  // pieces spread apart, then settle back
  const spread = interpolate(t, [equal, equal + 0.5, cut + 0.8, cut + 1.4], [0, 22, 22, 6], ease.inOutCubic)
  const lift = ease.outBack(progress(t, top + 0.3, 0.8)) // the chosen slice slides out
  const dim = 0.5 * ease.inOutCubic(progress(t, top + 0.5, 0.6))
  const bob = t > top + 1.2 ? Math.sin((t - top) * 2.2) * 4 : 0
  // the knife rides along each cut
  const k1 = ease.inOutCubic(progress(t, cut1, 0.4))
  const k2 = ease.inOutCubic(progress(t, cut2, 0.4))
  const knifeOn = t > cut1 - 0.25 && t < sliced + 0.2
  const knifeO = clamp(Math.min((t - (cut1 - 0.25)) / 0.2, (sliced + 0.2 - t) / 0.2))
  const kx = t < cut2 - 0.05 ? cx : lerp(cx - r - 14, cx + r + 14, k2)
  const ky = t < cut2 - 0.05 ? lerp(cy - r - 14, cy + r + 14, k1) : cy
  const krot = t < cut2 - 0.05 ? 0 : -90
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
            {t < sliced ? (
              <Slice cx={cx} cy={cy} r={r} a0={0} a1={Math.PI * 2} />
            ) : (
              Array.from({ length: n }, (_, i) => {
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
                    <Slice cx={cx} cy={cy} r={r} a0={a0} a1={a1} cheese={cheese} glow={chosen && t > top + 0.3} dim={chosen ? 0 : dim} />
                  </g>
                )
              })
            )}
          </g>
        </Pop>
        {/* cut lines (white) trail the knife; gone once the pieces separate */}
        {t < equal + 0.5 && (
          <>
            <Draw t={t} at={cut1} dur={0.4} d={`M ${cx} ${cy - r - 14} L ${cx} ${cy + r + 14}`} stroke={M.white} width={7} />
            <Draw t={t} at={cut2} dur={0.4} d={`M ${cx - r - 14} ${cy} L ${cx + r + 14} ${cy}`} stroke={M.white} width={7} />
          </>
        )}
        {knifeOn && (
          <g opacity={knifeO} transform={`translate(${kx} ${ky}) rotate(${krot}) scale(1.3) translate(0 ${-6})`}>
            <Knife />
          </g>
        )}
        {/* count the pieces: 1, 2, 3, 4 */}
        {Array.from({ length: n }, (_, i) => {
          const mid = ((i + 0.5) / n) * Math.PI * 2
          const px = cx + Math.sin(mid) * (r * 0.5 + spread)
          const py = cy - Math.cos(mid) * (r * 0.5 + spread)
          return <Badge key={i} t={t} at={cut + i * 0.25} x={px} y={py} text={i + 1} r={24} out={top} />
        })}
        <Chip t={t} at={0.6} x={cx} y={cy + r + 52} text="1 whole" color={M.mint} out={whole + 1.2} />
        <Chip t={t} at={cut + 1.1} x={cx} y={cy + r + 56} text="4 equal pieces" color={M.sky} out={top} />

        {/* the fraction */}
        <Frac t={t} x={720} y={270} num="1" den="4" size={96} barAt={bottom - 0.2} denAt={bottom + 0.1} numAt={top + 0.1} />
        <Ring t={t} at={bottom + 0.2} x={720} y={331} r={58} color={M.coral} out={top} />
        <Ring t={t} at={top + 0.2} x={720} y={212} r={58} color={M.gold} />
        <Fade t={t} at={bottom + 0.4} out={top}>
          <Title x={720} y={430} size={30} color={DEEP.coral}>
            how many pieces
          </Title>
        </Fade>
        <Fade t={t} at={top + 0.4}>
          <Title x={720} y={112} size={30} color={DEEP.gold}>
            how many we have
          </Title>
        </Fade>
        <Arrow t={t} at={top + 0.9} from={[470, 170]} to={[655, 205]} bend={-0.2} color={DEEP.gold} />
        <Burst t={t} at={have} x={720} y={211} color={M.gold} r={80} />
        <Twinkle t={t} at={have + 0.8} x={cx + 105} y={cy - 110} r={95} n={4} />
      </Camera>
      <Words t={t} at={have + 0.2} text="1 out of 4 equal pieces" x={480} y={500} size={40} colors={[DEEP.gold, undefined, undefined, DEEP.coral]} />
    </>
  )
}

// ── 2. equivalent ────────────────────────────────────────────────────────────
const STRIP_X = 250
const STRIP_W = 520
const STRIP_H = 74

/**
 * fractions/equivalent — "Watch this. Two fourths covers the same amount of
 * space as one half. They look like different numbers, but they are the exact
 * same amount. We call those equivalent fractions."
 * 2/4 fills on one bar, 1/2 on another; the two fourth-pieces lift out, fly up
 * and land exactly on the half (snap!), then fly home; 1/2 = 2/4.
 */
const equivalent: Scene = ({ t, cue }: SceneProps) => {
  const fourths = cue('two fourths')
  const same = cue('same amount of space')
  const half = cue('one half')
  const diff = cue('different numbers')
  const exact = cue('exact same amount')
  const equiv = cue('equivalent fractions')
  const topY = 138
  const botY = 292
  const cw4 = STRIP_W / 4
  const lineX = STRIP_X + STRIP_W / 2
  // the two fourth-pieces' trip up onto the half and back
  const up0 = half + 0.65
  const home0 = Math.max(up0 + 1.9, diff + 0.9)
  const trip = (j: number) => {
    const go = ease.inOutCubic(progress(t, up0 + j * 0.12, 0.7))
    const back = ease.inOutCubic(progress(t, home0 + j * 0.12, 0.6))
    return { go, back, away: go > 0 && back < 1 }
  }
  const landed = up0 + 0.12 + 0.7
  const wig = wobble(t, diff, { amp: 9, freq: 2.2, decay: 2 })
  return (
    <>
      <Paper />
      {/* top: 1/2 */}
      <Pop t={t} at={0.1} x={STRIP_X + STRIP_W / 2} y={topY + STRIP_H / 2} bounce={14}>
        <Bar x={STRIP_X} y={topY} w={STRIP_W} d={2} fill={fillTo(t, half + 0.15, 1, A.fill)} />
      </Pop>
      {/* bottom: 2/4 (its pieces leave while they visit the half) */}
      <Pop t={t} at={0.3} x={STRIP_X + STRIP_W / 2} y={botY + STRIP_H / 2} bounce={14}>
        <Bar
          x={STRIP_X}
          y={botY}
          w={STRIP_W}
          d={4}
          fill={(i) => (i < 2 && !trip(i).away ? { k: ease.outCubic(progress(t, fourths + 0.2 + i * 0.35, 0.4)), color: B.fill } : null)}
          ghost={(i) => (i < 2 && trip(i).away ? B.fill : null)}
        />
      </Pop>
      {/* the travelling fourths */}
      {[0, 1].map((j) => {
        const { go, back, away } = trip(j)
        if (!away) return null
        const from: [number, number] = [STRIP_X + j * cw4 + 4, botY + 4]
        const to: [number, number] = [STRIP_X + j * cw4 + 4, topY + 4]
        const k = back > 0 ? 1 - back : go
        const [px, py] = arc(from, to, 40, k)
        const tilt = Math.sin(k * Math.PI) * (j ? 8 : -8)
        return (
          <g key={j} transform={`translate(${px} ${py}) rotate(${tilt} ${(cw4 - 8) / 2} ${(STRIP_H - 8) / 2})`} filter="url(#sq-shadow)">
            <rect width={cw4 - 8} height={STRIP_H - 8} rx={10} fill={B.fill} stroke={M.ink} strokeWidth={3} />
          </g>
        )
      })}
      <Burst t={t} at={landed} x={lineX - 130} y={topY + STRIP_H / 2} color={M.gold} r={90} />
      <Chip t={t} at={landed + 0.05} x={lineX - 130} y={topY - 34} text="same space!" color={M.gold} out={home0 + 0.3} />

      {/* labels */}
      <T x={150} y={topY + STRIP_H / 2} r={wig}>
        <Frac t={t} x={0} y={0} num="1" den="2" size={54} color={A.ink} at={half} />
      </T>
      <T x={150} y={botY + STRIP_H / 2} r={-wig}>
        <Frac t={t} x={0} y={0} num="2" den="4" size={54} color={B.ink} at={fourths} />
      </T>
      {/* "they look different…" */}
      <Pop t={t} at={diff + 0.1} x={150} y={(topY + botY + STRIP_H) / 2} out={exact}>
        <Title x={150} y={(topY + botY + STRIP_H) / 2} size={44} color={M.inkSoft} stroke={M.white}>
          ?
        </Title>
      </Pop>
      {/* the match line */}
      <Draw t={t} at={same} dur={0.6} d={`M ${lineX} ${topY - 30} L ${lineX} ${botY + STRIP_H + 30}`} stroke={M.ink} width={4} dash="10 10" />

      {/* 1/2 = 2/4 */}
      <g transform={`translate(480 456) scale(${1 + 0.03 * pulse(t, 1.6) * (t > equiv + 0.5 ? 1 : 0)}) translate(-480 -456)`}>
        <FracEq
          t={t}
          x={480}
          y={456}
          size={56}
          toks={[
            { frac: ['1', '2'], color: A.ink, at: exact },
            { op: '=', at: exact + 0.25 },
            { frac: ['2', '4'], color: B.ink, at: exact + 0.45 },
          ]}
        />
      </g>
      <Words t={t} at={equiv} text="equivalent fractions" x={480} y={62} size={46} />
      <Burst t={t} at={equiv + 0.4} x={250} y={62} color={M.pink} r={50} />
      <Burst t={t} at={equiv + 0.55} x={710} y={62} color={M.sea} r={50} />
      <Twinkle t={t} at={equiv + 0.8} x={480} y={456} r={110} n={5} />
    </>
  )
}

// ── 3. same bottom ───────────────────────────────────────────────────────────

/**
 * fractions/samebottom — "When the bottom numbers match, the fraction with more
 * pieces on top is the bigger one. Three fifths is more than two fifths because
 * three pieces is more than two pieces."
 * Two bars cut into fifths: dashed guides show the pieces are the same size;
 * 3 fill on one, 2 on the other, they're counted, the extra piece glows and
 * the crown lands on 3/5. 3/5 > 2/5.
 */
const samebottom: Scene = ({ t, cue }: SceneProps) => {
  const match = cue('bottom numbers match')
  const more = cue('more pieces on top')
  const bigger = cue('the bigger one')
  const three = cue('Three fifths')
  const moreThan = cue('is more than two fifths')
  const two = cue('two fifths')
  const threeP = cue('three pieces')
  const twoP = cue('two pieces')
  const topY = 138
  const botY = 292
  const cw = STRIP_W / 5
  const end = twoP + 0.7
  const crown = spring(t, end + 0.3, { stiffness: 200, damping: 12 })
  return (
    <>
      <Paper />
      <Pop t={t} at={0.1} x={STRIP_X + STRIP_W / 2} y={topY + STRIP_H / 2} bounce={14}>
        <Bar x={STRIP_X} y={topY} w={STRIP_W} d={5} fill={fillTo(t, three + 0.1, 3, A.fill)} />
      </Pop>
      <Pop t={t} at={0.25} x={STRIP_X + STRIP_W / 2} y={botY + STRIP_H / 2} bounce={14}>
        <Bar x={STRIP_X} y={botY} w={STRIP_W} d={5} fill={fillTo(t, two + 0.1, 2, B.fill)} />
      </Pop>
      {/* same-size pieces: guides through every cut */}
      <Fade t={t} at={match + 0.4} out={more + 0.4}>
        {[1, 2, 3, 4].map((i) => (
          <Draw key={i} t={t} at={match + 0.4 + i * 0.08} dur={0.4} d={`M ${STRIP_X + i * cw} ${topY - 14} L ${STRIP_X + i * cw} ${botY + STRIP_H + 14}`} stroke={DEEP.coral} width={3} dash="6 8" />
        ))}
      </Fade>
      <Chip t={t} at={match + 0.9} x={STRIP_X + STRIP_W / 2} y={botY + STRIP_H + 44} text="same size pieces" color={M.sky} out={more + 0.3} />

      {/* labels: ?/5 → 3/5 and 2/5 */}
      <Frac t={t} x={150} y={topY + STRIP_H / 2} num="?" den="5" size={54} color={M.ink} numColor={M.inkSoft} at={0.3} flipAt={three} to={['3', '5']} toColor={A.ink} />
      <Frac t={t} x={150} y={botY + STRIP_H / 2} num="?" den="5" size={54} color={M.ink} numColor={M.inkSoft} at={0.45} flipAt={two} to={['2', '5']} toColor={B.ink} />
      <Ring t={t} at={match} x={150} y={topY + STRIP_H / 2 + 35} r={32} color={M.coral} out={more} />
      <Ring t={t} at={match + 0.15} x={150} y={botY + STRIP_H / 2 + 35} r={32} color={M.coral} out={more} />
      <Ring t={t} at={more} x={150} y={topY + STRIP_H / 2 - 32} r={32} color={M.gold} out={three} />
      <Ring t={t} at={more + 0.15} x={150} y={botY + STRIP_H / 2 - 32} r={32} color={M.gold} out={three} />
      <Words t={t} at={bigger} text="more on top = bigger" x={480} y={60} size={40} colors={[DEEP.gold, DEEP.gold, DEEP.gold]} />

      {/* count the pieces */}
      {[0, 1, 2].map((i) => (
        <Badge key={`a${i}`} t={t} at={threeP + i * 0.22} x={STRIP_X + (i + 0.5) * cw} y={topY + STRIP_H / 2} text={i + 1} r={20} />
      ))}
      {[0, 1].map((i) => (
        <Badge key={`b${i}`} t={t} at={twoP + i * 0.22} x={STRIP_X + (i + 0.5) * cw} y={botY + STRIP_H / 2} text={i + 1} r={20} />
      ))}
      {/* the extra piece */}
      {t > end && (
        <rect x={STRIP_X + 2 * cw + 2} y={topY + 2} width={cw - 4} height={STRIP_H - 4} rx={12} fill="none" stroke={M.gold} strokeWidth={6 + 2 * pulse(t, 1.2)} opacity={ease.outCubic(progress(t, end, 0.3))} />
      )}
      <Chip t={t} at={end + 0.1} x={STRIP_X + 2.5 * cw} y={topY + STRIP_H + 40} text="1 more piece!" color={M.gold} />
      {crown > 0.001 && (
        <T x={150} y={topY - 40 + Math.sin(t * 2.4) * 3 * (t > end + 1 ? 1 : 0)} s={crown} r={-8}>
          <Crown x={0} y={0} r={24} />
        </T>
      )}

      {/* 3/5 > 2/5 */}
      <FracEq
        t={t}
        x={480}
        y={456}
        size={56}
        toks={[
          { frac: ['3', '5'], color: A.ink, at: three + 0.1 },
          { op: '>', at: moreThan + 0.2 },
          { frac: ['2', '5'], color: B.ink, at: two + 0.1 },
        ]}
      />
      <Twinkle t={t} at={end + 0.8} x={150} y={topY + 10} r={60} n={4} />
    </>
  )
}

// ── 4. same top, different bottoms ───────────────────────────────────────────
const WALL_X = 240
const WALL_W = 500
const ROW_H = 56
const ROWS = [2, 3, 4, 6]
const ROW_COLORS = [A.fill, B.fill, M.gold, '#8ab8ff']
const ROW_INK = [A.ink, B.ink, DEEP.gold, DEEP.blue]
const rowY = (i: number) => 108 + i * 72

/**
 * fractions/unlikebottom — "When the top numbers are the same, look at the size
 * of the pieces. The fewer pieces a whole is cut into, the bigger each piece
 * is. So one half is more than one third. This trick only works when the tops
 * match!"
 * 1/2 and 1/3 (same top) fly into a fraction wall of halves, thirds, fourths
 * and sixths; one piece of each row lights up, getting smaller down the wall;
 * then 1/2 vs 1/3 head to head: 1/2 > 1/3 — but only when the tops match.
 */
const unlikebottom: Scene = ({ t, cue }: SceneProps) => {
  const topSame = cue('top numbers are the same')
  const size = cue('size of the pieces')
  const fewer = cue('The fewer pieces')
  const each = cue('the bigger each piece')
  const half = cue('one half is more')
  const moreThan = cue('is more than one third')
  const third = cue('one third')
  const trick = cue('This trick')
  const match = cue('tops match')
  const fly = ease.inOutCubic(progress(t, size - 0.15, 0.7))
  const dimLow = ease.inOutCubic(progress(t, half, 0.5))
  const big = [
    { x: 380, ink: A.ink, num: '1', den: '2' },
    { x: 580, ink: B.ink, num: '1', den: '3' },
  ]
  return (
    <>
      <Paper />
      <Fade t={t} at={topSame + 0.2} out={size - 0.1}>
        <circle cx={380} cy={205} r={42} fill="none" stroke={M.gold} strokeWidth={6} />
        <circle cx={580} cy={205} r={42} fill="none" stroke={M.gold} strokeWidth={6} />
        <Title x={480} y={205} size={64} color={DEEP.gold} stroke={M.white}>
          =
        </Title>
      </Fade>
      <Chip t={t} at={topSame + 0.5} x={480} y={110} text="same top!" color={M.gold} out={size - 0.1} />

      {/* phase 2: the fraction wall */}
      {ROWS.map((d, i) => {
        const y = rowY(i)
        const at = size + 0.5 + i * 0.16
        const o = i >= 2 ? 1 - 0.75 * dimLow : 1
        const lit = ease.outCubic(progress(t, fewer + 0.3 + i * 0.3, 0.45))
        const cw = WALL_W / d
        return (
          <g key={d} opacity={o}>
            <Pop t={t} at={at} x={WALL_X + WALL_W / 2} y={y + ROW_H / 2} bounce={15}>
              <Bar x={WALL_X} y={y} w={WALL_W} h={ROW_H} d={d} fill={(c) => (c === 0 ? { k: lit, color: ROW_COLORS[i] } : null)} />
            </Pop>
            {i >= 2 && <Frac t={t} x={170} y={y + ROW_H / 2} num="1" den={String(d)} size={30} color={ROW_INK[i]} at={at} />}
            {/* glow on the head-to-head pieces */}
            {i < 2 && t > half && <rect x={WALL_X + 2} y={y + 2} width={cw - 4} height={ROW_H - 4} rx={12} fill="none" stroke={M.gold} strokeWidth={5 + 2 * pulse(t, 1.2)} opacity={ease.outCubic(progress(t, half + i * 0.6, 0.3))} />}
          </g>
        )
      })}
      {/* the two fractions fly in as the top rows' labels (drawn over the wall) */}
      {big.map((b, i) => {
        const x = lerp(b.x, 170, fly)
        const y = lerp(260, rowY(i) + ROW_H / 2, fly)
        const s = lerp(1, 0.33, fly)
        return (
          <T key={i} x={x} y={y} s={s}>
            <Frac t={t} x={0} y={0} num={b.num} den={b.den} size={92} color={b.ink} at={0.2 + i * 0.2} />
          </T>
        )
      })}
      {/* fewer pieces → bigger pieces */}
      <Draw t={t} at={each - 0.2} dur={0.6} d={`M 800 ${rowY(3) + ROW_H / 2} L 800 ${rowY(0) + 14}`} stroke={M.ink} width={6} />
      {t > each + 0.35 && <path d={`M 786 ${rowY(0) + 30} L 800 ${rowY(0) + 12} L 814 ${rowY(0) + 30}`} fill="none" stroke={M.ink} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />}
      <Fade t={t} at={each + 0.3}>
        <Title x={800} y={rowY(0) - 16} size={26} color={M.ink}>
          bigger
        </Title>
        <Title x={800} y={rowY(3) + ROW_H + 22} size={26} color={M.inkSoft}>
          smaller
        </Title>
      </Fade>
      <Words t={t} at={each} text="fewer pieces = bigger pieces" x={520} y={448} size={36} out={half - 0.2} />

      {/* phase 3: 1/2 vs 1/3 */}
      <Draw t={t} at={third + 0.3} dur={0.5} d={`M ${WALL_X + WALL_W / 3} ${rowY(0) - 8} L ${WALL_X + WALL_W / 3} ${rowY(1) + ROW_H + 8}`} stroke={M.ink} width={4} dash="8 8" />
      {t > third + 0.6 && (
        <rect x={WALL_X + WALL_W / 3 + 2} y={rowY(0) + 4} width={WALL_W / 2 - WALL_W / 3 - 6} height={ROW_H - 8} rx={8} fill={M.gold} opacity={0.55 * ease.outCubic(progress(t, third + 0.6, 0.3))} />
      )}
      <Chip t={t} at={third + 0.8} x={WALL_X + WALL_W * 0.74} y={rowY(0) + ROW_H / 2} text="← extra piece" color={M.gold} size={22} />
      <FracEq
        t={t}
        x={480}
        y={464}
        size={52}
        toks={[
          { frac: ['1', '2'], color: A.ink, at: half + 0.1 },
          { op: '>', at: moreThan + 0.2 },
          { frac: ['1', '3'], color: B.ink, at: third + 0.1 },
        ]}
      />
      {/* only when the tops match */}
      <Chip t={t} at={trick} x={480} y={52} text="only when the tops match!" color={M.gold} size={26} />
      {(() => {
        const xs = eqLayout(
          [
            { frac: ['1', '2'], color: '', at: 0 },
            { op: '>', at: 0 },
            { frac: ['1', '3'], color: '', at: 0 },
          ],
          480,
          52,
        )
        return (
          <>
            <Ring t={t} at={match} x={xs[0]} y={464 - 31} r={30} color={M.gold} />
            <Ring t={t} at={match + 0.1} x={xs[2]} y={464 - 31} r={30} color={M.gold} />
          </>
        )
      })()}
    </>
  )
}

// ── 5. make the bottoms match ────────────────────────────────────────────────

/**
 * fractions/matchbottoms — "When the tops and the bottoms are both different,
 * the fewer pieces trick can fool you. Make the bottoms match first. Two fifths
 * is the same as four tenths, and four tenths is less than seven tenths. So
 * seven tenths is bigger."
 * 2/5 vs 7/10: the crown wrongly lands on 2/5 (the trick fooled us) and falls
 * off; bars appear; a knife splits each fifth into two tenths, so 2/5 flips to
 * 4/10; 4/10 vs 7/10 — 3 more tenths — the crown lands on 7/10.
 */
const matchbottoms: Scene = ({ t, cue }: SceneProps) => {
  const both = cue('both different')
  const fool = cue('can fool you')
  const make = cue('Make the bottoms match')
  const twoF = cue('Two fifths')
  const four = cue('four tenths')
  const four2 = cue('four tenths', 1)
  const less = cue('is less than')
  const seven = cue('seven tenths')
  const so = cue('So seven tenths')
  const bigger = cue('is bigger')
  const topY = 138
  const botY = 292
  const cw10 = STRIP_W / 10
  const move = ease.inOutCubic(progress(t, make, 0.9))
  // crown: lands on 2/5 (wrong!), falls off, later lands on 7/10
  const c1 = spring(t, fool, { stiffness: 220, damping: 12 })
  const fall = progress(t, make - 0.3, 0.7)
  const c2 = spring(t, bigger - 0.3, { stiffness: 200, damping: 12 })
  const labels = [
    { x0: 340, y1: topY + STRIP_H / 2, num: '2', den: '5', ink: A.ink, at: 0.2 },
    { x0: 620, y1: botY + STRIP_H / 2, num: '7', den: '10', ink: B.ink, at: 0.4 },
  ]
  return (
    <>
      <Paper />
      {/* bars */}
      <Pop t={t} at={make + 0.5} x={STRIP_X + STRIP_W / 2} y={topY + STRIP_H / 2} bounce={14}>
        <Bar x={STRIP_X} y={topY} w={STRIP_W} d={5} fill={fillTo(t, make + 0.9, 2, A.fill)} sub={2} subK={(i) => ease.inOutCubic(progress(t, four - 0.3 + i * 0.22, 0.2))} />
      </Pop>
      <Pop t={t} at={make + 0.7} x={STRIP_X + STRIP_W / 2} y={botY + STRIP_H / 2} bounce={14}>
        <Bar x={STRIP_X} y={botY} w={STRIP_W} d={10} fill={fillTo(t, make + 1.1, 7, B.fill, 0.09)} />
      </Pop>
      {/* the knife chops down the middle of each fifth */}
      {t > four - 0.45 && t < four + 0.95 && (() => {
        const p = clamp((t - (four - 0.3)) / 0.22, 0, 4.999)
        const cell = Math.floor(p)
        const f = p - cell
        const dip = t < four - 0.3 ? 0 : Math.pow(Math.sin(Math.PI * Math.min(1, f * 1.15)), 0.8)
        return (
          <g opacity={clamp(Math.min((t - four + 0.45) / 0.15, (four + 0.95 - t) / 0.15))} transform={`translate(${STRIP_X + (2 * cell + 1) * cw10} ${topY - 14 + dip * (STRIP_H - 4)}) scale(0.62)`}>
            <Knife />
          </g>
        )
      })()}
      {/* counting the new tenths */}
      {[0, 1, 2, 3].map((i) => (
        <Badge key={i} t={t} at={four + 0.9 + i * 0.15} x={STRIP_X + (i + 0.5) * cw10} y={topY + STRIP_H / 2} text={i + 1} r={17} out={less} />
      ))}

      {/* labels: big, then slide to the bars */}
      {labels.map((l, i) => {
        const x = lerp(l.x0, 150, move)
        const y = lerp(280, l.y1, move)
        const s = lerp(1, 0.52, move)
        return (
          <T key={i} x={x} y={y} s={s}>
            <Frac t={t} x={0} y={0} num={l.num} den={l.den} size={88} color={l.ink} at={l.at} flipAt={i === 0 ? four : undefined} to={i === 0 ? ['4', '10'] : undefined} />
          </T>
        )
      })}
      {/* both different */}
      <Fade t={t} at={both} out={make - 0.2}>
        <circle cx={340} cy={227} r={40} fill="none" stroke={M.gold} strokeWidth={6} />
        <circle cx={620} cy={227} r={40} fill="none" stroke={M.gold} strokeWidth={6} />
        <circle cx={340} cy={336} r={46} fill="none" stroke={M.coral} strokeWidth={6} />
        <circle cx={620} cy={336} r={50} fill="none" stroke={M.coral} strokeWidth={6} />
        <Title x={480} y={227} size={60} color={M.inkSoft} stroke={M.white}>
          ≠
        </Title>
        <Title x={480} y={336} size={60} color={M.inkSoft} stroke={M.white}>
          ≠
        </Title>
      </Fade>
      {/* the trick fools us: the crown lands on 2/5… and falls off */}
      <Chip t={t} at={fool - 0.4} x={480} y={112} text="fewer pieces trick?" color={M.lilac} out={make} />
      {c1 > 0.001 && fall < 1 && (
        <T x={340 + fall * 60} y={158 - 30 * (1 - c1) + fall * fall * 260} s={c1} r={-10 + fall * 160} o={1 - fall}>
          <Crown x={0} y={0} r={30} />
        </T>
      )}
      <Pop t={t} at={make - 0.35} x={410} y={150} out={make + 0.6}>
        <Title x={410} y={150} size={60} color={DEEP.coral} stroke={M.white}>
          ?!
        </Title>
      </Pop>
      <Words t={t} at={make + 0.3} text="make the bottoms match" x={480} y={56} size={40} out={four2} />
      <Ring t={t} at={twoF} x={150} y={topY + STRIP_H / 2} r={52} color={M.mint} out={four + 0.2} />
      {/* ×2 tags while 2/5 becomes 4/10 */}
      <Chip t={t} at={four + 0.1} x={66} y={topY + STRIP_H / 2 - 23} text="×2" color={M.lilac} size={20} out={less} />
      <Chip t={t} at={four + 0.2} x={66} y={topY + STRIP_H / 2 + 25} text="×2" color={M.lilac} size={20} out={less} />

      {/* compare 4/10 with 7/10 */}
      <Draw t={t} at={four2} dur={0.5} d={`M ${STRIP_X + 4 * cw10} ${topY - 14} L ${STRIP_X + 4 * cw10} ${topY + STRIP_H + 10} M ${STRIP_X + 4 * cw10} ${botY - 6} L ${STRIP_X + 4 * cw10} ${botY + STRIP_H + 14}`} stroke={M.ink} width={4} dash="8 8" />
      {t > less && (
        <rect x={STRIP_X + 4 * cw10 + 2} y={botY + 2} width={3 * cw10 - 4} height={STRIP_H - 4} rx={10} fill="none" stroke={M.gold} strokeWidth={5 + 2 * pulse(t, 1.2)} opacity={ease.outCubic(progress(t, less, 0.3))} />
      )}
      <Brace t={t} at={seven} x0={STRIP_X + 4 * cw10 + 4} x1={STRIP_X + 7 * cw10 - 4} y={botY - 8} dir="up" label="3 more tenths" labelColor={DEEP.coral} labelSize={24} />
      <FracEq
        t={t}
        x={480}
        y={462}
        size={52}
        toks={[
          { frac: ['4', '10'], color: A.ink, at: four2 + 0.1, flipAt: so, to: ['2', '5'] },
          { op: '<', at: less + 0.2 },
          { frac: ['7', '10'], color: B.ink, at: seven + 0.1 },
        ]}
      />
      {c2 > 0.001 && (
        <T x={64} y={botY + 30 + (t > bigger + 1 ? Math.sin(t * 2.4) * 3 : 0)} s={c2} r={-14}>
          <Crown x={0} y={0} r={24} />
        </T>
      )}
      <Confetti t={t} at={bigger + 0.1} x={150} y={botY} n={24} spread={260} />
      <Twinkle t={t} at={bigger + 0.8} x={150} y={botY + 10} r={60} n={4} />
    </>
  )
}

export const fractionsScenes: Record<string, Scene> = { parts, equivalent, samebottom, unlikebottom, matchbottoms }
