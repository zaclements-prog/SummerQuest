/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { arc, ease, progress, spring, wobble } from '../anim'
import { Burst, Glow, Paper, Pop, T } from '../kit'
import { M } from '../palette'
import { Dot, Frog } from '../shapes'
import type { Scene, SceneProps } from '../types'
import { NumDisc, PointerHand, STICKER } from './_kart'
import { TenFrame, frameCell } from './_kmathart'
import { CrossOut, EmptySpot, House, SentenceLine, Stone } from './_g1art'

/*
 * 1st grade subtracting within 20 (1.OA.4, 1.OA.6, 1.OA.8), for Take-Away
 * Dunes: take away (cross them out), count back (a frog hops back along
 * numbered stones), think addition (fill a ten-frame counting up), and a
 * fact family's house. Each number sentence is written as it is said.
 * Numerals and math signs only, never words.
 */

const EQ_Y = 82

/** 0 → 1 → 0 over `dur` from `at` (a hop). */
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

const CELL = 92
const FRAME = { x: 480, y: 330 }
const cellAt = (i: number, o = FRAME, cell = CELL): [number, number] => {
  const [dx, dy] = frameCell(i % 10, cell)
  return [o.x + dx, o.y + dy]
}

/**
 * g1Subtract/takeAway — "Nine take away three. Cross out three. Six are
 * left!" 9 − 3 = ? is written; nine counters drop into a ten-frame; on
 * "Cross out three" the last three are crossed out, one by one; on "Six are
 * left" the six still there hop, and 6 fills the box.
 */
const takeAway: Scene = ({ t, cue }: SceneProps) => {
  const said = cue('Nine take away three')
  const cross = cue('Cross out three')
  const left = cue('Six are left')
  return (
    <>
      <Paper />
      <SentenceLine t={t} x={480} y={EQ_Y} tokens={[9, '−', 3, '=', '?']} at={said} solveAt={left + 0.3} answer={6} />
      <Glow t={t} at={left} x={FRAME.x - CELL} y={FRAME.y} r={190} breathe={false} />
      <Pop t={t} at={said + 0.2} x={FRAME.x} y={FRAME.y} bounce={11}>
        <T x={FRAME.x} y={FRAME.y}>
          <TenFrame cell={CELL} />
        </T>
      </Pop>
      {Array.from({ length: 9 }, (_, i) => {
        const s = spring(t, said + 0.4 + i * 0.08, { stiffness: 230, damping: 14 })
        if (s <= 0.001) return null
        const [x, y] = cellAt(i)
        // the last three are crossed out, one after another
        const gone = 8 - i
        if (gone < 3) {
          const at = cross + 0.3 + gone * 0.45
          const k = ease.outCubic(progress(t, at, 0.35))
          return (
            <g key={i}>
              {k < 1 && <Dot x={x} y={y - k * 30} r={34 * (1 - k * 0.4)} color={STICKER.coral} />}
              {k > 0 && (
                <T x={x} y={y} s={k}>
                  <CrossOut r={34} />
                </T>
              )}
            </g>
          )
        }
        const hop = bump(t, left + i * 0.07, 0.35) * 18
        return <Dot key={i} x={x} y={y - hop - (1 - Math.min(1, s)) * 70} r={34} color={STICKER.coral} />
      })}
      <Burst t={t} at={left + 0.4} x={700} y={EQ_Y} r={90} />
    </>
  )
}

const STONES = [8, 9, 10, 11, 12, 13]
const stoneX = (n: number) => 150 + (n - 8) * 116
const STONE_Y = 410

/**
 * g1Subtract/countBack — "Your turn! Twelve minus three. Hop back three."
 * 12 − 3 = ? is written; a path of stones 8 to 13, a frog on 12; on "Hop
 * back three" it hops back three stones, one at a time, each landing stone
 * lighting up. No answer: the check asks for it.
 */
const countBack: Scene = ({ t, cue }: SceneProps) => {
  const turn = cue('Your turn')
  const said = cue('Twelve minus three')
  const hop = cue('Hop back three')
  const HOPS = [0, 1, 2].map((k) => hop + 0.35 + k * 0.6)
  // where the frog is: on 12, then each hop arcs one stone back
  let fx = stoneX(12)
  let fy = STONE_Y - 62
  let squash = 0
  HOPS.forEach((at, k) => {
    const p = ease.inOutCubic(progress(t, at, 0.5))
    if (p <= 0) return
    const [x, y] = arc([stoneX(12 - k), STONE_Y - 62], [stoneX(11 - k), STONE_Y - 62], 90, p)
    fx = x
    fy = y
    squash = p >= 1 ? wobble(t, at + 0.5, { amp: 0.5, freq: 3, decay: 6 }) : 0
  })
  return (
    <>
      <Paper />
      <SentenceLine t={t} x={480} y={EQ_Y} tokens={[12, '−', 3, '=', '?']} at={said} />
      {STONES.map((n, i) => {
        const landed = HOPS.findIndex((at, k) => 11 - k === n && t >= at + 0.5)
        return (
          <Pop key={n} t={t} at={said + 0.3 + i * 0.07} x={stoneX(n)} y={STONE_Y} bounce={12}>
            {landed >= 0 && <circle cx={stoneX(n)} cy={STONE_Y} r={58} fill={M.gold} opacity={0.4} />}
            <T x={stoneX(n)} y={STONE_Y}>
              <Stone n={n} r={48} fill={n === 12 ? '#fde7c8' : '#e9e4dc'} />
            </T>
          </Pop>
        )
      })}
      <Pop t={t} at={said + 0.8} x={stoneX(12)} y={STONE_Y - 62} bounce={11}>
        <Frog x={fx} y={fy} r={40} squash={squash} />
      </Pop>
      <Wave t={t} at={turn} />
    </>
  )
}

