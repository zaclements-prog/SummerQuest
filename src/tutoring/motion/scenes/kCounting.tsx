/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { clamp, ease, lerp, progress, spring, wobble } from '../anim'
import { Burst, Draw, Glow, Paper, Pop, T, Title } from '../kit'
import { M } from '../palette'
import { Apple } from '../shapes'
import type { Scene, SceneProps } from '../types'
import { Fish, NumDisc, PointerHand, STICKER } from './_kart'

/*
 * Kindergarten counting colour code (whole lesson):
 *   the things we count are big and bright (apples coral, stars gold);
 *   each number we SAY is a gold disc that pops as it is said;
 *   "how many" (the last number) grows big at the top;
 *   a group is a coral lasso.
 * No words on the stage: numerals only.
 */

const GROUND_Y = 486
const AX = [210, 390, 570, 750]
const AY = 318
const AR = 62
const BADGE_Y = 432

/** A soft grassy hill along the bottom (two shapes). */
function Ground() {
  return (
    <>
      <path d={`M 0 ${GROUND_Y + 8} Q 240 ${GROUND_Y - 26} 480 ${GROUND_Y} T 960 ${GROUND_Y - 6} L 960 540 L 0 540 Z`} fill="#a9e08f" />
      <path d={`M 0 ${GROUND_Y + 8} Q 240 ${GROUND_Y - 26} 480 ${GROUND_Y} T 960 ${GROUND_Y - 6}`} fill="none" stroke={M.ink} strokeWidth={4} strokeLinecap="round" />
    </>
  )
}

/** 0 → 1 → 0 over `dur` from `at` (a tap, a hop). */
const bump = (t: number, at: number, dur = 0.32) => {
  const k = progress(t, at, dur)
  return k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI)
}

/** A lasso drawn around a group (a coral ellipse that draws itself on). */
function Lasso({ t, at, cx, cy, rx, ry }: { t: number; at: number; cx: number; cy: number; rx: number; ry: number }) {
  const d = `M ${cx} ${cy - ry} A ${rx} ${ry} 0 1 1 ${cx - 0.01} ${cy - ry}`
  return <Draw t={t} at={at} dur={0.7} d={d} stroke={M.coral} width={7} />
}

/**
 * kCounting/touch — "Let's count the apples. Touch each apple one time. One.
 * Two. Three. Four." Four apples drop in; a hand taps each one as its number
 * is said, and the number pops under it (one number for each apple).
 */
const touch: Scene = ({ t, cue }: SceneProps) => {
  const apples = cue('apples')
  const tap = cue('Touch')
  const n = [cue('One.'), cue('Two.'), cue('Three.'), cue('Four.')]
  // the hand: in from the side, hovering over apple k as its number comes, a tap on the number
  const hover = (k: number): [number, number] => [AX[k], AY - 74]
  let hx = lerp(1020, hover(0)[0], ease.outCubic(progress(t, tap, 0.6)))
  let hy = lerp(620, hover(0)[1], ease.outCubic(progress(t, tap, 0.6)))
  for (let k = 1; k < 4; k++) {
    const m = ease.inOutCubic(progress(t, n[k] - 0.36, 0.3))
    hx = lerp(hx, hover(k)[0], m)
    hy = lerp(hy, hover(k)[1], m)
  }
  const leave = ease.inQuad(progress(t, n[3] + 0.8, 0.55))
  hx = lerp(hx, 1040, leave)
  hy = lerp(hy, 90, leave)
  const press = Math.max(...n.map((at) => bump(t, at - 0.06)))
  return (
    <>
      <Paper />
      <Ground />
      {AX.map((x, k) => {
        const drop = spring(t, apples + k * 0.14, { stiffness: 190, damping: 13 })
        if (drop <= 0.001) return null
        const sq = wobble(t, n[k] + 0.04, { amp: 0.12, freq: 2.6, decay: 6 })
        const counted = t >= n[k]
        return (
          <g key={k}>
            {counted && (
              <T x={x} y={AY + 6} s={ease.outBack(progress(t, n[k], 0.35))}>
                <circle r={AR + 14} fill={M.gold} opacity={0.35} />
              </T>
            )}
            <T x={x} y={AY - (1 - drop) * 300} sx={1 + sq} sy={1 - sq}>
              <Apple x={0} y={0} r={AR} color={STICKER.coral} />
            </T>
          </g>
        )
      })}
      {AX.map((x, k) => (
        <Pop key={k} t={t} at={n[k]} x={x} y={BADGE_Y} bounce={10}>
          <T x={x} y={BADGE_Y}>
            <NumDisc n={k + 1} r={30} />
          </T>
        </Pop>
      ))}
      {t >= tap && leave < 1 && (
        <T x={hx} y={hy + press * 30} r={-8}>
          <PointerHand press={press} />
        </T>
      )}
    </>
  )
}

