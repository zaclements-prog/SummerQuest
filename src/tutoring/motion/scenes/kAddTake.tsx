/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { arc, ease, lerp, progress, spring, wobble } from '../anim'
import { Burst, Glow, Paper, Pop, T } from '../kit'
import { M } from '../palette'
import { Dot, Frog } from '../shapes'
import type { Scene, SceneProps } from '../types'
import { NumDisc, PointerHand, STICKER } from './_kart'
import { Duck, Log, TenFrame, frameCell } from './_kmathart'

/*
 * Kindergarten adding and taking away (K.OA.1, K.OA.5) and making ten
 * (K.OA.4), for Add-and-Take Falls. Things come in (from the right) and go
 * away (off to the right) as the voice says so; the ten-frame fills cell by
 * cell. Numerals only, never words.
 */

/** 0 → 1 → 0 over `dur` from `at` (a hop, a bob). */
const bump = (t: number, at: number, dur = 0.32) => {
  const k = progress(t, at, dur)
  return k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI)
}

/** Grass along the bottom, and a strip of the falls' pool. */
function Bank() {
  return (
    <>
      <path d="M 0 470 Q 240 448 480 466 T 960 458 L 960 540 L 0 540 Z" fill="#a9e08f" />
      <path d="M 0 470 Q 240 448 480 466 T 960 458" fill="none" stroke={M.ink} strokeWidth={4} strokeLinecap="round" />
    </>
  )
}

const LOG_Y = 372
const FX = [270, 380, 490, 600, 710]

/**
 * kAddTake/join — "Three frogs sit on a log. Two more hop on! Now there are
 * five frogs." Three frogs drop onto the log; two more hop in from the right,
 * one after the other; each frog gets its number, and a big 5.
 */
const join: Scene = ({ t, cue }: SceneProps) => {
  const three = cue('Three frogs')
  const more = cue('Two more')
  const now = cue('Now there are')
  const five = cue('five frogs')
  return (
    <>
      <Paper />
      <Bank />
      <T x={490} y={LOG_Y}>
        <Log w={640} />
      </T>
      {FX.map((x, k) => {
        if (k < 3) {
          const s = spring(t, three + k * 0.18, { stiffness: 200, damping: 13 })
          if (s <= 0.001) return null
          return (
            <T key={k} x={x} y={LOG_Y - (1 - Math.min(1, s)) * 240}>
              <Frog x={0} y={0} r={36} squash={wobble(t, three + k * 0.18 + 0.3, { amp: 0.6, freq: 3, decay: 6 })} />
            </T>
          )
        }
        // the two newcomers hop in from the right
        const at = more + 0.25 + (k - 3) * 0.5
        if (t < at) return null
        const p = ease.inOutCubic(progress(t, at, 0.75))
        const [hx, hy] = arc([1030, LOG_Y + 40], [x, LOG_Y], 150, p)
        return (
          <T key={k} x={hx} y={hy}>
            <Frog x={0} y={0} r={36} squash={p >= 1 ? wobble(t, at + 0.75, { amp: 0.6, freq: 3, decay: 6 }) : 0} />
          </T>
        )
      })}
      {FX.map((x, k) => (
        <Pop key={`n${k}`} t={t} at={now + k * 0.16} x={x} y={LOG_Y + 92} bounce={10}>
          <T x={x} y={LOG_Y + 92}>
            <NumDisc n={k + 1} r={24} />
          </T>
        </Pop>
      ))}
      <Glow t={t} at={five} x={490} y={110} r={88} breathe={false} />
      <Pop t={t} at={five} x={490} y={110} bounce={10}>
        <T x={490} y={110}>
          <NumDisc n={5} r={58} />
        </T>
      </Pop>
      <Burst t={t} at={five + 0.2} x={490} y={110} r={110} />
    </>
  )
}

const DX = [220, 340, 460, 580, 700]
const DUCK_Y = 330

/** A pond: still water with a rim (no full-stage panel), nothing in it but the ducks. */
function Pond() {
  return <ellipse cx={470} cy={346} rx={420} ry={128} fill="#bfe8f7" stroke={M.ink} strokeWidth={4} />
}

/**
 * kAddTake/away — "Five ducks swim in the pond. Then two swim away. Bye,
 * ducks!" Five ducks bob on the pond; on "two swim away" the last two paddle
 * off to the right, one after the other; the three left give a little hop.
 */
const away: Scene = ({ t, cue }: SceneProps) => {
  const five = cue('Five ducks')
  const go = cue('two swim away')
  const bye = cue('Bye')
  return (
    <>
      <Paper />
      <Bank />
      <Pond />
      {DX.map((x0, k) => {
        const s = spring(t, five + k * 0.14, { stiffness: 220, damping: 14 })
        if (s <= 0.001) return null
        const leaving = k >= 3
        const at = go + 0.2 + (k - 3) * 0.35
        const p = leaving ? ease.inQuad(progress(t, at, 1.5)) : 0
        if (p >= 1) return null
        const x = lerp(x0, 1140, p)
        // (a gentle bob that settles once the line is done: motion ends)
        const calm = 1 - progress(t, bye + 0.8, 1.2)
        const bob = Math.sin(t * 2.4 + k) * 4 * calm - (leaving ? 0 : bump(t, bye + k * 0.12, 0.4) * 22)
        return (
          <T key={k} x={x} y={DUCK_Y + bob} s={Math.min(1, s)} r={leaving && p > 0 ? Math.sin(t * 9) * 4 : 0}>
            <g transform={leaving && p > 0 ? 'scale(-1 1)' : undefined}>
              <Duck r={42} flap={leaving ? bump(t, at, 0.5) : 0} />
            </g>
          </T>
        )
      })}
    </>
  )
}

