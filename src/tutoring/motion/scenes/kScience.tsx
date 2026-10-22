/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import type { ReactNode } from 'react'
import { ease, lerp, progress, spring, wobble } from '../anim'
import { Burst, Glow, Paper, Pop, T, Title } from '../kit'
import { M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { PointerHand } from './_kart'
import { Arrow, Crate, DRAWINGS, Fist, PULL, PUSH, Palm, Sun } from '../../../games/listenPlay/drawings'

/*
 * Kindergarten nature colour code (whole lesson):
 *   the weather and the gear are the very drawings on the Nature Summit cards;
 *   what a living thing needs pops in beside it, joined by a gold glow;
 *   a PUSH is a flat hand and a coral arrow going away, a PULL a hand on a
 *   rope and a blue arrow coming back (the cards' icon pair).
 * Nothing on the stage to read: pictures, and "?" at most.
 */

/** 0 → 1 → 0 over `dur` from `at` (a hop). */
const bump = (t: number, at: number, dur = 0.36) => {
  const k = progress(t, at, dur)
  return k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI)
}

/** A card drawing (100 × 100) centred at (x, y), `size` px across. */
function Drawing({ name, x, y, size }: { name: string; x: number; y: number; size: number }) {
  const k = size / 100
  return <g transform={`translate(${x - size / 2} ${y - size / 2}) scale(${k})`}>{DRAWINGS[name]?.()}</g>
}