/** Where the four apples huddle into one group. */
const GROUP_X = [292, 417, 542, 667]

/**
 * kCounting/last — "The last number tells how many. We stopped at four. So
 * there are four apples!" The counted apples are back; the last number glows,
 * flies up and grows big; the apples huddle into one group, lassoed.
 */
const last: Scene = ({ t, cue }: SceneProps) => {
  const lastAt = cue('last number')
  const stopped = cue('stopped at four')
  const four = cue('four apples')
  const dim = 1 - 0.65 * ease.outCubic(progress(t, lastAt, 0.4))
  const fly = ease.inOutCubic(progress(t, stopped, 0.8))
  const huddle = ease.inOutCubic(progress(t, four, 0.6))
  const fadeSmall = 1 - progress(t, four, 0.3)
  // the 4: under its apple → big at the top
  const bx = lerp(AX[3], 480, fly)
  const by = lerp(BADGE_Y, 116, fly) - Math.sin(fly * Math.PI) * 60
  const br = lerp(30, 66, fly) * (1 + 0.25 * ease.outCubic(progress(t, lastAt, 0.4)) * (1 - fly))
  return (
    <>
      <Paper />
      <Ground />
      {AX.map((x0, k) => {
        const s = spring(t, 0.05 + k * 0.05, { stiffness: 260, damping: 16 })
        if (s <= 0.001) return null
        const x = lerp(x0, GROUP_X[k], huddle)
        const hop = bump(t, four + 0.6 + k * 0.08, 0.36) * 22
        return (
          <T key={k} x={x} y={AY - hop} s={s * lerp(1, 0.86, huddle)}>
            <Apple x={0} y={0} r={AR} color={STICKER.coral} />
          </T>
        )
      })}
      {[0, 1, 2].map((k) => (
        <T key={k} x={AX[k]} y={BADGE_Y} s={spring(t, 0.1 + k * 0.05, { stiffness: 260, damping: 16 })} o={dim * fadeSmall}>
          <NumDisc n={k + 1} r={30} />
        </T>
      ))}
      <Lasso t={t} at={four + 0.55} cx={480} cy={AY + 2} rx={262} ry={98} />
      <Glow t={t} at={lastAt} x={bx} y={by} r={br + 26} breathe={false} />
      <T x={bx} y={by} s={spring(t, 0.25, { stiffness: 260, damping: 16 })}>
        <NumDisc n={4} r={br} />
      </T>
      <Burst t={t} at={stopped + 0.8} x={480} y={116} r={110} />
      <Burst t={t} at={four + 1.2} x={480} y={AY} r={170} color={M.coral} rays={12} />
    </>
  )
}

const FISH: { x: number; y: number; color: string; r: number }[] = [
  { x: 225, y: 230, color: STICKER.coral, r: 50 },
  { x: 435, y: 214, color: STICKER.gold, r: 50 },
  { x: 645, y: 236, color: STICKER.mint, r: 50 },
  { x: 325, y: 376, color: STICKER.lilac, r: 50 },
  { x: 545, y: 384, color: STICKER.blue, r: 50 },
]

/**
 * A pond: still water with a rim and two ripples (static; no full-stage panel).
 * Nothing in it but the fish, so nothing else can be counted by mistake.
 */
function Pond() {
  return (
    <>
      <rect x={60} y={128} width={730} height={360} rx={160} fill="#bfe8f7" stroke={M.ink} strokeWidth={4} />
      <path d="M 160 466 Q 190 446 220 466 M 590 152 Q 620 134 650 152" fill="none" stroke="#7fcbe6" strokeWidth={5} strokeLinecap="round" />
    </>
  )
}

