/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { clamp, ease, lerp, progress, spring, wobble } from '../anim'
import { Burst, Glow, Paper, Pop, T, Title } from '../kit'
import { M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { NumDisc, PointerHand } from './_kart'

/*
 * Kindergarten Counting Towers colour code (whole lesson):
 *   the critters are round purple friends that walk the sandy path toward the
 *   house; a build spot is a dashed ring with a +; a tower is a little stone
 *   castle, and each power-up adds a gold star under it; a critter that is
 *   stopped goes home in a puff of sparkles (nothing scarier).
 * Nothing to read: numerals and "?" only.
 */

const OUT = 4
const ink = { stroke: M.ink, strokeWidth: OUT, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

/** 0 → 1 → 0 over `dur` from `at` (a hop, a tap). */
const bump = (t: number, at: number, dur = 0.36) => {
  const k = progress(t, at, dur)
  return k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI)
}

/** A critter: a round purple friend with antennae (radius r), `step` 0…1 bobs its feet. */
function Critter({ r = 30, step = 0 }: { r?: number; step?: number }) {
  const b = Math.sin(step * Math.PI * 2) * 3
  return (
    <g>
      <path d={`M ${-r * 0.35} ${-r * 0.85} L ${-r * 0.55} ${-r * 1.35} M ${r * 0.35} ${-r * 0.85} L ${r * 0.55} ${-r * 1.35}`} {...ink} strokeWidth={3.5} />
      <circle cx={-r * 0.55} cy={-r * 1.35} r={r * 0.14} fill="#ffcf4d" {...ink} strokeWidth={3} />
      <circle cx={r * 0.55} cy={-r * 1.35} r={r * 0.14} fill="#ffcf4d" {...ink} strokeWidth={3} />
      <ellipse cx={-r * 0.4} cy={r * 0.92 + b} rx={r * 0.26} ry={r * 0.14} fill="#8461b6" {...ink} strokeWidth={3} />
      <ellipse cx={r * 0.4} cy={r * 0.92 - b} rx={r * 0.26} ry={r * 0.14} fill="#8461b6" {...ink} strokeWidth={3} />
      <circle r={r} fill="#b79af0" {...ink} />
      <circle cx={-r * 0.32} cy={-r * 0.12} r={r * 0.26} fill={M.white} {...ink} strokeWidth={3} />
      <circle cx={r * 0.32} cy={-r * 0.12} r={r * 0.26} fill={M.white} {...ink} strokeWidth={3} />
      <circle cx={-r * 0.26} cy={-r * 0.08} r={r * 0.11} fill={M.ink} />
      <circle cx={r * 0.38} cy={-r * 0.08} r={r * 0.11} fill={M.ink} />
      <path d={`M ${-r * 0.3} ${r * 0.4} Q 0 ${r * 0.62} ${r * 0.3} ${r * 0.4}`} fill="none" {...ink} strokeWidth={3} />
    </g>
  )
}

/** A little stone castle tower (about 120 px tall), its foot at (0, 0). */
function Tower({ s = 1 }: { s?: number }) {
  return (
    <g transform={s !== 1 ? `scale(${s})` : undefined}>
      <path d="M -6 -118 L -6 -150 L 22 -140 L -6 -130" fill="#f2766b" {...ink} strokeWidth={3} />
      <path d="M -38 0 L -34 -96 L 34 -96 L 38 0 Z" fill="#c3cede" {...ink} />
      <path d="M -42 -96 L -42 -122 L -28 -122 L -28 -110 L -7 -110 L -7 -122 L 7 -122 L 7 -110 L 28 -110 L 28 -122 L 42 -122 L 42 -96 Z" fill="#d7dee8" {...ink} />
      <path d="M -14 0 L -14 -26 Q 0 -42 14 -26 L 14 0 Z" fill="#9a6a46" {...ink} />
      <rect x={-8} y={-74} width={16} height={22} rx={8} fill="#5b6fa8" {...ink} strokeWidth={3} />
    </g>
  )
}

/** A build spot: a dashed ring with a +. */
function Spot({ r = 46 }: { r?: number }) {
  return (
    <g>
      <circle r={r} fill={M.white} opacity={0.55} />
      <circle r={r} fill="none" stroke={M.ink} strokeWidth={4} strokeDasharray="12 9" />
      <path d={`M ${-r * 0.36} 0 H ${r * 0.36} M 0 ${-r * 0.36} V ${r * 0.36}`} stroke={M.ink} strokeWidth={9} strokeLinecap="round" />
    </g>
  )
}

/** The house at the end of the path. */
function House() {
  return (
    <g>
      <rect x={-52} y={-56} width={104} height={86} fill="#ffe7c2" {...ink} />
      <path d="M -66 -52 L 0 -110 L 66 -52 Z" fill="#f2766b" {...ink} />
      <rect x={-16} y={-14} width={32} height={44} rx={4} fill="#c7955f" {...ink} />
      <rect x={22} y={-42} width={20} height={20} rx={3} fill="#9fe0f2" {...ink} strokeWidth={3} />
    </g>
  )
}

/** A gold star (radius r). */
const star = (r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const rr = i % 2 ? r * 0.45 : r
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2
    return `${i ? 'L' : 'M'} ${(Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr).toFixed(1)}`
  }).join(' ') + ' Z'

