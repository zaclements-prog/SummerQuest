/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { ease, lerp, progress, spring } from '../anim'
import { Burst, Glow, Paper, Pop, T } from '../kit'
import { M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { NumDisc, PointerHand, STICKER } from './_kart'

/*
 * Kindergarten teen numbers colour code (whole lesson; the same as Ten Frame
 * Plateau's ten-frames): dots are coral; a FULL TEN glows gold and gets a
 * gold 10; each one counted on gets a white number disc; the teen number it
 * makes pops in as a big blue numeral. Numerals only, no words.
 */

const CELL = 70
const FW = CELL * 5
const FH = CELL * 2

/** 0 → 1 → 0 over `dur` from `at` (a hop). */
const bump = (t: number, at: number, dur = 0.36) => {
  const k = progress(t, at, dur)
  return k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI)
}

/** The centre of cell k (0–9) of a frame whose top-left corner is (x0, y0). */
const cellAt = (x0: number, y0: number, k: number): [number, number] => [x0 + (k % 5) * CELL + CELL / 2, y0 + Math.floor(k / 5) * CELL + CELL / 2]

/** A ten-frame, top-left at (x0, y0), with a gold glow from `glowAt`. */
function Frame({ t, x0, y0, glowAt = Infinity }: { t: number; x0: number; y0: number; glowAt?: number }) {
  const g = ease.outCubic(progress(t, glowAt, 0.4))
  return (
    <g>
      {g > 0.001 && <rect x={x0 - 10} y={y0 - 10} width={FW + 20} height={FH + 20} rx={18} fill={M.gold} opacity={0.55 * g} />}
      <rect x={x0} y={y0} width={FW} height={FH} rx={10} fill="#fffaf0" stroke={M.ink} strokeWidth={4.5} />
      <path d={`M ${x0} ${y0 + CELL} H ${x0 + FW} ${[1, 2, 3, 4].map((k) => `M ${x0 + k * CELL} ${y0} V ${y0 + FH}`).join(' ')}`} stroke={M.ink} strokeWidth={3.5} />
    </g>
  )
}

/** A counter that pops (or drops) in at `at`. */
function Counter({ t, at, x, y, from }: { t: number; at: number; x: number; y: number; from?: [number, number] }) {
  if (from) {
    const k = ease.inOutCubic(progress(t, at, 0.45))
    if (t < at - 0.6) return null
    return <circle cx={lerp(from[0], x, k)} cy={lerp(from[1], y, k) - Math.sin(k * Math.PI) * 40} r={CELL * 0.33} fill={M.coral} stroke={M.ink} strokeWidth={3.5} />
  }
  const s = spring(t, at, { stiffness: 260, damping: 14 })
  if (s <= 0.001) return null
  return <circle cx={x} cy={y} r={CELL * 0.33 * s} fill={M.coral} stroke={M.ink} strokeWidth={3.5} />
}

/** A big numeral sticker centred on (0, 0). */
function BigNumeral({ n, size = 150, color = STICKER.blue }: { n: number; size?: number; color?: string }) {
  return (
    <text x={0} y={size * 0.04} fontFamily={M.font} fontWeight={700} fontSize={size} textAnchor="middle" dominantBaseline="middle" fill={color} stroke={M.ink} strokeWidth={size / 16} strokeLinejoin="round" paintOrder="stroke fill">
      {n}
    </text>
  )
}

/**
 * kTeens/ten — "This is a ten-frame. It has ten boxes. When every box is full,
 * that's a full ten!" A big empty ten-frame; its boxes light one by one on
 * "ten boxes"; on "every box" a dot drops into each; on "full ten" the frame
 * glows gold and a gold 10 pops above it.
 */
const ten: Scene = ({ t, cue }: SceneProps) => {
  const frameAt = cue('ten-frame')
  const boxes = cue('ten boxes')
  const every = cue('every box')
  const full = cue('full ten')
  const x0 = 480 - FW / 2
  const y0 = 220
  return (
    <>
      <Paper />
      <Pop t={t} at={frameAt - 0.3} x={480} y={y0 + FH / 2} bounce={13}>
        <Frame t={t} x0={x0} y0={y0} glowAt={full} />
      </Pop>
      {/* the boxes, lit one after another */}
      {Array.from({ length: 10 }, (_, k) => {
        const at = boxes + k * 0.11
        const o = progress(t, at, 0.12) * (1 - progress(t, at + 0.35, 0.3))
        if (o <= 0.001) return null
        const [cx, cy] = cellAt(x0, y0, k)
        return <rect key={`b${k}`} x={cx - CELL / 2 + 5} y={cy - CELL / 2 + 5} width={CELL - 10} height={CELL - 10} rx={8} fill={M.gold} opacity={0.6 * o} />
      })}
      {Array.from({ length: 10 }, (_, k) => {
        const [cx, cy] = cellAt(x0, y0, k)
        return <Counter key={k} t={t} at={every + k * 0.13} x={cx} y={cy} />
      })}
      <Pop t={t} at={full + 0.15} x={480} y={128} bounce={9}>
        <T x={480} y={128 - bump(t, full + 0.6, 0.4) * 14}>
          <NumDisc n={10} r={50} />
        </T>
      </Pop>
      <Burst t={t} at={full + 0.3} x={480} y={128} r={110} />
    </>
  )
}

const TX = 330 - FW / 2
const TY = 110
const BY = TY + FH + 34

/**
 * kTeens/more — "A full ten, and three more. Ten, eleven, twelve, thirteen.
 * Ten and three more is thirteen!" A full ten-frame on top, an empty one
 * under it; three dots wait at the side; "Ten," lights the full ten (a gold
 * 10); "eleven, twelve, thirteen" drop the dots into the bottom frame one by
 * one, each with its number; a big 13 pops in on "is thirteen".
 */