/** A white "?" bubble. */
function Ask({ t, at, x, y }: { t: number; at: number; x: number; y: number }) {
  return (
    <Pop t={t} at={at} x={x} y={y} bounce={10}>
      <circle cx={x} cy={y} r={44} fill={M.white} stroke={M.ink} strokeWidth={4} />
      <Title x={x} y={y + 4} size={62} color={M.sea}>
        ?
      </Title>
    </Pop>
  )
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

const PANEL_X = [150, 370, 590, 810]
const PANEL_Y = 280

/**
 * kScience/weather — "Look at the sky! It can be sunny, rainy, snowy or
 * windy." A cloud drifts over on "sky"; then the four weather pictures (the
 * cards' own) pop in one by one as each is named, each one hopping as it's said.
 */
const weather: Scene = ({ t, cue }: SceneProps) => {
  const sky = cue('sky')
  const names = [cue('sunny'), cue('rainy'), cue('snowy'), cue('windy')]
  const drift = ease.outCubic(progress(t, sky, 1.4))
  return (
    <>
      <Paper />
      {/* the sky: a soft band and a cloud drifting in, then resting top-left */}
      <rect x={0} y={0} width={960} height={150} fill="#dff1fb" opacity={ease.outCubic(progress(t, sky - 0.2, 0.6))} />
      <T x={lerp(-120, 120, drift)} y={70} s={1.1}>
        <path d="M -60 20 Q -75 20 -75 3 Q -75 -14 -55 -17 Q -52 -45 -22 -45 Q -5 -65 20 -50 Q 50 -55 55 -25 Q 78 -22 75 0 Q 75 20 55 20 Z" fill={M.white} stroke={M.ink} strokeWidth={4} strokeLinejoin="round" />
      </T>
      {(['sunny', 'rainy', 'snowy', 'windy'] as const).map((w, k) => (
        <Pop key={w} t={t} at={names[k]} x={PANEL_X[k]} y={PANEL_Y} bounce={11}>
          <T x={0} y={-bump(t, names[k] + 0.05, 0.42) * 26}>
            <Drawing name={w} x={PANEL_X[k]} y={PANEL_Y} size={205} />
          </T>
        </Pop>
      ))}
    </>
  )
}

const DROPS = [
  [150, 0],
  [270, 0.35],
  [390, 0.15],
  [510, 0.5],
  [630, 0.25],
  [750, 0.6],
  [870, 0.1],
] as const

/**
 * kScience/rain — "Uh oh, rain! We want to stay dry. Your turn!" The rainy
 * day (the card's picture) grows in the middle and rain falls across the
 * stage for a moment; on "stay dry" a "?" pops beside it (what do we need?),
 * and a hand waves on "Your turn".
 */
const rain: Scene = ({ t, cue }: SceneProps) => {
  const rainAt = cue('rain')
  const dry = cue('stay dry')
  const turn = cue('Your turn')
  const grow = spring(t, rainAt - 0.3, { stiffness: 170, damping: 13 })
  // the shower: drops fall for a little while, then stop
  const shower = progress(t, rainAt, 3)
  return (
    <>
      <Paper />
      {grow > 0.001 && (
        <T x={430} y={270} s={grow}>
          <Drawing name="rainy" x={0} y={0} size={330} />
        </T>
      )}
      {shower > 0 &&
        shower < 1 &&
        DROPS.map(([x, d], i) => {
          const k = ((shower * 3 + d) % 1) * (1 - shower * 0.2)
          const y = lerp(-20, 560, k)
          return <path key={i} d={`M ${x} ${y - 16} Q ${x + 11} ${y + 3} ${x} ${y + 10} Q ${x - 11} ${y + 3} ${x} ${y - 16} Z`} fill="#6cc7ea" stroke={M.ink} strokeWidth={3} opacity={0.85} />
        })}
      <Ask t={t} at={dry + 0.2} x={760} y={150} />
      <TurnHand t={t} at={turn} />
    </>
  )
}

/** A seedling in a pot; `grow` 0…1 makes it taller with a flower. */
function Plant({ grow }: { grow: number }) {
  const h = lerp(40, 120, grow)
  return (
    <g strokeLinejoin="round">
      <path d={`M 0 0 L 0 ${-h}`} stroke={M.ink} strokeWidth={9} strokeLinecap="round" />
      <path d={`M 0 0 L 0 ${-h}`} stroke="#4fa65a" strokeWidth={4.5} strokeLinecap="round" />
      <path d={`M 0 ${-h * 0.45} Q -42 ${-h * 0.62} -46 ${-h * 0.36} Q -20 ${-h * 0.28} 0 ${-h * 0.45} Z`} fill="#6cc56b" stroke={M.ink} strokeWidth={4} />
      <path d={`M 0 ${-h * 0.62} Q 42 ${-h * 0.8} 46 ${-h * 0.52} Q 20 ${-h * 0.44} 0 ${-h * 0.62} Z`} fill="#8edb7c" stroke={M.ink} strokeWidth={4} />
      {grow > 0.5 && (
        <g transform={`translate(0 ${-h}) scale(${ease.outBack(progress(grow, 0.5, 0.5))})`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 16} cy={Math.sin((a * Math.PI) / 180) * 16} r={11} fill="#f7a1c4" stroke={M.ink} strokeWidth={3.5} />
          ))}
          <circle r={10} fill="#ffd75e" stroke={M.ink} strokeWidth={3.5} />
        </g>
      )}
      <path d="M -50 0 L 50 0 L 40 62 L -40 62 Z" fill="#e07a4a" stroke={M.ink} strokeWidth={4.5} />
      <rect x={-56} y={-8} width={112} height={18} rx={5} fill="#f2a65a" stroke={M.ink} strokeWidth={4.5} />
    </g>
  )
}

/** A bunny sitting, facing right (about 150 px tall). */
function Bunny() {
  const fur = '#f1e7da'
  const ink = { stroke: M.ink, strokeWidth: 4, strokeLinejoin: 'round' as const }
  return (
    <g>
      <ellipse cx={-6} cy={-6} rx={48} ry={40} fill={fur} {...ink} />
      <ellipse cx={-26} cy={-92} rx={12} ry={36} transform="rotate(-12 -26 -92)" fill={fur} {...ink} />
      <ellipse cx={4} cy={-94} rx={12} ry={36} transform="rotate(10 4 -94)" fill={fur} {...ink} />
      <ellipse cx={4} cy={-94} rx={5} ry={24} transform="rotate(10 4 -94)" fill="#f7a1c4" />
      <circle cx={10} cy={-52} r={34} fill={fur} {...ink} />
      <circle cx={22} cy={-58} r={4.5} fill={M.ink} />
      <ellipse cx={40} cy={-46} rx={6} ry={4.5} fill="#f7a1c4" {...ink} strokeWidth={2.5} />
      <circle cx={-52} cy={6} r={12} fill={M.white} {...ink} />
    </g>
  )
}

