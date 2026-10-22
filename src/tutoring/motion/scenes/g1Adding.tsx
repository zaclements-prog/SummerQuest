/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { arc, ease, progress, spring, wobble } from '../anim'
import { Burst, Glow, Paper, Pop, T } from '../kit'
import { M } from '../palette'
import { Dot } from '../shapes'
import type { Scene, SceneProps } from '../types'
import { NumDisc, PointerHand, STICKER } from './_kart'
import { TenFrame, frameCell } from './_kmathart'
import { NumBox, SentenceLine } from './_g1art'

/*
 * 1st grade adding within 20 (1.OA.3, 1.OA.6), for Adding Mesa: count on
 * from the bigger number, turn a fact around, make a ten, doubles. Each
 * number sentence is written at the top as it is said; the picture under it
 * does the strategy. Numerals and math signs only, never words.
 */

const EQ_Y = 82

/** 0 → 1 → 0 over `dur` from `at` (a hop, a bob). */
const bump = (t: number, at: number, dur = 0.32) => {
  const k = progress(t, at, dur)
  return k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI)
}

/** "Your turn": a hand waves from the corner. */
function Wave({ t, at }: { t: number; at: number }) {
  return (
    <Pop t={t} at={at} x={892} y={520} bounce={11}>
      <T x={892} y={520} r={-22 + wobble(t, at + 0.3, { amp: 14, freq: 1.6, decay: 2.6 })}>
        <PointerHand />
      </T>
    </Pop>
  )
}

/** The count-on picture: a box with the start, and a dot for each one to count on (numbered from `numberAt`). */
function CountOnPicture({ t, at, start, on, numberAt, x0 = 250, y = 330 }: { t: number; at: number; start: number; on: number; numberAt: readonly number[]; x0?: number; y?: number }) {
  const DX = Array.from({ length: on }, (_, i) => x0 + 210 + i * 130)
  return (
    <>
      <Pop t={t} at={at} x={x0} y={y} bounce={11}>
        <T x={x0} y={y}>
          <NumBox n={start} s={170} />
        </T>
      </Pop>
      {DX.map((x, i) => {
        const shown = spring(t, at + 0.3 + i * 0.12, { stiffness: 220, damping: 14 })
        if (shown <= 0.001) return null
        const n = numberAt[i]
        const counted = n !== undefined && t >= n
        const hop = counted ? bump(t, n, 0.4) : 0
        return (
          <g key={i}>
            {counted && i > 0 && <path d={`M ${DX[i - 1]} ${y - 56} Q ${(DX[i - 1] + x) / 2} ${y - 120} ${x} ${y - 56}`} fill="none" stroke={M.ink} strokeWidth={4} strokeDasharray="8 8" opacity={0.4} />}
            {counted && i === 0 && <path d={`M ${x0 + 60} ${y - 90} Q ${(x0 + x) / 2 + 20} ${y - 150} ${x} ${y - 56}`} fill="none" stroke={M.ink} strokeWidth={4} strokeDasharray="8 8" opacity={0.4} />}
            <T x={x} y={y - hop * 26} s={Math.min(1, shown)}>
              {counted ? <NumDisc n={start + i + 1} r={50} fill={STICKER.blue} /> : <circle r={50} fill="#dfeaff" stroke={M.ink} strokeWidth={4} />}
            </T>
          </g>
        )
      })}
    </>
  )
}

/**
 * g1Adding/countOn — "Eight plus three. Start at eight. Count on: nine, ten,
 * eleven!" The sentence 8 + 3 = ? is written; a box with 8 and three dots
 * pop in; the box glows on "Start at eight"; each dot takes its number as it
 * is counted on; the answer 11 fills the box.
 */
const countOn: Scene = ({ t, cue }: SceneProps) => {
  const said = cue('Eight plus three')
  const start = cue('Start at eight')
  const nine = cue('nine')
  const ten = cue('ten,')
  const eleven = cue('eleven')
  return (
    <>
      <Paper />
      <SentenceLine t={t} x={480} y={EQ_Y} tokens={[8, '+', 3, '=', '?']} at={said} solveAt={eleven + 0.3} answer={11} />
      <Glow t={t} at={start} x={250} y={330} r={130} breathe={false} out={nine} />
      <CountOnPicture t={t} at={said + 0.4} start={8} on={3} numberAt={[nine, ten, eleven]} />
      <Burst t={t} at={eleven + 0.4} x={700} y={EQ_Y} r={90} />
    </>
  )
}

/**
 * g1Adding/turnAround — "Your turn! Two plus nine. Turn it around: start at
 * nine." 2 + 9 = ? is written; on "Turn it around" the 2 and the 9 swap
 * places; on "start at nine" a box with 9 and two dots pop in. No answer:
 * the check asks for it.
 */
const turnAround: Scene = ({ t, cue }: SceneProps) => {
  const turn = cue('Your turn')
  const said = cue('Two plus nine')
  const around = cue('Turn it around')
  const start = cue('start at nine')
  // the 2 and the 9 swap places: two one-digit slots apart (SentenceLine's widths at size 72)
  const k = ease.inOutCubic(progress(t, around + 0.2, 0.8))
  const gap = 2 * (72 * 0.62 + 72 * 0.3)
  return (
    <>
      <Paper />
      <SentenceLine t={t} x={480} y={EQ_Y} tokens={[2, '+', 9, '=', '?']} at={said} dx={[k * gap, 0, -k * gap, 0, 0]} />
      <CountOnPicture t={t} at={start} start={9} on={2} numberAt={[]} x0={300} />
      <Glow t={t} at={start + 0.2} x={300} y={330} r={130} breathe={false} />
      <Wave t={t} at={turn} />
    </>
  )
}