/** The sandy path (a gentle S from the left edge to the house). */
const PATH = 'M -20 410 C 180 410 220 280 400 300 S 640 430 820 350'
function SandPath() {
  return (
    <g fill="none" strokeLinecap="round">
      <path d={PATH} stroke={M.ink} strokeWidth={70} />
      <path d={PATH} stroke="#e2c48a" strokeWidth={62} />
      <path d={PATH} stroke="#f1d9a6" strokeWidth={50} />
    </g>
  )
}

/** A point along the path (k 0…1), the same S as PATH. */
function along(k: number): [number, number] {
  // two cubic segments: (−20,360)→(400,250) and (400,250)→(820,300)
  const cubic = (p0: number, p1: number, p2: number, p3: number, u: number) => (1 - u) ** 3 * p0 + 3 * (1 - u) ** 2 * u * p1 + 3 * (1 - u) * u ** 2 * p2 + u ** 3 * p3
  if (k < 0.5) {
    const u = k * 2
    return [cubic(-20, 180, 220, 400, u), cubic(410, 410, 280, 300, u)]
  }
  const u = (k - 0.5) * 2
  return [cubic(400, 580, 640, 820, u), cubic(300, 320, 430, 350, u)]
}

function Grass() {
  return <rect x={0} y={0} width={960} height={540} fill="#a9e08f" />
}

/**
 * kTowers/critters — "Critters are coming down the path! Let's keep them away
 * from the house." The path and the house; three critters walk in along the
 * path on "coming" and stop partway; the house glows on "house".
 */
const critters: Scene = ({ t, cue }: SceneProps) => {
  const coming = cue('coming')
  const away = cue('away')
  const house = cue('house')
  return (
    <>
      <Paper />
      <Grass />
      <SandPath />
      <Glow t={t} at={house} x={860} y={290} r={120} breathe={false} />
      <T x={860} y={340} s={1.15}>
        <House />
      </T>
      {[0, 1, 2].map((i) => {
        const go = ease.outCubic(progress(t, coming + i * 0.35, 2.6))
        if (go <= 0) return null
        const [x, y] = along(lerp(0, 0.46 - i * 0.14, go))
        const walking = go < 1 ? t * 2.2 : 0
        return (
          <T key={i} x={x} y={y - 8 - Math.abs(Math.sin(walking * Math.PI)) * 8} r={wobble(t, away + i * 0.1, { amp: 8, freq: 2.2, decay: 4 })}>
            <Critter r={38} step={walking} />
          </T>
        )
      })}
    </>
  )
}

