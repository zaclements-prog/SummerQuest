/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { ease, lerp, progress, spring, wobble } from '../anim'
import { Burst, Glow, Paper, Pop, T, Title } from '../kit'
import { M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { PointerHand } from './_kart'
import { DRAWINGS } from '../../../games/listenPlay/drawings'

/*
 * 1st-grade Sky Summit colour code (whole lesson): the drawings are the very
 * ones on the Sky Summit cards (shaking things have shake lines and notes; the
 * flashlight's beam goes through glass and stops at wood; the day sky and the
 * night sky; a bird feeding its chicks, a hen on her eggs); a GOLD glow or
 * burst marks what is being said. Nothing to read.
 */

const EMOJI_FONT = "'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif"

/** 0 → 1 → 0 over `dur` from `at` (a hop). */
const bump = (t: number, at: number, dur = 0.36) => {
  const k = progress(t, at, dur)
  return k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI)
}

function TurnHand({ t, at, x = 892, y = 520 }: { t: number; at: number; x?: number; y?: number }) {
  return (
    <Pop t={t} at={at} x={x} y={y} bounce={11}>
      <T x={x} y={y - bump(t, at + 0.5, 0.4) * 22} r={-22 + wobble(t, at + 0.3, { amp: 14, freq: 1.6, decay: 2.6 })}>
        <PointerHand press={bump(t, at + 0.5, 0.4)} />
      </T>
    </Pop>
  )
}

/** A card drawing (100 × 100) centred at (x, y), `size` px across. */
function Drawing({ name, x, y, size }: { name: string; x: number; y: number; size: number }) {
  const k = size / 100
  return <g transform={`translate(${x - size / 2} ${y - size / 2}) scale(${k})`}>{DRAWINGS[name]?.()}</g>
}

function Emoji({ x, y, size, children }: { x: number; y: number; size: number; children: string }) {
  return (
    <text x={x} y={y + size * 0.06} fontSize={size} fontFamily={EMOJI_FONT} textAnchor="middle" dominantBaseline="central">
      {children}
    </text>
  )
}

/** A music note, its head at (x, y). */
function Note({ x, y, s = 1, fill = M.lilac }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M 9 0 V -42 Q 27 -36 30 -21" fill="none" stroke={M.ink} strokeWidth={7} strokeLinecap="round" />
      <ellipse cx={0} cy={0} rx={13} ry={10} transform="rotate(-20)" fill={fill} stroke={M.ink} strokeWidth={5} />
    </g>
  )
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

/**
 * g1Science/sound — "Tap a drum. Its top shakes very fast. Things that shake
 * make sound!" The drum (the card's); on "Tap" it is hit and starts to shake
 * (its picture with shake lines, jiggling); on "make sound" notes float up
 * from it and a burst.
 */
const sound: Scene = ({ t, cue }: SceneProps) => {
  const tap = cue('Tap a drum')
  const hit = tap + 0.6
  const shakes = cue('shakes')
  const sound = cue('make sound')
  const pop = spring(t, 0.1, { stiffness: 190, damping: 14 })
  const shaking = t > hit
  const jiggle = shaking ? Math.sin(t * 46) * (t > shakes ? 5 : 2.5) : 0
  return (
    <>
      <Paper />
      <Glow t={t} at={shakes} x={480} y={300} r={240} color={M.gold} breathe={false} />
      <T x={480 + jiggle} y={290} s={Math.max(0, pop)}>
        <Drawing name={shaking ? (t < hit + 0.5 ? 'drumHit' : 'drumRing') : 'drumStill'} x={0} y={0} size={380} />
      </T>
      {[0, 1, 2, 3].map((i) => {
        const k = progress(t, sound + i * 0.3, 2.2)
        if (k <= 0 || k >= 1) return null
        const x = 480 + (i % 2 ? 1 : -1) * (150 + i * 30) + Math.sin(k * 6 + i) * 20
        return (
          <g key={i} opacity={1 - k}>
            <Note x={x} y={lerp(220, 40, k)} s={1.1} fill={[M.lilac, M.mint, M.coral, M.gold][i]} />
          </g>
        )
      })}
      <Burst t={t} at={sound} x={480} y={170} r={110} />
    </>
  )
}

/**
 * g1Science/light — "We need light to see. Light goes through glass. Wood
 * blocks the light and makes a shadow! Your turn!" A dark room lights up on
 * "light to see"; then the flashlight shining at glass (the beam goes on
 * through) and at wood (it stops: a shadow behind), each popping in on its
 * word; a hand waves on "Your turn". (The check: which one blocks the light?)
 */