const CELL = 112
const FRAME_X = 480
const FRAME_Y = 300
const cellAt = (i: number): [number, number] => {
  const [dx, dy] = frameCell(i, CELL)
  return [FRAME_X + dx, FRAME_Y + dy]
}

/**
 * kAddTake/ten — "This is a ten frame. It has ten spots. Seven are full.
 * Three more make ten!" The frame pops in; its ten cells twinkle in turn;
 * seven coral counters drop in; three mint ones pop into the empty cells,
 * each with its number; a big 10.
 */
const ten: Scene = ({ t, cue }: SceneProps) => {
  const frame = cue('ten frame')
  const spots = cue('ten spots')
  const seven = cue('Seven are full')
  const more = cue('Three more')
  const make = cue('make ten')
  return (
    <>
      <Paper />
      <Pop t={t} at={frame} x={FRAME_X} y={FRAME_Y} bounce={11}>
        <T x={FRAME_X} y={FRAME_Y}>
          <TenFrame cell={CELL} />
        </T>
      </Pop>
      {/* each spot lights up in turn */}
      {Array.from({ length: 10 }, (_, i) => {
        const k = bump(t, spots + i * 0.1, 0.45)
        if (k <= 0) return null
        const [x, y] = cellAt(i)
        return <rect key={`s${i}`} x={x - CELL / 2 + 6} y={y - CELL / 2 + 6} width={CELL - 12} height={CELL - 12} rx={12} fill={M.gold} opacity={0.5 * k} />
      })}
      {Array.from({ length: 7 }, (_, i) => {
        const at = seven + i * 0.12
        const s = spring(t, at, { stiffness: 230, damping: 14 })
        if (s <= 0.001) return null
        const [x, y] = cellAt(i)
        return <Dot key={`c${i}`} x={x} y={y - (1 - Math.min(1, s)) * 120} r={36} color={STICKER.coral} />
      })}
      {[7, 8, 9].map((i, j) => {
        const at = more + 0.15 + j * 0.3
        const [x, y] = cellAt(i)
        return (
          <g key={`m${i}`}>
            <Glow t={t} at={more} x={x} y={y} r={56} breathe={false} />
            <Pop t={t} at={at} x={x} y={y} bounce={9}>
              <Dot x={x} y={y} r={36} color={STICKER.mint} />
            </Pop>
            <Pop t={t} at={at + 0.1} x={x + 34} y={y - 34} bounce={10}>
              <T x={x + 34} y={y - 34}>
                <NumDisc n={j + 1} r={20} />
              </T>
            </Pop>
          </g>
        )
      })}
      <Pop t={t} at={make} x={FRAME_X} y={84} bounce={10}>
        <T x={FRAME_X} y={84}>
          <NumDisc n={10} r={52} />
        </T>
      </Pop>
      <Burst t={t} at={make + 0.2} x={FRAME_X} y={84} r={100} />
    </>
  )
}

/**
 * kAddTake/yourTurn — "Your turn! Six spots are full. Look at the empty
 * spots." A hand waves hello; six counters drop into the frame; the four
 * empty cells glow and pulse (the check asks how many more make ten). No
 * numbers.
 */
const yourTurn: Scene = ({ t, cue }: SceneProps) => {
  const turn = cue('Your turn')
  const six = cue('Six spots')
  const look = cue('empty spots')
  return (
    <>
      <Paper />
      <T x={FRAME_X} y={FRAME_Y}>
        <TenFrame cell={CELL} />
      </T>
      {Array.from({ length: 6 }, (_, i) => {
        const s = spring(t, six + i * 0.12, { stiffness: 230, damping: 14 })
        if (s <= 0.001) return null
        const [x, y] = cellAt(i)
        return <Dot key={i} x={x} y={y - (1 - Math.min(1, s)) * 120} r={36} color={STICKER.coral} />
      })}
      {[6, 7, 8, 9].map((i, j) => {
        const k = ease.outCubic(progress(t, look + j * 0.12, 0.4))
        if (k <= 0) return null
        const [x, y] = cellAt(i)
        const pulse = 1 + 0.06 * Math.sin((t - look) * 4 + j) * (1 - progress(t, look + 1.6, 0.8))
        return (
          <T key={`e${i}`} x={x} y={y} s={k * pulse}>
            <rect x={-CELL / 2 + 10} y={-CELL / 2 + 10} width={CELL - 20} height={CELL - 20} rx={16} fill={M.gold} opacity={0.32} stroke={M.ink} strokeWidth={3} strokeDasharray="10 8" />
          </T>
        )
      })}
      {/* "your turn": a hand waves from the corner */}
      <Pop t={t} at={turn} x={892} y={520} bounce={11}>
        <T x={892} y={520} r={-22 + wobble(t, turn + 0.3, { amp: 14, freq: 1.6, decay: 2.6 })}>
          <PointerHand />
        </T>
      </Pop>
    </>
  )
}

export const kAddTakeScenes: Record<string, Scene> = { join, away, ten, yourTurn }