/**
 * kTowers/build — "Tap a spot. Answer the question. Pop! A tower!" A hand taps
 * the build spot; a question card pops up (three critters, the numerals 2, 3
 * and 4) and the hand taps the 3; the card goes, and a tower pops up on the spot.
 */
const build: Scene = ({ t, cue }: SceneProps) => {
  const tap = cue('Tap a spot')
  const answer = cue('Answer')
  const pop = cue('Pop')
  const tower = cue('A tower')
  const card = spring(t, answer - 0.1, { stiffness: 210, damping: 14 }) * (1 - ease.inOutCubic(progress(t, pop - 0.1, 0.3)))
  // the hand: in → the spot (tap) → the 3 on the card (tap) → away
  const toSpot = ease.inOutCubic(progress(t, tap - 0.4, 0.5))
  const toCard = ease.inOutCubic(progress(t, answer + 0.8, 0.5))
  const leave = ease.inQuad(progress(t, pop, 0.5))
  let hx = lerp(1040, 230, toSpot)
  let hy = lerp(620, 420, toSpot)
  hx = lerp(hx, 620, toCard)
  hy = lerp(hy, 342, toCard)
  hx = lerp(hx, 1060, leave)
  hy = lerp(hy, 120, leave)
  const press = bump(t, tap + 0.15, 0.32) + bump(t, answer + 1.4, 0.32)
  const built = spring(t, pop, { stiffness: 230, damping: 10 })
  return (
    <>
      <Paper />
      <Grass />
      <SandPath />
      <T x={860} y={340} s={1.15}>
        <House />
      </T>
      <T x={230} y={500}>
        {built > 0.001 ? (
          <T s={built}>
            <Tower />
          </T>
        ) : (
          <T y={-40} s={1 + bump(t, tap + 0.15, 0.32) * 0.15}>
            <Spot />
          </T>
        )}
      </T>
      <Burst t={t} at={tower} x={230} y={440} r={110} color={M.gold} rays={10} />
      {card > 0.001 && (
        <T x={580} y={200} s={card}>
          <rect x={-170} y={-150} width={340} height={300} rx={34} fill="#fff8ec" stroke={M.ink} strokeWidth={5} />
          {[-80, 0, 80].map((x) => (
            <T key={x} x={x} y={-60}>
              <Critter r={26} />
            </T>
          ))}
          {[2, 3, 4].map((n, i) => (
            <T key={n} x={-100 + i * 100} y={78} s={1 + (n === 3 ? bump(t, answer + 1.4, 0.32) * 0.2 : 0)}>
              <NumDisc n={n} r={34} fill={n === 3 && t >= answer + 1.4 ? '#8edb7c' : M.white} />
            </T>
          ))}
        </T>
      )}
      {t >= tap - 0.4 && leave < 1 && (
        <T x={hx} y={hy + press * 26} r={-8}>
          <PointerHand press={press} />
        </T>
      )}
    </>
  )
}

const COUNT_X = [210, 390, 570, 750]

/**
 * kTowers/count — "Your turn! Count the critters with your finger." Four
 * critters hop in and stand well apart on the path (the check asks how many);
 * a hand waves on "Your turn" and taps the air on "Count"; a "?" pops.
 */
