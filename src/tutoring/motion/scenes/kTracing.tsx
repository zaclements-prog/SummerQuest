/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { ease, lerp, progress, spring, wobble } from '../anim'
import { Burst, Paper, Pop, T } from '../kit'
import { DEEP, M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { pointAlong, type Pt } from '../../../lib/trace/geometry'
import { BASE, DOT_R, MID, TOP, glyph, strokeArrows, type Glyph } from '../../../lib/trace/glyphs'
import { PointerHand } from './_kart'

/*
 * Kindergarten tracing colour code (whole lesson): the same picture as
 * Writing Workshop's tracing screen. A glyph is a thick, light path on
 * handwriting lines; the stroke to do next has a GREEN dot where it starts
 * and an ORANGE arrow the way it goes; the finger's ink is crayon blue. The
 * glyphs, dots and arrows come from the same stroke data the game checks
 * (src/lib/trace/glyphs.ts). Nothing to read: the letters are the paths.
 */

const INK = DEEP.blue
const GREEN = '#36c35a'
const ARROW = '#ff8a3d'
/** The glyph box (100 units) on the stage: 3.8 px a unit, centred. */
const S = 3.8
const GX = 480 - 50 * S
const GY = 268 - 50 * S

const L_ = glyph('letter', 'L')
const O_ = glyph('letter', 'O')
const T_ = glyph('letter', 'T')

const onStage = (p: Pt): [number, number] => [GX + p.x * S, GY + p.y * S]

/** 0 → 1 → 0 over `dur` from `at` (a tap). */
const bump = (t: number, at: number, dur = 0.34) => {
  const k = progress(t, at, dur)
  return k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI)
}

/**
 * A glyph to trace: handwriting lines, every stroke thick and light with a
 * dotted middle, the ink drawn so far (`ink[i]`: 0–1 of stroke i), and the
 * current stroke's green dot (`dot` 0–1 pops it in) and arrows (`arrow` 0–1).
 */