const SMALL = 62
const F1 = { x: 290, y: 380 }
const F2 = { x: 670, y: 380 }
const smallCell = (i: number): [number, number] => cellAt(i, i < 10 ? F1 : F2, SMALL)

/**
 * g1Subtract/think — "Thirteen minus five. Think addition! Five plus eight
 * makes thirteen. So the answer is eight." 13 − 5 = ? is written; on "Think
 * addition" 5 + ? = 13 is written under it; two ten-frames hold five red
 * counters and dashed spots up to thirteen; on "Five plus eight" the eight
 * spots fill, blue, one by one; then 8 fills both boxes.
 */
const think: Scene = ({ t, cue }: SceneProps) => {
  const said = cue('Thirteen minus five')
  const add = cue('Think addition')
  const fill = cue('Five plus eight')
  const answer = cue('answer is eight')
  return (
    <>
      <Paper />
      <SentenceLine t={t} x={480} y={70} size={64} tokens={[13, '−', 5, '=', '?']} at={said} solveAt={answer + 0.3} answer={8} />
      <SentenceLine t={t} x={480} y={170} size={56} tokens={[5, '+', '?', '=', 13]} at={add + 0.2} solveAt={fill + 1.6} answer={8} />
      <Pop t={t} at={said + 0.3} x={F1.x} y={F1.y} bounce={11}>
        <T x={F1.x} y={F1.y}>
          <TenFrame cell={SMALL} />
        </T>
      </Pop>
      <Pop t={t} at={said + 0.45} x={F2.x} y={F2.y} bounce={11}>
        <T x={F2.x} y={F2.y}>
          <TenFrame cell={SMALL} />
        </T>
      </Pop>
      {Array.from({ length: 13 }, (_, i) => {
        const [x, y] = smallCell(i)
        if (i < 5) {
          const s = spring(t, said + 0.6 + i * 0.08, { stiffness: 230, damping: 14 })
          return s <= 0.001 ? null : <Dot key={i} x={x} y={y - (1 - Math.min(1, s)) * 60} r={23} color={STICKER.coral} />
        }
        // the spots up to thirteen: dashed, then filled one by one, counting up
        const shown = spring(t, add + 0.5 + (i - 5) * 0.05, { stiffness: 230, damping: 15 })
        if (shown <= 0.001) return null
        const k = spring(t, fill + 0.2 + (i - 5) * 0.16, { stiffness: 240, damping: 14 })
        return (
          <g key={i}>
            <T x={x} y={y} s={Math.min(1, shown)}>
              <EmptySpot r={24} />
            </T>
            {k > 0.001 && <Dot x={x} y={y} r={23 * Math.min(1.1, k)} color={STICKER.blue} />}
          </g>
        )
      })}
      <Burst t={t} at={answer + 0.4} x={650} y={70} r={80} />
    </>
  )
}

/**
 * g1Subtract/family — "Your turn! Three, five and eight are a family." A
 * house: 3, 5 and 8 pop onto its roof as they are said; then its four number
 * sentences are written inside, one by one; the last one's answer is left
 * for the check. A hand waves "your turn".
 */
const family: Scene = ({ t, cue }: SceneProps) => {
  const turn = cue('Your turn')
  const three = cue('Three,')
  const five = cue('five')
  const eight = cue('eight')
  const fam = cue('family')
  const lines: (number | string)[][] = [
    [3, '+', 5, '=', 8],
    [5, '+', 3, '=', 8],
    [8, '−', 3, '=', 5],
    [8, '−', 5, '=', '?'],
  ]
  return (
    <>
      <Paper />
      <Pop t={t} at={turn + 0.2} x={480} y={290} bounce={13}>
        <T x={480} y={290}>
          <House w={560} h={460} />
        </T>
      </Pop>
      <Glow t={t} at={fam} x={480} y={140} r={150} breathe={false} />
      <Pop t={t} at={eight} x={480} y={120} bounce={10}>
        <T x={480} y={120}>
          <NumDisc n={8} r={40} />
        </T>
      </Pop>
      <Pop t={t} at={three} x={370} y={208} bounce={10}>
        <T x={370} y={208}>
          <NumDisc n={3} r={34} fill={STICKER.coral} />
        </T>
      </Pop>
      <Pop t={t} at={five} x={590} y={208} bounce={10}>
        <T x={590} y={208}>
          <NumDisc n={5} r={34} fill={STICKER.blue} />
        </T>
      </Pop>
      {lines.map((tokens, k) => (
        <SentenceLine key={k} t={t} x={k % 2 === 0 ? 345 : 615} y={k < 2 ? 330 : 430} size={50} tokens={tokens} at={fam + 0.1 + k * 0.3} />
      ))}
      <Wave t={t} at={turn} />
    </>
  )
}

export const g1SubtractScenes: Record<string, Scene> = { takeAway, countBack, think, family }