const CELL = 74
const LEFT = { x: 270, y: 330 }
const RIGHT = { x: 690, y: 330 }
const cellIn = (o: { x: number; y: number }, i: number): [number, number] => {
  const [dx, dy] = frameCell(i, CELL)
  return [o.x + dx, o.y + dy]
}

/**
 * g1Adding/makeTen — "Eight plus five. Move two to make ten. Ten and three is
 * thirteen!" 8 + 5 = ? is written; two ten-frames: eight red counters and
 * five blue; on "Move two" two blue counters hop into the first frame; it
 * glows with a 10; "Ten and three": the three left glow; 13 fills the box.
 */
const makeTen: Scene = ({ t, cue }: SceneProps) => {
  const said = cue('Eight plus five')
  const move = cue('Move two')
  const made = cue('make ten')
  const three = cue('Ten and three')
  const thirteen = cue('thirteen')
  return (
    <>
      <Paper />
      <SentenceLine t={t} x={480} y={EQ_Y} tokens={[8, '+', 5, '=', '?']} at={said} solveAt={thirteen + 0.2} answer={13} />
      <Glow t={t} at={made} x={LEFT.x} y={LEFT.y} r={220} breathe={false} />
      <Pop t={t} at={said + 0.3} x={LEFT.x} y={LEFT.y} bounce={11}>
        <T x={LEFT.x} y={LEFT.y}>
          <TenFrame cell={CELL} />
        </T>
      </Pop>
      <Pop t={t} at={said + 0.45} x={RIGHT.x} y={RIGHT.y} bounce={11}>
        <T x={RIGHT.x} y={RIGHT.y}>
          <TenFrame cell={CELL} />
        </T>
      </Pop>
      {Array.from({ length: 8 }, (_, i) => {
        const s = spring(t, said + 0.6 + i * 0.08, { stiffness: 230, damping: 14 })
        if (s <= 0.001) return null
        const [x, y] = cellIn(LEFT, i)
        return <Dot key={`a${i}`} x={x} y={y - (1 - Math.min(1, s)) * 80} r={27} color={STICKER.coral} />
      })}
      {Array.from({ length: 5 }, (_, i) => {
        const s = spring(t, said + 0.9 + i * 0.08, { stiffness: 230, damping: 14 })
        if (s <= 0.001) return null
        const from = cellIn(RIGHT, i)
        // the first two hop over into the empty spots, one after the other
        if (i < 2) {
          const p = ease.inOutCubic(progress(t, move + 0.3 + i * 0.5, 0.6))
          const to = cellIn(LEFT, 8 + i)
          const [x, y] = arc(from, to, 110, p)
          return <Dot key={`b${i}`} x={x} y={y - (1 - Math.min(1, s)) * 80} r={27} color={STICKER.blue} />
        }
        const lit = t >= three
        return (
          <g key={`b${i}`}>
            {lit && <circle cx={from[0]} cy={from[1]} r={34} fill={M.gold} opacity={0.45 * ease.outCubic(progress(t, three, 0.4))} />}
            <Dot x={from[0]} y={from[1] - (1 - Math.min(1, s)) * 80} r={27} color={STICKER.blue} />
          </g>
        )
      })}
      <Pop t={t} at={made + 0.1} x={LEFT.x + 2.5 * CELL} y={LEFT.y - CELL} bounce={10}>
        <T x={LEFT.x + 2.5 * CELL} y={LEFT.y - CELL}>
          <NumDisc n={10} r={34} />
        </T>
      </Pop>
      <Burst t={t} at={thirteen + 0.3} x={700} y={EQ_Y} r={90} />
    </>
  )
}

/**
 * g1Adding/doubles — "Your turn! Six and six. That is a double." Two rows of
 * six counters pop in, one red and one blue, matched one under the other;
 * 6 + 6 = ? is written; on "double" both rows glow. A hand waves "your turn".
 */
const doubles: Scene = ({ t, cue }: SceneProps) => {
  const turn = cue('Your turn')
  const said = cue('Six and six')
  const dbl = cue('double')
  const XS = Array.from({ length: 6 }, (_, i) => 255 + i * 90)
  return (
    <>
      <Paper />
      <SentenceLine t={t} x={480} y={EQ_Y} tokens={[6, '+', 6, '=', '?']} at={said} />
      <Glow t={t} at={dbl} x={480} y={250} r={150} breathe={false} />
      <Glow t={t} at={dbl + 0.15} x={480} y={390} r={150} breathe={false} />
      {[0, 1].map((row) =>
        XS.map((x, i) => {
          const y = row === 0 ? 250 : 390
          const s = spring(t, said + row * 0.5 + i * 0.07, { stiffness: 230, damping: 14 })
          if (s <= 0.001) return null
          const hop = bump(t, dbl + i * 0.06, 0.35) * 16
          return <Dot key={`${row}-${i}`} x={x} y={y - hop - (1 - Math.min(1, s)) * 60} r={34} color={row === 0 ? STICKER.coral : STICKER.blue} />
        }),
      )}
      <Wave t={t} at={turn} />
    </>
  )
}

export const g1AddingScenes: Record<string, Scene> = { countOn, turnAround, makeTen, doubles }