function GlyphArt({ g, ink, current, dot = 1, arrow = 1, bounce = 0 }: { g: Glyph; ink: number[]; current: number; dot?: number; arrow?: number; bounce?: number }) {
  const cur = current >= 0 ? g.strokes[current] : null
  return (
    <T x={GX} y={GY} s={S}>
      {g.lines && (
        <g>
          <line x1={-12} x2={112} y1={TOP} y2={TOP} stroke="#a9cdea" strokeWidth={0.9} />
          <line x1={-12} x2={112} y1={MID} y2={MID} stroke="#a9cdea" strokeWidth={0.9} strokeDasharray="3.2 2.6" />
          <line x1={-12} x2={112} y1={BASE} y2={BASE} stroke="#7fb0da" strokeWidth={1.2} />
        </g>
      )}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {g.strokes.map((s, i) => (
          <path key={`o${i}`} d={s.path} stroke={i === current ? INK : '#dccbb0'} strokeOpacity={i === current ? 0.45 : 1} strokeWidth={16} />
        ))}
        {g.strokes.map((s, i) => (
          <path key={`i${i}`} d={s.path} stroke={i === current ? '#ffffff' : '#f5ecdd'} strokeWidth={12.6} />
        ))}
        {g.strokes.map((s, i) => (
          <path key={`c${i}`} d={s.path} stroke="#c9b28d" strokeWidth={1.3} strokeDasharray="0.01 3.4" />
        ))}
        <g transform={bounce ? `translate(50 50) scale(${1 + bounce * 0.06}) translate(-50 -50)` : undefined}>
          {g.strokes.map((s, i) => {
            const k = ink[i] ?? 0
            if (k <= 0.001) return null
            const len = s.sampled.length
            return <path key={`k${i}`} d={s.path} stroke={INK} strokeWidth={9} opacity={0.92} strokeDasharray={`${len} ${len + 20}`} strokeDashoffset={len * (1 - Math.min(1, k))} />
          })}
        </g>
      </g>
      {cur && arrow > 0.01 && (
        <g opacity={Math.min(1, arrow)}>
          {strokeArrows(cur).map((a, i) => {
            // (a little bigger than the game's: the lesson stage is farther away)
            const k = 1.35
            const n = { x: -a.dir.y, y: a.dir.x }
            const tip = { x: a.p.x + a.dir.x * 3.8 * k, y: a.p.y + a.dir.y * 3.8 * k }
            const back = { x: a.p.x - a.dir.x * 2.6 * k, y: a.p.y - a.dir.y * 2.6 * k }
            const pts = [tip, { x: back.x + n.x * 3.6 * k, y: back.y + n.y * 3.6 * k }, { x: a.p.x - a.dir.x * 0.6 * k, y: a.p.y - a.dir.y * 0.6 * k }, { x: back.x - n.x * 3.6 * k, y: back.y - n.y * 3.6 * k }]
            return <polygon key={i} points={pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')} fill={ARROW} stroke={M.ink} strokeWidth={0.9} strokeLinejoin="round" />
          })}
        </g>
      )}
      {cur && dot > 0.001 && (
        <g transform={`translate(${cur.start.x} ${cur.start.y}) scale(${dot})`}>
          <circle r={DOT_R} fill={GREEN} stroke={M.ink} strokeWidth={1.1} />
          <circle cx={-1.6} cy={-1.7} r={1.5} fill="#fff" opacity={0.85} />
        </g>
      )}
    </T>
  )
}

/**
 * The hand, its fingertip on a point of the glyph (box units). It reaches in
 * from below and to the right (as in the game's help), so the ink it lays
 * down on a line going down or across stays in sight.
 */
function Finger({ at, press = 0, r = 0 }: { at: Pt; press?: number; r?: number }) {
  const [x, y] = onStage(at)
  return (
    <T x={x} y={y} s={0.66} r={155 + r}>
      <PointerHand press={press} />
    </T>
  )
}

/** Where along stroke `s` the finger is, `k` of the way (0–1). */
const along = (g: Glyph, s: number, k: number) => pointAlong(g.strokes[s].sampled, Math.min(1, Math.max(0, k)) * g.strokes[s].sampled.length).p

/**
 * kTracing/dot — "Let's trace! Find the green dot. That is where we start."
 * A big, light L lands on handwriting lines; its green dot pops at the top;
 * the hand comes in and taps the dot.
 */
const dot: Scene = ({ t, cue }: SceneProps) => {
  const trace = cue('trace')
  const green = cue('green dot')
  const start = cue('where we start')
  const land = spring(t, trace, { stiffness: 190, damping: 13 })
  const dotK = spring(t, green, { stiffness: 260, damping: 11 })
  const top = L_.strokes[0].start
  // the hand: in from the bottom right, onto the dot, one tap
  const come = ease.outCubic(progress(t, start - 0.55, 0.6))
  const rest = onStage(top)
  const from: Pt = { x: (980 - GX) / S, y: (620 - GY) / S }
  const at = { x: lerp(from.x, top.x, come), y: lerp(from.y, top.y, come) }
  return (
    <>
      <Paper />
      {land > 0.001 && (
        <T x={480} y={268} s={0.6 + 0.4 * Math.min(1.05, land)} o={Math.min(1, land * 2)}>
          <T x={-480} y={-268}>
            <GlyphArt g={L_} ink={[]} current={0} dot={dotK} arrow={0} />
          </T>
        </T>
      )}
      <Burst t={t} at={green + 0.1} x={rest[0]} y={rest[1]} r={46} color={GREEN} />
      {come > 0.001 && <Finger at={at} press={bump(t, start + 0.15)} r={-8 * (1 - come)} />}
    </>
  )
}

/**
 * kTracing/lineL — "Follow the arrow. Big line down. Then a little line
 * across. That's L!" The arrow points down; the finger traces the big line
 * down, the ink following; the second dot and arrow appear at the bottom and
 * the finger traces the little line across; the L hops.
 */
const lineL: Scene = ({ t, cue }: SceneProps) => {
  const arrowAt = cue('arrow')
  const down = cue('Big line down')
  const across = cue('little line across')
  const thats = cue("That's L")
  const k1 = ease.inOutCubic(progress(t, down, 1.5))
  const k2 = ease.inOutCubic(progress(t, across + 0.15, 1.1))
  const current = k1 < 1 ? 0 : k2 < 1 ? 1 : -1
  const dot2 = current === 1 ? spring(t, down + 1.5, { stiffness: 260, damping: 11 }) : 1
  const arrowK = current === 0 ? ease.outCubic(progress(t, arrowAt, 0.4)) : current === 1 ? ease.outCubic(progress(t, down + 1.6, 0.4)) : 0
  const fingerAt = k1 < 1 ? along(L_, 0, k1) : along(L_, 1, k2)
  const hop = bump(t, thats + 0.1, 0.5)
  const [cx, cy] = onStage({ x: 50, y: 50 })
  return (
    <>
      <Paper />
      <GlyphArt g={L_} ink={[k1, k2]} current={current} dot={current === 1 ? dot2 : 1} arrow={arrowK} bounce={hop} />
      <Burst t={t} at={thats + 0.1} x={cx} y={cy} r={150} />
      <Finger at={fingerAt} press={k1 > 0 && k1 < 1 ? 0.6 : k2 > 0 && k2 < 1 ? 0.6 : 0} />
    </>
  )
}

/**
 * kTracing/aroundO — "Now O. Start at the green dot. Go around like a C. Keep
 * going, all the way around. That's O!" A big O lands; its dot pops near
 * the top on the right, the arrow points back the way a C goes; the finger
 * goes around like a C, then keeps going to the top; the O hops.
 */
const aroundO: Scene = ({ t, cue }: SceneProps) => {
  const now = cue('Now O')
  const green = cue('green dot')
  const c = cue('around like a C')
  const keep = cue('Keep going')
  const thats = cue("That's O")
  const land = spring(t, now, { stiffness: 190, damping: 13 })
  const dotK = spring(t, green, { stiffness: 260, damping: 11 })
  // the C part (three quarters), then the rest of the way round
  const k = 0.75 * ease.inOutCubic(progress(t, c, 1.8)) + 0.25 * ease.inOutCubic(progress(t, keep + 0.2, 1.2))
  const finger = ease.outCubic(progress(t, green + 0.2, 0.6))
  const start = O_.strokes[0].start
  const from: Pt = { x: (980 - GX) / S, y: (600 - GY) / S }
  const at = k > 0 ? along(O_, 0, k) : { x: lerp(from.x, start.x, finger), y: lerp(from.y, start.y, finger) }
  const hop = bump(t, thats + 0.1, 0.5)
  const [cx, cy] = onStage({ x: 50, y: 50 })
  return (
    <>
      <Paper />
      {land > 0.001 && (
        <T x={480} y={268} s={0.6 + 0.4 * Math.min(1.05, land)} o={Math.min(1, land * 2)}>
          <T x={-480} y={-268}>
            <GlyphArt g={O_} ink={[k]} current={k < 1 ? 0 : -1} dot={dotK} arrow={ease.outCubic(progress(t, green + 0.3, 0.4))} bounce={hop} />
          </T>
        </T>
      )}
      <Burst t={t} at={thats + 0.1} x={cx} y={cy} r={150} />
      {finger > 0.001 && <Finger at={at} press={k > 0 && k < 1 ? 0.6 : 0} />}
    </>
  )
}

/**
 * kTracing/yourTurn — "Your turn! Start at the dot, and follow the arrow. You
 * can do it!" A big T waits with its green dot and arrow; the hand waves
 * hello, taps the dot, the arrow nods down, and stars burst.
 */
const yourTurn: Scene = ({ t, cue }: SceneProps) => {
  const turn = cue('Your turn')
  const startAt = cue('Start at the dot')
  const follow = cue('follow the arrow')
  const can = cue('You can do it')
  const top = T_.strokes[0].start
  const come = ease.outCubic(progress(t, startAt - 0.5, 0.55))
  const wave: Pt = { x: 112, y: 96 }
  const at = { x: lerp(wave.x, top.x, come), y: lerp(wave.y, top.y, come) }
  const nod = bump(t, follow + 0.1, 0.5)
  const [cx, cy] = onStage({ x: 50, y: 40 })
  return (
    <>
      <Paper />
      <Pop t={t} at={turn - 0.3} x={480} y={268} bounce={13}>
        <GlyphArt g={T_} ink={[]} current={0} arrow={1 - nod * 0.5} dot={1 + bump(t, startAt + 0.2) * 0.35} />
      </Pop>
      <Burst t={t} at={can + 0.1} x={cx - 160} y={cy} r={60} color={M.coral} />
      <Burst t={t} at={can + 0.3} x={cx + 160} y={cy} r={60} />
      <Pop t={t} at={turn} x={onStage(wave)[0]} y={onStage(wave)[1]} bounce={11}>
        <Finger at={at} press={bump(t, startAt + 0.2)} r={come < 1 ? -24 * (1 - come) + wobble(t, turn + 0.3, { amp: 14, freq: 1.6, decay: 2.6 }) : 0} />
      </Pop>
    </>
  )
}

export const kTracingScenes: Record<string, Scene> = { dot, lineL, aroundO, yourTurn }
