/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { ease, lerp, progress, spring } from '../anim'
import { Burst, Draw, Glow, Paper, Pop, T } from '../kit'
import { M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { Crate, HeightThingArt, LengthThingArt, MEASURE_PALETTE, Pan, START_GREEN } from '../../../games/listenPlay/activities/measureArt'

/*
 * Kindergarten measuring colour code (whole lesson), the same pictures as
 * Measure Marsh: lengths start at a GREEN start line (with a little flag),
 * heights stand on the GREEN ground; a DASHED line shows where the shorter
 * one stops, and the longer one's extra bit glows GOLD. On the scale, the
 * heavy side goes down. Nothing to read: no numerals here at all.
 */

const COLORS = { green: MEASURE_PALETTE[6], coral: MEASURE_PALETTE[0], mint: MEASURE_PALETTE[2], gold: MEASURE_PALETTE[1], blue: MEASURE_PALETTE[3], lilac: MEASURE_PALETTE[4] }

// ── lengths ──────────────────────────────────────────────────────────────────

const U = 66
const X0 = 150
const ROWS = [205, 345]
const THICK = 76

/** The green start line, drawing itself on at `at`, with its flag. */
function StartLine({ t, at, glow }: { t: number; at: number; glow?: number }) {
  return (
    <>
      {glow !== undefined && <Glow t={t} at={glow} x={X0} y={(ROWS[0] + ROWS[1]) / 2} r={150} color={START_GREEN} breathe={false} />}
      <Draw t={t} at={at} dur={0.5} d={`M ${X0} ${ROWS[1] + 70} V ${ROWS[0] - 80}`} stroke={START_GREEN} width={8} />
      <Pop t={t} at={at + 0.4} x={X0} y={ROWS[0] - 80}>
        <path d={`M ${X0} ${ROWS[0] - 80} L ${X0 + 34} ${ROWS[0] - 67} L ${X0} ${ROWS[0] - 54} Z`} fill={START_GREEN} stroke={M.ink} strokeWidth={3} strokeLinejoin="round" />
      </Pop>
    </>
  )
}

/** Where the shorter one stops (a dashed line), and the longer one's extra bit glowing. */
function Ends({ t, at, short, long, row }: { t: number; at: number; short: number; long: number; row: number }) {
  const k = ease.outCubic(progress(t, at, 0.5))
  if (k <= 0) return null
  const xs = X0 + short * U
  const xl = X0 + long * U
  return (
    <g opacity={k}>
      <rect x={xs} y={ROWS[row] - THICK * 0.66} width={(xl - xs) * k} height={THICK * 1.32} rx={12} fill="#ffe594" opacity={0.7} />
      <Draw t={t} at={at} dur={0.5} d={`M ${xs} ${ROWS[0] - THICK * 0.8} V ${ROWS[1] + THICK * 0.8}`} stroke={M.ink} width={5} dash="12 10" />
    </g>
  )
}

/**
 * kMeasure/lineUp — "Look at the two snakes. Let's line them up at the
 * start. Now look at the ends. This snake is longer!" A long green snake and
 * a shorter coral one that starts further along (so its end sticks out past
 * the green one's); the start line draws on, the coral snake slides back to
 * it, a dashed line marks where it stops, and the green snake's extra bit glows.
 */
const lineUp: Scene = ({ t, cue }: SceneProps) => {
  const look = cue('two snakes')
  const line = cue('line them up')
  const ends = cue('look at the ends')
  const longer = cue('longer')
  const slide = ease.inOutCubic(progress(t, cue('at the start'), 0.9))
  const coralX = X0 + lerp(3, 0, slide) * U
  return (
    <>
      <Paper />
      <StartLine t={t} at={line - 0.2} />
      <Ends t={t} at={ends} short={6} long={8} row={0} />
      <Glow t={t} at={longer} x={X0 + 4 * U} y={ROWS[0]} r={300} color={M.gold} breathe={false} />
      <Pop t={t} at={look - 0.3} x={X0 + 4 * U} y={ROWS[0]}>
        <T x={X0} y={ROWS[0]}>
          <LengthThingArt thing="snake" len={8 * U} thick={THICK} unit={U} color={COLORS.green} />
        </T>
      </Pop>
      <Pop t={t} at={look - 0.1} x={coralX + 3 * U} y={ROWS[1]}>
        <T x={coralX} y={ROWS[1]}>
          <LengthThingArt thing="snake" len={6 * U} thick={THICK} unit={U} color={COLORS.coral} />
        </T>
      </Pop>
      <Burst t={t} at={longer} x={X0 + 8 * U - 20} y={ROWS[0]} r={70} />
    </>
  )
}

/**
 * kMeasure/yourTurn — "Your turn! A snake and a caterpillar. They start at
 * the same place." A snake and a caterpillar pop in on their words, both at
 * the start line, which glows on "same place". (The check: which is longer?)
 */
const yourTurn: Scene = ({ t, cue }: SceneProps) => {
  const snake = cue('snake')
  const cat = cue('caterpillar')
  const same = cue('same place')
  return (
    <>
      <Paper />
      <StartLine t={t} at={0.1} glow={same} />
      <Pop t={t} at={snake} x={X0 + 3.5 * U} y={ROWS[0]}>
        <T x={X0} y={ROWS[0]}>
          <LengthThingArt thing="snake" len={7 * U} thick={THICK} unit={U} color={COLORS.mint} />
        </T>
      </Pop>
      <Pop t={t} at={cat} x={X0 + 2 * U} y={ROWS[1]}>
        <T x={X0} y={ROWS[1]}>
          <LengthThingArt thing="worm" len={4 * U} thick={THICK} unit={U} color={COLORS.gold} />
        </T>
      </Pop>
    </>
  )
}

// ── heights ──────────────────────────────────────────────────────────────────

const GROUND = 486
const HU = 38
const TX = [330, 630]

/**
 * kMeasure/tall — "Now two towers. One stands on a box. Stand them on the
 * same ground. This tower is taller!" A tall blue tower on the ground and a
 * shorter coral one up on a crate (so its top is higher); the crate slides
 * away and the coral tower steps down to the ground; a dashed line shows its
 * top, and the blue tower's extra blocks glow.
 */
const tall: Scene = ({ t, cue }: SceneProps) => {
  const towers = cue('two towers')
  const box = cue('on a box')
  const down = ease.inOutCubic(progress(t, cue('same ground'), 0.9))
  const taller = cue('taller')
  const crateH = 3 * HU
  const lift = crateH * (1 - down)
  const topK = ease.outCubic(progress(t, taller - 0.4, 0.5))
  return (
    <>
      <Paper />
      {/* the ground */}
      <rect x={120} y={GROUND} width={720} height={16} rx={7} fill="#a9e08f" />
      <path d={`M 120 ${GROUND} H 840`} stroke={START_GREEN} strokeWidth={8} strokeLinecap="round" />
      <Glow t={t} at={box} x={TX[1]} y={GROUND - crateH / 2} r={110} color={M.gold} out={cue('same ground')} breathe={false} />
      {down < 1 && (
        <T x={TX[1] + down * 160} y={GROUND} o={1 - down}>
          <Crate w={120} h={crateH} />
        </T>
      )}
      {topK > 0 && (
        <g opacity={topK}>
          <rect x={TX[0] - 62} y={GROUND - 7 * HU} width={124} height={2 * HU} rx={12} fill="#ffe594" opacity={0.75} />
          <path d={`M ${TX[0] - 90} ${GROUND - 5 * HU} H ${TX[1] + 90}`} stroke={M.ink} strokeWidth={5} strokeDasharray="12 10" strokeLinecap="round" />
        </g>
      )}
      <Pop t={t} at={towers - 0.2} x={TX[0]} y={GROUND}>
        <T x={TX[0]} y={GROUND}>
          <HeightThingArt thing="tower" h={7 * HU} w={100} unit={HU} color={COLORS.blue} />
        </T>
      </Pop>
      <Pop t={t} at={towers} x={TX[1]} y={GROUND - lift}>
        <T x={TX[1]} y={GROUND - lift}>
          <HeightThingArt thing="tower" h={5 * HU} w={100} unit={HU} color={COLORS.coral} />
        </T>
      </Pop>
      <Burst t={t} at={taller} x={TX[0]} y={GROUND - 7 * HU - 20} r={70} />
    </>
  )
}

// ── weight ───────────────────────────────────────────────────────────────────

const PX = 480
const PY = 380
const ARM = 250
const POST = 44
const PAN = 190

/** A watermelon, sitting on y = 0. */
function Watermelon({ s }: { s: number }) {
  return (
    <g strokeLinejoin="round">
      <ellipse cx={0} cy={-s * 0.36} rx={s * 0.5} ry={s * 0.36} fill="#5fbf5a" stroke={M.ink} strokeWidth={4} />
      {[-0.28, 0, 0.28].map((dx, i) => (
        <path key={i} d={`M ${dx * s} ${-s * 0.7} Q ${dx * s + s * 0.1 * (dx < 0 ? -1 : dx > 0 ? 1 : 0)} ${-s * 0.36} ${dx * s} ${-s * 0.02}`} fill="none" stroke="#2f7d3a" strokeWidth={6} strokeLinecap="round" />
      ))}
      <ellipse cx={-s * 0.18} cy={-s * 0.55} rx={s * 0.12} ry={s * 0.05} fill="#ffffff" opacity={0.4} />
    </g>
  )
}

/** A strawberry, sitting on y = 0. */
function Strawberry({ s }: { s: number }) {
  return (
    <g strokeLinejoin="round">
      <path d={`M 0 0 C ${-s * 0.55} ${-s * 0.25} ${-s * 0.5} ${-s * 0.85} 0 ${-s * 0.78} C ${s * 0.5} ${-s * 0.85} ${s * 0.55} ${-s * 0.25} 0 0 Z`} fill="#ef4b3f" stroke={M.ink} strokeWidth={3.5} />
      <path d={`M ${-s * 0.24} ${-s * 0.8} L 0 ${-s * 0.98} L ${s * 0.24} ${-s * 0.8} L 0 ${-s * 0.7} Z`} fill="#5fbf5a" stroke={M.ink} strokeWidth={3} />
      {[
        [-0.15, -0.5],
        [0.14, -0.55],
        [0, -0.3],
      ].map(([dx, dy], i) => (
        <ellipse key={i} cx={dx * s} cy={dy * s} rx={s * 0.035} ry={s * 0.06} fill="#ffe594" />
      ))}
    </g>
  )
}

/** An up or down arrow beside a pan, drawing on at `at`. */
function SideArrow({ t, at, x, y, down }: { t: number; at: number; x: number; y: number; down: boolean }) {
  const k = ease.outBack(progress(t, at, 0.45))
  if (k <= 0) return null
  const d = down ? 1 : -1
  return (
    <T x={x} y={y} s={k}>
      <path d={`M 0 ${-d * 40} V ${d * 34} M -20 ${d * 14} L 0 ${d * 38} L 20 ${d * 14}`} fill="none" stroke={down ? M.coral : '#3d8bf2'} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
    </T>
  )
}

/**
 * kMeasure/heavy — "This is a scale. The heavy side goes down. The light side
 * goes up!" A balance scale with a watermelon and a strawberry; it starts
 * level, then tips: the watermelon's side goes down (an arrow down), the
 * strawberry's goes up (an arrow up). (The check: which is heavier?)
 */
const heavy: Scene = ({ t, cue }: SceneProps) => {
  const scale = cue('a scale')
  const tip = ease.inOutCubic(progress(t, cue('heavy side'), 1))
  const deg = -14 * tip
  const a = (deg * Math.PI) / 180
  const ends = [-1, 1].map((d) => ({ x: PX + d * ARM * Math.cos(a), y: PY + d * ARM * Math.sin(a) }))
  const rim = ends.map((e) => e.y - POST)
  const pop = spring(t, scale - 0.4, { stiffness: 200, damping: 14 })
  return (
    <>
      <Paper />
      <T x={PX} y={540} s={pop}>
        <T x={-PX} y={-540}>
          <path d={`M ${PX - 120} 520 Q ${PX} 476 ${PX + 120} 520 Z`} fill="#c7955f" stroke={M.ink} strokeWidth={5} strokeLinejoin="round" />
          <rect x={PX - 14} y={PY} width={28} height={520 - PY - 18} rx={8} fill="#e2b47c" stroke={M.ink} strokeWidth={5} />
          <g transform={`rotate(${deg} ${PX} ${PY})`}>
            <rect x={PX - ARM - 14} y={PY - 12} width={ARM * 2 + 28} height={24} rx={12} fill="#ffcf4d" stroke={M.ink} strokeWidth={5} />
          </g>
          <circle cx={PX} cy={PY} r={21} fill={M.coral} stroke={M.ink} strokeWidth={5} />
          {ends.map((e, i) => (
            <g key={i}>
              <circle cx={e.x} cy={e.y} r={9} fill="#fffaf0" stroke={M.ink} strokeWidth={4} />
              <T x={e.x} y={rim[i]}>
                <Pan w={PAN} />
                {i === 0 ? <Watermelon s={150} /> : <Strawberry s={86} />}
              </T>
            </g>
          ))}
        </T>
      </T>
      <SideArrow t={t} at={cue('goes down')} x={ends[0].x - PAN / 2 - 50} y={rim[0] - 40} down />
      <SideArrow t={t} at={cue('goes up')} x={ends[1].x + PAN / 2 + 50} y={rim[1] - 40} down={false} />
    </>
  )
}

export const kMeasureScenes: Record<string, Scene> = { lineUp, yourTurn, tall, heavy }