/** A little house (the animals' home). */
function House() {
  const ink = { stroke: M.ink, strokeWidth: 4.5, strokeLinejoin: 'round' as const }
  return (
    <g>
      <rect x={-56} y={-50} width={112} height={92} fill="#ffe7c2" {...ink} />
      <path d="M -72 -46 L 0 -108 L 72 -46 Z" fill="#f2766b" {...ink} />
      <rect x={-18} y={-4} width={36} height={46} rx={4} fill="#c7955f" {...ink} />
      <rect x={24} y={-34} width={22} height={22} rx={3} fill="#9fe0f2" {...ink} strokeWidth={3.5} />
    </g>
  )
}

/** A water drop (radius about r). */
const Drop = ({ r = 22 }: { r?: number }) => <path d={`M 0 ${-r * 1.4} Q ${r} ${-r * 0.1} ${r * 0.9} ${r * 0.35} Q ${r * 0.7} ${r} 0 ${r} Q ${-r * 0.7} ${r} ${-r * 0.9} ${r * 0.35} Q ${-r} ${-r * 0.1} 0 ${-r * 1.4} Z`} fill="#6cc7ea" stroke={M.ink} strokeWidth={4} strokeLinejoin="round" />

/** A carrot, pointing down-left. */
const Carrot = () => (
  <g strokeLinejoin="round">
    <path d="M -10 -30 Q -24 -52 -14 -60 M -2 -32 Q -2 -58 8 -62 M 6 -28 Q 22 -48 30 -44" fill="none" stroke="#4fa65a" strokeWidth={7} strokeLinecap="round" />
    <path d="M -18 -28 Q 0 -40 18 -26 L -26 40 Z" fill="#f2a65a" stroke={M.ink} strokeWidth={4} />
  </g>
)

/**
 * kScience/needs — "Plants need sun and water. Animals need food, water and a
 * home." A seedling in a pot: the sun shines on it ("sun"), drops fall on it
 * ("water") and it grows a flower. A bunny: a carrot pops in on "food", a
 * drop on the second "water", and a house behind it on "home".
 */
const needs: Scene = ({ t, cue }: SceneProps) => {
  const plants = cue('Plants')
  const sun = cue('sun')
  const water1 = cue('water')
  const animals = cue('Animals')
  const food = cue('food')
  const water2 = cue('water', 1)
  const home = cue('home')
  const pot = spring(t, plants - 0.3, { stiffness: 200, damping: 13 })
  const grow = ease.inOutCubic(progress(t, water1 + 0.4, 1.4))
  const falling = progress(t, water1, 1.1)
  const bunny = spring(t, animals - 0.2, { stiffness: 200, damping: 13 })
  return (
    <>
      <Paper />
      <rect x={0} y={448} width={960} height={92} fill="#a9e08f" />
      <path d="M 0 448 L 960 448" stroke={M.ink} strokeWidth={4} />
      {/* the plant and what it needs */}
      <Glow t={t} at={sun} x={140} y={110} r={90} breathe={false} />
      <Pop t={t} at={sun} x={140} y={110} bounce={11}>
        <T x={140} y={110} s={2.4}>
          <Sun x={0} y={0} r={17} />
        </T>
      </Pop>
      {falling > 0 &&
        falling < 1 &&
        [0, 1, 2].map((i) => (
          <T key={i} x={280 + i * 30} y={lerp(120, 330, Math.min(1, falling * 1.25 - i * 0.12))}>
            <Drop r={14} />
          </T>
        ))}
      <Pop t={t} at={water1} x={420} y={150} bounce={11}>
        <T x={420} y={150}>
          <Drop r={30} />
        </T>
      </Pop>
      {pot > 0.001 && (
        <T x={290} y={392} s={pot}>
          <Plant grow={grow} />
        </T>
      )}
      {/* the bunny and what it needs */}
      {bunny > 0.001 && (
        <T x={700} y={430} s={bunny}>
          <Pop t={t} at={home} x={70} y={-60} bounce={11}>
            <T x={70} y={-50} s={1.25}>
              <House />
            </T>
          </Pop>
          <Bunny />
        </T>
      )}
      <Pop t={t} at={food} x={560} y={200} bounce={11}>
        <T x={560} y={200} r={20}>
          <Carrot />
        </T>
      </Pop>
      <Pop t={t} at={water2} x={560} y={330} bounce={11}>
        <T x={560} y={330}>
          <Drop r={28} />
        </T>
      </Pop>
      <Burst t={t} at={home + 0.4} x={770} y={330} r={160} color={M.gold} rays={12} />
    </>
  )
}