/**
 * kCounting/fish — "Your turn! Here come some fish. Count them with your
 * finger." A hand waves hello; five fish swim into the pond and settle, well
 * apart, for the child to count (the check asks how many). No numbers.
 */
const fish: Scene = ({ t, cue }: SceneProps) => {
  const turn = cue('Your turn')
  const come = cue('fish')
  const count = cue('Count them')
  return (
    <>
      <Paper />
      <Pond />
      {FISH.map((f, i) => {
        const at = come + i * 0.24
        if (t < at) return null
        const k = ease.outCubic(progress(t, at, 1.1))
        const x = lerp(1040 + i * 30, f.x, k)
        const sway = (1 - k) * Math.sin((t - at) * 12) * 10
        return (
          <T key={i} x={x} y={f.y + sway * 0.6} r={sway}>
            <Fish r={f.r} color={f.color} />
          </T>
        )
      })}
      {/* "your turn": a hand waves from the corner, and taps the air on "Count them" */}
      <Pop t={t} at={turn} x={892} y={520} bounce={11}>
        <T x={892} y={520 - bump(t, count, 0.4) * 22} r={-22 + wobble(t, turn + 0.3, { amp: 14, freq: 1.6, decay: 2.6 })}>
          <PointerHand press={bump(t, count, 0.4)} />
        </T>
      </Pop>
      {/* how many? */}
      <Pop t={t} at={count + 0.3} x={862} y={118} bounce={10}>
        <circle cx={862} cy={118} r={44} fill={M.white} stroke={M.ink} strokeWidth={4} />
        <Title x={862} y={122} size={62} color={M.sea}>
          ?
        </Title>
      </Pop>
    </>
  )
}

const STAR_X = [540, 670, 800]
const STAR_Y = 250

/**
 * kCounting/three — "This is the number three. Three is one, two, three.
 * Let's find three!" A big 3 pops in; three stars appear one by one as they
 * are counted, each with its number; on "find three" they hop together and a
 * lasso makes them a group (the check: tap the group with three cookies).
 */
const three: Scene = ({ t, cue }: SceneProps) => {
  const num = cue('number three')
  const n = [cue('one,'), cue('two,'), cue('three', 2)]
  const find = cue('find three')
  const big = spring(t, num, { stiffness: 170, damping: 11 })
  return (
    <>
      <Paper />
      <Ground />
      <Glow t={t} at={num} x={260} y={258} r={130} breathe={false} />
      {big > 0.001 && (
        <T x={260} y={262 - bump(t, find, 0.4) * 24} s={big}>
          <text x={0} y={8} fontFamily={M.font} fontWeight={700} fontSize={250} textAnchor="middle" dominantBaseline="middle" fill={STICKER.coral} stroke={M.ink} strokeWidth={12} strokeLinejoin="round" paintOrder="stroke fill">
            3
          </text>
        </T>
      )}
      {STAR_X.map((x, k) => {
        const s = spring(t, n[k], { stiffness: 230, damping: 11 })
        if (s <= 0.001) return null
        const hop = bump(t, find + k * 0.1, 0.38) * 34
        return (
          <g key={k}>
            <T x={x} y={STAR_Y - hop} s={s} r={(1 - clamp(s)) * -40}>
              <path d="M 0 -56 L 16 -18 L 56 -16 L 25 10 L 35 50 L 0 28 L -35 50 L -25 10 L -56 -16 L -16 -18 Z" fill={M.gold} stroke={M.ink} strokeWidth={4} strokeLinejoin="round" />
            </T>
            <Pop t={t} at={n[k] + 0.08} x={x} y={STAR_Y + 98} bounce={10}>
              <T x={x} y={STAR_Y + 98}>
                <NumDisc n={k + 1} r={26} fill={M.white} />
              </T>
            </Pop>
          </g>
        )
      })}
      <Lasso t={t} at={find + 0.25} cx={670} cy={STAR_Y + 30} rx={200} ry={128} />
    </>
  )
}

export const kCountingScenes: Record<string, Scene> = { touch, last, fish, three }