const more: Scene = ({ t, cue }: SceneProps) => {
  const fullAt = cue('full ten')
  const three = cue('three more')
  const tenAt = cue('Ten, eleven')
  const each = [cue('eleven'), cue('twelve'), cue('thirteen.')]
  const is = cue('is thirteen')
  const waiting: [number, number][] = [
    [640, 330],
    [700, 300],
    [760, 330],
  ]
  return (
    <>
      <Paper />
      <Frame t={t} x0={TX} y0={TY} glowAt={tenAt} />
      {Array.from({ length: 10 }, (_, k) => {
        const [cx, cy] = cellAt(TX, TY, k)
        return <Counter key={k} t={t} at={fullAt - 0.4 + k * 0.05} x={cx} y={cy} />
      })}
      <Pop t={t} at={three - 0.3} x={330} y={BY + FH / 2} bounce={14}>
        <Frame t={t} x0={TX} y0={BY} />
      </Pop>
      <Pop t={t} at={tenAt + 0.1} x={TX + FW + 52} y={TY + FH / 2} bounce={9}>
        <T x={TX + FW + 52} y={TY + FH / 2}>
          <NumDisc n={10} r={36} />
        </T>
      </Pop>
      {/* three more: waiting at the side, then into the bottom frame as each is counted */}
      {each.map((at, k) => {
        const [cx, cy] = cellAt(TX, BY, k)
        const shown = spring(t, three + k * 0.15, { stiffness: 240, damping: 13 })
        if (shown <= 0.001) return null
        return (
          <g key={k}>
            {t < at - 0.6 ? <circle cx={waiting[k][0]} cy={waiting[k][1]} r={CELL * 0.33 * shown} fill={M.coral} stroke={M.ink} strokeWidth={3.5} /> : <Counter t={t} at={at - 0.2} x={cx} y={cy} from={waiting[k]} />}
            <Pop t={t} at={at + 0.2} x={cx} y={cy + CELL / 2 + 26} bounce={10}>
              <T x={cx} y={cy + CELL / 2 + 26}>
                <NumDisc n={11 + k} r={21} fill={M.white} />
              </T>
            </Pop>
          </g>
        )
      })}
      <Glow t={t} at={is} x={790} y={210} r={130} breathe={false} />
      <Pop t={t} at={is + 0.1} x={790} y={210} bounce={10}>
        <T x={790} y={210 - bump(t, is + 0.7, 0.4) * 16}>
          <BigNumeral n={13} size={140} />
        </T>
      </Pop>
      <Burst t={t} at={is + 0.4} x={790} y={210} r={120} />
    </>
  )
}

/**
 * kTeens/fifteen — "Your turn! Look at the full ten. Then count on." A full
 * ten over five more; the full ten glows on "full ten"; a hand points at the
 * ones on "count on". No numbers: the check asks how many.
 */
const fifteen: Scene = ({ t, cue }: SceneProps) => {
  const turn = cue('Your turn')
  const full = cue('full ten')
  const on = cue('count on')
  const x0 = 480 - FW / 2
  const handIn = ease.outCubic(progress(t, on, 0.6))
  return (
    <>
      <Paper />
      <Frame t={t} x0={x0} y0={TY} glowAt={full} />
      <Frame t={t} x0={x0} y0={BY} />
      {Array.from({ length: 15 }, (_, k) => {
        const [cx, cy] = cellAt(x0, k < 10 ? TY : BY, k % 10)
        return <Counter key={k} t={t} at={turn + 0.2 + k * 0.07} x={cx} y={cy} />
      })}
      {t >= on && (
        <T x={lerp(980, x0 + FW + 70, handIn)} y={BY + FH / 2 + 40 - bump(t, on + 0.7, 0.4) * 18} r={-60}>
          <PointerHand press={bump(t, on + 0.7, 0.4)} />
        </T>
      )}
    </>
  )
}

const TEENS = [11, 12, 13, 14, 15, 16, 17, 18, 19]

/**
 * kTeens/twelve — "Every teen number is ten and some more. Let's find
 * twelve!" The teen numbers hop in along a row; on "ten and some" each gets a
 * little gold 10 under it; on "find twelve" the 12 grows big in the middle
 * and the others fade back. (The check: which ten-frames show twelve?)
 */
const twelve: Scene = ({ t, cue }: SceneProps) => {
  const teen = cue('teen number')
  const tenAnd = cue('ten and some')
  const find = cue('find twelve')
  const grow = ease.inOutCubic(progress(t, find, 0.8))
  return (
    <>
      <Paper />
      <Glow t={t} at={find + 0.4} x={480} y={290} r={150} breathe={false} />
      {TEENS.map((n, k) => {
        const x = 120 + k * 90
        const s = spring(t, teen + k * 0.1, { stiffness: 230, damping: 12 })
        if (s <= 0.001) return null
        const me = n === 12
        const fade = me ? 1 : 1 - 0.7 * grow
        const tx = me ? lerp(x, 480, grow) : x
        const ty = me ? lerp(180, 290, grow) : 180
        const size = me ? lerp(64, 200, grow) : 64
        return (
          <g key={n}>
            <T x={tx} y={ty} s={s} o={fade}>
              <BigNumeral n={n} size={size} color={me ? STICKER.blue : STICKER.gold} />
            </T>
            {!me && (
              <Pop t={t} at={tenAnd + k * 0.06} x={x} y={250} bounce={10}>
                <T x={x} y={250} o={fade}>
                  <NumDisc n={10} r={17} />
                </T>
              </Pop>
            )}
          </g>
        )
      })}
    </>
  )
}

export const kTeensScenes: Record<string, Scene> = { ten, more, fifteen, twelve }