/**
 * kScience/push — "A push moves it away. A pull brings it close. Your turn!"
 * Top: a flat hand presses a box and it slides AWAY, and the coral arrow
 * points the way it went (the push card). Bottom: a hand on a rope tugs a box
 * and it slides CLOSE, and the blue arrow points back at the hand (the pull
 * card). A hand waves on "Your turn" (which one moves the box away?).
 */
const push: Scene = ({ t, cue }: SceneProps) => {
  const pushAt = cue('push')
  const away = cue('away')
  const pullAt = cue('pull')
  const close = cue('close')
  const turn = cue('Your turn')
  // the push: the hand reaches the box, then hand and box go together, the box further
  const reach = ease.inOutCubic(progress(t, pushAt, 0.5))
  const slide = ease.outCubic(progress(t, pushAt + 0.45, 1.1))
  const handX = lerp(20, 48, reach) + slide * 18
  const boxX = 50 + slide * 120
  // the pull: the rope tightens, the box comes to the hand
  const tug = ease.outCubic(progress(t, pullAt + 0.2, 1.1))
  const pullBox = 330 - tug * 150
  const top = spring(t, 0.05, { stiffness: 200, damping: 14 })
  const bottom = spring(t, pullAt - 0.5, { stiffness: 200, damping: 14 })
  const row = (children: ReactNode, y: number, s: number) => (
    <g transform={`translate(70 ${y}) scale(2.2)`} opacity={Math.min(1, s * 2)}>
      {children}
    </g>
  )
  return (
    <>
      <Paper />
      <path d="M 40 238 L 920 238 M 40 478 L 920 478" stroke={M.ink} strokeWidth={4} strokeLinecap="round" opacity={0.35} />
      {top > 0.001 &&
        row(
          <>
            <Crate x={boxX} y={42} s={36} />
            <Palm x={handX} y={62} />
            {slide > 0.05 && <Arrow a={[boxX - 6, 22]} b={[boxX - 6 + 50 * Math.min(1, slide * 1.4), 22]} color={PUSH} />}
          </>,
          60,
          top,
        )}
      <Glow t={t} at={away} x={70 + (50 + 120 + 18) * 2.2} y={60 + 60 * 2.2} r={80} breathe={false} />
      {bottom > 0.001 &&
        row(
          <>
            <path d={`M 28 62 Q ${(28 + pullBox) / 2} ${64 + (1 - tug) * 4} ${pullBox} 62`} fill="none" stroke={M.ink} strokeWidth={5} strokeLinecap="round" />
            <path d={`M 28 62 Q ${(28 + pullBox) / 2} ${64 + (1 - tug) * 4} ${pullBox} 62`} fill="none" stroke="#d9a66b" strokeWidth={2.4} strokeLinecap="round" />
            <Crate x={pullBox} y={44} s={36} />
            <Fist x={24} y={62} />
            {tug > 0.05 && <Arrow a={[pullBox + 40, 24]} b={[pullBox + 40 - 50 * Math.min(1, tug * 1.4), 24]} color={PULL} />}
          </>,
          290,
          bottom,
        )}
      <Glow t={t} at={close} x={70 + (330 - 150) * 2.2} y={290 + 62 * 2.2} r={80} breathe={false} />
      <TurnHand t={t} at={turn} x={900} y={520} />
    </>
  )
}

export const kScienceScenes: Record<string, Scene> = { weather, rain, needs, push }