const count: Scene = ({ t, cue }: SceneProps) => {
  const turn = cue('Your turn')
  const countAt = cue('Count')
  const critterAt = cue('critters')
  return (
    <>
      <Paper />
      <Grass />
      <path d="M -20 380 L 980 380" fill="none" stroke={M.ink} strokeWidth={70} strokeLinecap="round" />
      <path d="M -20 380 L 980 380" fill="none" stroke="#e2c48a" strokeWidth={62} />
      <path d="M -20 380 L 980 380" fill="none" stroke="#f1d9a6" strokeWidth={50} />
      {COUNT_X.map((x, i) => {
        const s = spring(t, critterAt - 0.6 + i * 0.18, { stiffness: 200, damping: 11 })
        if (s <= 0.001) return null
        return (
          <T key={i} x={x} y={350 - (1 - clamp(s)) * 120} s={s}>
            <Critter r={42} />
          </T>
        )
      })}
      <Pop t={t} at={countAt + 0.5} x={480} y={110} bounce={10}>
        <circle cx={480} cy={110} r={46} fill={M.white} stroke={M.ink} strokeWidth={4} />
        <Title x={480} y={114} size={64} color={M.sea}>
          ?
        </Title>
      </Pop>
      <Pop t={t} at={turn} x={892} y={520} bounce={11}>
        <T x={892} y={520 - bump(t, countAt, 0.4) * 22} r={-22 + wobble(t, turn + 0.3, { amp: 14, freq: 1.6, decay: 2.6 })}>
          <PointerHand press={bump(t, countAt, 0.4)} />
        </T>
      </Pop>
    </>
  )
}

/**
 * kTowers/stronger — "Towers stop the critters. Tap a tower to make it
 * stronger!" A tower beside the path sends a gold ball at a critter, which
 * goes home in a puff of sparkles ("stop"); a hand taps the tower ("Tap a
 * tower"), and it grows a little with a gold star under it ("stronger").
 */
const stronger: Scene = ({ t, cue }: SceneProps) => {
  const stop = cue('critters') + 0.3
  const tapTower = cue('Tap a tower')
  const strongerAt = cue('stronger')
  const ball = progress(t, stop - 0.3, 0.5)
  const poof = t >= stop + 0.2
  // the critter walks in from the left until it is stopped
  const [cx, cy] = along(lerp(0.2, 0.46, ease.outCubic(progress(t, 0, stop + 0.2))))
  const reach = ease.inOutCubic(progress(t, tapTower - 0.5, 0.5))
  const leave = ease.inQuad(progress(t, strongerAt + 0.6, 0.5))
  const hx = lerp(lerp(1040, 230, reach), 1060, leave)
  const hy = lerp(lerp(620, 330, reach), 100, leave)
  const press = bump(t, tapTower + 0.05, 0.32)
  const grow = 1 + 0.18 * ease.outBack(progress(t, strongerAt, 0.5))
  return (
    <>
      <Paper />
      <Grass />
      <SandPath />
      <T x={860} y={340} s={1.15}>
        <House />
      </T>
      <T x={230} y={500}>
        <T s={grow}>
          <Tower />
        </T>
      </T>
      <Pop t={t} at={strongerAt} x={230} y={516} bounce={9}>
        <path d={star(20)} transform="translate(230 516)" fill={M.gold} stroke={M.ink} strokeWidth={3.5} strokeLinejoin="round" />
      </Pop>
      <Burst t={t} at={strongerAt + 0.1} x={230} y={420} r={130} color={M.gold} rays={12} />
      {!poof && (
        <T x={cx} y={cy - 8}>
          <Critter r={36} />
        </T>
      )}
      {ball > 0 && ball < 1 && <circle cx={lerp(240, cx, ball)} cy={lerp(370, cy, ball) - Math.sin(ball * Math.PI) * 60} r={11} fill={M.gold} stroke={M.ink} strokeWidth={3.5} />}
      <Burst t={t} at={stop + 0.2} x={cx} y={cy} r={90} color="#b79af0" rays={10} />
      <Burst t={t} at={stop + 0.45} x={cx} y={cy} r={60} color={M.gold} rays={8} />
      {t >= tapTower - 0.5 && leave < 1 && (
        <T x={hx} y={hy + press * 26} r={-8}>
          <PointerHand press={press} />
        </T>
      )}
    </>
  )
}

export const kTowersScenes: Record<string, Scene> = { critters, build, count, stronger }
