/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { ease, lerp, progress, spring } from '../anim'
import { Burst, Chip, Draw, Glow, Paper, Pop, Ring, Title } from '../kit'
import { DEEP, M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { ColorWords, Dot, Frac, Plane, XMark, gx, gy, type Grid } from './_g5mgd'

/*
 * 5th-grade line plot colour code (whole lesson): the Xs BLUE, a counted
 * stack GOLD, a total CORAL; Pattern A CORAL (x), Pattern B BLUE (y).
 * The sprouts' heights in eighths: 2, 3, 3, 4, 4, 4, 5, 5, 6, 7.
 */

const HEIGHTS = [2, 3, 3, 4, 4, 4, 5, 5, 6, 7]
const X0 = 130
const X1 = 830
const AXIS = 400
const tx = (e: number) => lerp(X0, X1, e / 8)

/** The number line from 0 to 1 inch in eighths (drawing on from `at`), labelled 0, 1/8 … 1. */
function EighthsLine({ t, at }: { t: number; at: number }) {
  return (
    <>
      <Draw t={t} at={at} dur={0.6} d={`M ${X0 - 30} ${AXIS} L ${X1 + 30} ${AXIS}`} stroke={M.ink} width={5} />
      {Array.from({ length: 9 }, (_, e) => {
        const k = spring(t, at + 0.3 + e * 0.05, { stiffness: 300, damping: 16 })
        if (k <= 0.001) return null
        const major = e === 0 || e === 8
        return (
          <g key={e} opacity={Math.min(1, k * 2)}>
            <line x1={tx(e)} y1={AXIS - (major ? 16 : 10)} x2={tx(e)} y2={AXIS + (major ? 16 : 10)} stroke={M.ink} strokeWidth={major ? 5 : 3.5} strokeLinecap="round" />
            {major ? (
              <Title x={tx(e)} y={AXIS + 44} size={30}>
                {e / 8}
              </Title>
            ) : (
              <Frac x={tx(e)} y={AXIS + 46} n={e} d={8} size={20} />
            )}
          </g>
        )
      })}
      <Title x={(X0 + X1) / 2} y={AXIS + 102} size={24} color={M.inkSoft}>
        height (inches)
      </Title>
    </>
  )
}

/** The ten Xs, each dropping onto its stack from `at` (`gap` s apart). */
function Xs({ t, at, gap = 0.22, color }: { t: number; at: number; gap?: number; color?: (e: number) => string | undefined }) {
  const seen: Record<number, number> = {}
  return (
    <>
      {HEIGHTS.map((e, i) => {
        const k = (seen[e] = (seen[e] ?? -1) + 1)
        const s = ease.outBack(progress(t, at + i * gap, 0.35))
        const y = AXIS - 40 - k * 40
        return <XMark key={i} x={tx(e)} y={y - (1 - Math.min(1, s)) * 60} r={14} s={s} color={color?.(e)} />
      })}
    </>
  )
}

/** lineplots/plot — the number line draws in eighths, and an X drops above it for each sprout. */
const plot: Scene = ({ t, cue }: SceneProps) => {
  const sprouts = cue('ten bean sprouts')
  const line = cue('A line plot')
  const x = cue('an X above')
  return (
    <>
      <Paper />
      <Title x={480} y={60} size={40}>
        Bean sprout heights
      </Title>
      {Array.from({ length: 10 }, (_, i) => (
        <Pop key={i} t={t} at={sprouts + i * 0.08} out={line} x={150 + i * 74} y={200}>
          <path d={`M ${150 + i * 74} 250 L ${150 + i * 74} ${200 - (HEIGHTS[i] - 2) * 12}`} stroke={M.leaf} strokeWidth={8} strokeLinecap="round" />
          <ellipse cx={150 + i * 74 + 12} cy={200 - (HEIGHTS[i] - 2) * 12} rx={14} ry={8} fill={M.leaf} stroke={M.ink} strokeWidth={2.5} />
        </Pop>
      ))}
      <EighthsLine t={t} at={line} />
      <Xs t={t} at={x + 0.3} />
    </>
  )
}

/** lineplots/read — count the stack over 4/8 (= 1/2): three; the tallest stack is the most common. */
const read: Scene = ({ t, cue }: SceneProps) => {
  const three = cue('Three sprouts')
  const half = cue('one half')
  const tall = cue('The tallest stack')
  return (
    <>
      <Paper />
      <EighthsLine t={t} at={-1} />
      <Xs t={t} at={-5} color={(e) => (e === 4 && t >= three ? DEEP.gold : undefined)} />
      <Glow t={t} at={tall} x={tx(4)} y={AXIS - 80} r={70} color={M.gold} />
      {[0, 1, 2].map((k) => (
        <Pop key={k} t={t} at={three + 0.2 + k * 0.3} x={tx(4) - 46} y={AXIS - 40 - k * 40}>
          <circle cx={tx(4) - 46} cy={AXIS - 40 - k * 40} r={15} fill={M.white} stroke={M.ink} strokeWidth={3} />
          <Title x={tx(4) - 46} y={AXIS - 39 - k * 40} size={18}>
            {k + 1}
          </Title>
        </Pop>
      ))}
      <Pop t={t} at={half} x={700} y={110}>
        <g>
          <Frac x={640} y={110} n={4} d={8} size={30} color={DEEP.gold} />
          <Title x={700} y={110} size={40}>
            =
          </Title>
          <Frac x={760} y={110} n={1} d={2} size={30} color={DEEP.gold} />
        </g>
      </Pop>
      <ColorWords t={t} at={tall + 0.4} x={260} y={110} size={40} text="most common" colors={[DEEP.gold, DEEP.gold]} />
    </>
  )
}

/** lineplots/total — the two Xs over 5/8 add: 5/8 + 5/8 = 10/8 = 1 1/4 inches. */
const total: Scene = ({ t, cue }: SceneProps) => {
  const add = cue('add the measurements')
  const two = cue('add up to ten eighths')
  const mixed = cue('one and one fourth')
  return (
    <>
      <Paper />
      <EighthsLine t={t} at={-1} />
      <Xs t={t} at={-5} color={(e) => (e === 5 && t >= add ? DEEP.coral : undefined)} />
      <Ring t={t} at={add + 0.3} out={mixed + 1} x={tx(5)} y={AXIS - 60} r={46} color={DEEP.coral} />
      <Pop t={t} at={two} x={480} y={110}>
        <g>
          <Frac x={260} y={110} n={5} d={8} size={30} color={DEEP.coral} />
          <Title x={320} y={110} size={40}>
            +
          </Title>
          <Frac x={380} y={110} n={5} d={8} size={30} color={DEEP.coral} />
          <Title x={440} y={110} size={40}>
            =
          </Title>
          <Frac x={505} y={110} n={10} d={8} size={30} />
        </g>
      </Pop>
      <Pop t={t} at={mixed} x={650} y={110}>
        <g>
          <Title x={575} y={110} size={40}>
            =
          </Title>
          <Frac x={650} y={110} whole={1} n={1} d={4} size={30} color={DEEP.coral} />
          <Title x={735} y={112} size={30} anchor="start">
            inches
          </Title>
        </g>
      </Pop>
    </>
  )
}

const LEVELS = [1 / 4, 1 / 2, 1 / 2, 3 / 4]

function Beaker({ x, y, level, label }: { x: number; y: number; level: number; label?: [number, number] }) {
  const h = 200
  return (
    <g>
      <rect x={x - 50} y={y - h + h * (1 - level)} width={100} height={h * level} fill={M.sea} opacity={0.75} />
      <path d={`M ${x - 52} ${y - h - 10} L ${x - 52} ${y} L ${x + 52} ${y} L ${x + 52} ${y - h - 10}`} fill="none" stroke={M.ink} strokeWidth={5} strokeLinejoin="round" />
      {label && <Frac x={x} y={y + 50} n={label[0]} d={label[1]} size={24} />}
    </g>
  )
}

/** lineplots/share — four beakers (1/4, 1/2, 1/2, 3/4 L) pour together (2 L), then share out: 1/2 L each. */
const share: Scene = ({ t, cue }: SceneProps) => {
  const all = cue('Add it all')
  const div = cue('divide by four')
  const each = cue('each gets')
  const even = ease.inOutCubic(progress(t, div + 0.3, 1.2))
  return (
    <>
      <Paper />
      {LEVELS.map((lv, i) => (
        <Pop key={i} t={t} at={cue('Four beakers') + i * 0.25} x={170 + i * 160} y={300}>
          <Beaker x={170 + i * 160} y={400} level={lerp(lv, 1 / 2, even)} label={even > 0.5 ? [1, 2] : lv === 1 / 4 ? [1, 4] : lv === 3 / 4 ? [3, 4] : [1, 2]} />
        </Pop>
      ))}
      <ColorWords t={t} at={all - 0.3} gap={0.15} x={480} y={70} size={40} text="1/4 + 1/2 + 1/2 + 3/4 = 2 liters" colors={[M.ink, M.ink, M.ink, M.ink, M.ink, M.ink, M.ink, M.ink, DEEP.coral, DEEP.coral]} />
      <Chip t={t} at={div} x={480} y={140} text="2 ÷ 4 = 1/2 liter" color={M.sky} size={30} />
      <Burst t={t} at={each + 0.2} x={480} y={150} />
    </>
  )
}

const PG: Grid = { ox: 560, oy: 470, u: 36, n: 10 }

/** lineplots/patterns — two rows of terms, paired up and plotted: the points make a line, B = 2 × A. */
const patterns: Scene = ({ t, cue }: SceneProps) => {
  const a = cue('Pattern A adds three')
  const b = cue('Pattern B adds six')
  const pairUp = cue('Pair them up')
  const plotAt = cue('plot them')
  const line = cue('make a line')
  const twice = cue('twice')
  const A = [0, 3, 6, 9]
  const B = [0, 6, 12, 18]
  return (
    <>
      <Paper />
      <Title x={60} y={110} size={36} anchor="start" color={DEEP.coral}>
        A
      </Title>
      <Title x={60} y={190} size={36} anchor="start" color={DEEP.blue}>
        B
      </Title>
      {A.map((v, i) => (
        <Pop key={`a${i}`} t={t} at={a + 0.3 + i * 0.3} x={140 + i * 90} y={110}>
          <Title x={140 + i * 90} y={110} size={36} color={DEEP.coral}>
            {v}
          </Title>
        </Pop>
      ))}
      {B.map((v, i) => (
        <Pop key={`b${i}`} t={t} at={b + 0.3 + i * 0.3} x={140 + i * 90} y={190}>
          <Title x={140 + i * 90} y={190} size={36} color={DEEP.blue}>
            {v}
          </Title>
        </Pop>
      ))}
      {A.map((v, i) => (
        <Pop key={`p${i}`} t={t} at={pairUp + i * 0.3} x={140 + i * 90} y={290 + (i % 2) * 50}>
          <Title x={140 + i * 90} y={290 + (i % 2) * 50} size={28} stroke={M.white}>
            {`(${v}, ${B[i]})`}
          </Title>
        </Pop>
      ))}
      <Plane t={t} g={PG} xAt={plotAt - 0.8} yAt={plotAt - 0.8} numbers={false} />
      {[0, 5, 10].map((i) => (
        <g key={i} opacity={progress(t, plotAt - 0.4, 0.3)}>
          <Title x={gx(PG, i)} y={PG.oy + 20} size={18} weight={600} color={M.inkSoft}>
            {i}
          </Title>
          {i > 0 && (
            <Title x={PG.ox - 16} y={gy(PG, i)} size={18} weight={600} color={M.inkSoft}>
              {i * 2}
            </Title>
          )}
        </g>
      ))}
      {progress(t, line, 0.1) > 0 && <Draw t={t} at={line} dur={0.8} d={`M ${gx(PG, 0)} ${gy(PG, 0)} L ${gx(PG, 9.5)} ${gy(PG, 9.5)}`} stroke={M.coral} width={4} dash="10 8" />}
      {A.map((v, i) => (
        // the y-axis counts by 2s: B lands at B ÷ 2 grid lines
        <Dot key={i} g={PG} x={v} y={B[i] / 2} color={M.gold} s={ease.outBack(progress(t, plotAt + i * 0.3, 0.35))} />
      ))}
      <ColorWords t={t} at={twice} x={300} y={440} size={44} text="B = 2 × A" colors={[DEEP.blue, M.ink, M.ink, M.ink, DEEP.coral]} />
    </>
  )
}

export const g5LinePlotsScenes: Record<string, Scene> = { plot, read, total, share, patterns }