const light: Scene = ({ t, cue }: SceneProps) => {
  const see = cue('light to see')
  const lit = ease.inOutCubic(progress(t, see, 0.6))
  return (
    <>
      <Paper />
      <Pop t={t} at={0.1} x={170} y={280}>
        <g>
          <Drawing name="roomDark" x={170} y={280} size={270} />
          <g opacity={lit}>
            <Drawing name="roomLit" x={170} y={280} size={270} />
          </g>
        </g>
      </Pop>
      <Pop t={t} at={cue('through glass')} x={480} y={280}>
        <Drawing name="glass" x={480} y={280} size={270} />
      </Pop>
      <Pop t={t} at={cue('Wood blocks')} x={790} y={280}>
        <Drawing name="wood" x={790} y={280} size={270} />
      </Pop>
      <Burst t={t} at={cue('shadow')} x={835} y={280} r={70} color={M.lilac} />
      <TurnHand t={t} at={cue('Your turn')} />
    </>
  )
}

/**
 * g1Science/sky — "In the day, we see the sun. At night, we see the moon and
 * stars. The sun comes up, and goes down." The day sky pops in on "day", the
 * night sky on "night"; then, on the right, the sun climbs its path over the
 * hills on "comes up" and sinks again on "goes down".
 */
const sky: Scene = ({ t, cue }: SceneProps) => {
  const up = ease.inOutCubic(progress(t, cue('comes up'), 1.2))
  const down = ease.inOutCubic(progress(t, cue('goes down'), 1.2))
  // along the arc: 0 (rising, left) → 0.5 (high) → 1 (setting, right)
  const a = up * 0.5 + down * 0.5
  const ang = Math.PI * (1 - a)
  const sx = 790 + Math.cos(ang) * 120
  const sy = 360 - Math.sin(ang) * 170
  const show = spring(t, cue('The sun comes') - 0.3, { stiffness: 190, damping: 14 })
  const sky = a < 0.15 || a > 0.85 ? '#ffd9b8' : '#cfeaff'
  return (
    <>
      <Paper />
      <Pop t={t} at={cue('In the day')} x={170} y={280}>
        <Drawing name="daySky" x={170} y={280} size={270} />
      </Pop>
      <Pop t={t} at={cue('At night')} x={470} y={280}>
        <Drawing name="nightSky" x={470} y={280} size={270} />
      </Pop>
      {show > 0.01 && (
        <T x={790} y={280} s={Math.min(1, show)}>
          <T x={-790} y={-280}>
            <rect x={655} y={145} width={270} height={270} rx={38} fill={sky} stroke={M.ink} strokeWidth={8} />
            <path d="M 670 360 Q 790 120 910 360" fill="none" stroke={M.ink} strokeWidth={5} strokeDasharray="10 12" opacity={0.4} />
            <g>
              {Array.from({ length: 8 }, (_, i) => {
                const r = (i / 8) * Math.PI * 2
                return <line key={i} x1={sx + Math.cos(r) * 32} y1={sy + Math.sin(r) * 32} x2={sx + Math.cos(r) * 46} y2={sy + Math.sin(r) * 46} stroke={M.ink} strokeWidth={9} strokeLinecap="round" />
              })}
              <circle cx={sx} cy={sy} r={26} fill="#ffd75e" stroke={M.ink} strokeWidth={7} />
            </g>
            <path d="M 659 372 Q 720 340 790 372 Q 850 350 921 372 L 921 377 Q 921 411 887 411 L 693 411 Q 659 411 659 377 Z" fill="#6fbb63" />
          </T>
        </T>
      )}
    </>
  )
}

/**
 * g1Science/families — "A puppy looks like its mom, but not just the same.
 * Parents feed their babies and keep them warm. Your turn!" A puppy and its
 * mom pop in side by side; the bird feeding its chicks and the hen on her
 * eggs pop in on "feed" and "warm"; on "Your turn" they make way for a chick
 * and a "?" (the check: which is its parent?).
 */
const families: Scene = ({ t, cue }: SceneProps) => {
  const turn = cue('Your turn')
  const out = turn - 0.1
  return (
    <>
      <Paper />
      <Pop t={t} at={cue('A puppy')} x={120} y={300} out={out}>
        <Emoji x={120} y={300} size={130}>
          🐶
        </Emoji>
      </Pop>
      <Pop t={t} at={cue('its mom')} x={280} y={280} out={out}>
        <Emoji x={280} y={280} size={190}>
          🐕
        </Emoji>
      </Pop>
      <Glow t={t} at={cue('not just')} x={200} y={290} r={190} color={M.gold} out={cue('Parents')} breathe={false} />
      <Pop t={t} at={cue('feed')} x={560} y={280} out={out}>
        <Drawing name="birdFeeds" x={560} y={280} size={250} />
      </Pop>
      <Pop t={t} at={cue('warm')} x={830} y={280} out={out}>
        <Drawing name="henWarms" x={830} y={280} size={250} />
      </Pop>
      <Pop t={t} at={turn + 0.2} x={440} y={290}>
        <Emoji x={440} y={290} size={200}>
          🐤
        </Emoji>
      </Pop>
      <Ask t={t} at={turn + 0.5} x={600} y={170} />
      <TurnHand t={t} at={turn + 0.4} />
    </>
  )
}

export const g1ScienceScenes: Record<string, Scene> = { sound, light, sky, families }
