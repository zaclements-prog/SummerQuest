/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { ease, lerp, progress, spring, wobble } from '../anim'
import { Burst, Draw, Glow, Paper, Pop, T } from '../kit'
import { M } from '../palette'
import { Cookie, Friend } from '../shapes'
import type { Scene, SceneProps } from '../types'
import { Ball, Bear, NumDisc, STICKER } from './_kart'

/*
 * Kindergarten "more, fewer, same" colour code (whole lesson):
 *   a coral string joins each pair, one to one;
 *   what's LEFT OVER gets a gold glow and a hop;
 *   the row with MORE glows gold, the row with FEWER glows blue;
 *   the same: a balance that sits level (the ⚖️ card), and both rows glow mint.
 * Numerals only, no words.
 */

const COLS = [210, 370, 530, 690]
const TOP_Y = 150
const BOT_Y = 410
const FR = 40
const CR = 36
const SHIRTS = [STICKER.blue, STICKER.coral, STICKER.mint, STICKER.lilac]

/** 0 → 1 → 0 over `dur` from `at` (a hop). */
const bump = (t: number, at: number, dur = 0.36) => {
  const k = progress(t, at, dur)
  return k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI)
}

/** Where friend k stands before the line-up (scattered), and lined up. */
const FRIEND_FROM: [number, number][] = [
  [170, 130],
  [430, 175],
  [560, 120],
  [790, 165],
]
const COOKIE_FROM: [number, number][] = [
  [300, 430],
  [520, 380],
  [780, 420],
]

/** The coral string from friend k down to cookie k (drawn on at `at`). */
function PairString({ t, at, k, done = false }: { t: number; at: number; k: number; done?: boolean }) {
  const x = COLS[k]
  const d = `M ${x} ${TOP_Y + FR * 2.15} L ${x} ${BOT_Y - CR - 8}`
  return done ? <path d={d} fill="none" stroke={M.coral} strokeWidth={7} strokeLinecap="round" /> : <Draw t={t} at={at} dur={0.35} d={d} stroke={M.coral} width={7} />
}

/** A row's glow band (gold for more, blue for fewer, mint for the same). */
function Band({ t, at, y, h, color, out }: { t: number; at: number; y: number; h: number; color: string; out?: number }) {
  let k = ease.outCubic(progress(t, at, 0.4))
  if (out !== undefined) k *= 1 - progress(t, out, 0.35)
  if (k <= 0.001) return null
  return <rect x={120} y={y - h / 2} width={660 * k} height={h} rx={h / 2} fill={color} opacity={0.4 * k} />
}

/** A balance that sits level: the same on both sides (the ⚖️ card). */
function Balance() {
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M -34 92 L 34 92 L 12 78 L -12 78 Z" fill={M.wood} stroke={M.ink} strokeWidth={4} />
      <line x1={0} y1={78} x2={0} y2={-46} stroke={M.ink} strokeWidth={8} />
      <line x1={-74} y1={-46} x2={74} y2={-46} stroke={M.ink} strokeWidth={7} />
      <circle cx={0} cy={-52} r={9} fill={M.gold} stroke={M.ink} strokeWidth={3.5} />
      {[-74, 74].map((x) => (
        <g key={x}>
          <line x1={x} y1={-46} x2={x - 26} y2={6} stroke={M.ink} strokeWidth={3} />
          <line x1={x} y1={-46} x2={x + 26} y2={6} stroke={M.ink} strokeWidth={3} />
          <path d={`M ${x - 34} 6 Q ${x} 34 ${x + 34} 6 Z`} fill={M.gold} stroke={M.ink} strokeWidth={4} />
        </g>
      ))}
    </g>
  )
}

/**
 * kCompare/lineUp — "Is there a cookie for every friend? Let's line them up.
 * One, two, three." Four friends and three cookies, scattered; on "line them
 * up" they step into two rows, one over the other; a coral string joins each
 * friend to a cookie as it is counted. The fourth friend is left over.
 */
const lineUp: Scene = ({ t, cue }: SceneProps) => {
  const come = cue('cookie')
  const line = cue('line them up')
  const n = [cue('One,'), cue('two,'), cue('three.')]
  const move = ease.inOutCubic(progress(t, line, 0.9))
  return (
    <>
      <Paper />
      {FRIEND_FROM.map(([x0, y0], k) => {
        const s = spring(t, 0.1 + k * 0.12, { stiffness: 220, damping: 14 })
        if (s <= 0.001) return null
        const x = lerp(x0, COLS[k], move)
        const y = lerp(y0, TOP_Y, move) - bump(t, n[k] ?? -9) * 18
        return (
          <T key={k} x={x} y={y} s={s}>
            <Friend x={0} y={0} r={FR} color={SHIRTS[k]} skin={k} smile={0.8} />
          </T>
        )
      })}
      {COOKIE_FROM.map(([x0, y0], k) => {
        const s = spring(t, come + k * 0.15, { stiffness: 220, damping: 13 })
        if (s <= 0.001) return null
        const x = lerp(x0, COLS[k], move)
        const y = lerp(y0, BOT_Y, move)
        return (
          <T key={k} x={x} y={y} s={s}>
            <Cookie x={0} y={0} r={CR} rot={k * 40} />
          </T>
        )
      })}
      {n.map((at, k) => (
        <g key={k}>
          <PairString t={t} at={at} k={k} />
          <Pop t={t} at={at + 0.1} x={COLS[k] + 34} y={(TOP_Y + BOT_Y) / 2 + 30} bounce={10}>
            <T x={COLS[k] + 34} y={(TOP_Y + BOT_Y) / 2 + 30}>
              <NumDisc n={k + 1} r={22} fill={M.white} />
            </T>
          </Pop>
        </g>
      ))}
    </>
  )
}

/**
 * kCompare/more — "One friend has no cookie. More friends, fewer cookies. Now
 * one more cookie. They are the same!" The lined-up rows; the fourth friend
 * hops in a gold glow over an empty dashed spot; the friends' row glows gold
 * (more), the cookies' blue (fewer); a fourth cookie rolls in and is joined;
 * both rows glow mint and a level balance pops in: the same.
 */
const more: Scene = ({ t, cue }: SceneProps) => {
  const none = cue('no cookie')
  const moreAt = cue('More friends')
  const fewer = cue('fewer cookies')
  const oneMore = cue('one more cookie')
  const same = cue('the same')
  const roll = ease.outCubic(progress(t, oneMore + 0.2, 1))
  const cx = lerp(1010, COLS[3], roll)
  return (
    <>
      <Paper />
      <Band t={t} at={moreAt} y={TOP_Y + 30} h={170} color={M.gold} out={oneMore} />
      <Band t={t} at={fewer} y={BOT_Y} h={96} color={M.sea} out={oneMore} />
      <Band t={t} at={same} y={TOP_Y + 30} h={170} color={M.mint} />
      <Band t={t} at={same} y={BOT_Y} h={96} color={M.mint} />
      {/* the left-over friend, and the empty spot under it */}
      <Glow t={t} at={none} out={oneMore + 1} x={COLS[3]} y={TOP_Y + 20} r={70} breathe={false} />
      {t < oneMore + 1.2 && t >= none && (
        <circle cx={COLS[3]} cy={BOT_Y} r={CR} fill="none" stroke={M.ink} strokeOpacity={0.4} strokeWidth={4} strokeDasharray="10 8" />
      )}
      {COLS.map((x, k) => {
        const hop = k === 3 ? bump(t, none + 0.1, 0.4) * 26 + bump(t, none + 0.55, 0.4) * 18 : bump(t, same + 0.2 + k * 0.08, 0.36) * 16
        return (
          <T key={k} x={x} y={TOP_Y - hop}>
            <Friend x={0} y={0} r={FR} color={SHIRTS[k]} skin={k} smile={k === 3 && t < oneMore + 1 ? 0.2 : 0.8} />
          </T>
        )
      })}
      {[0, 1, 2].map((k) => (
        <g key={k}>
          <PairString t={t} at={0} k={k} done />
          <Cookie x={COLS[k]} y={BOT_Y} r={CR} rot={k * 40} />
        </g>
      ))}
      {/* one more cookie rolls in, and is joined */}
      {t >= oneMore && <Cookie x={cx} y={BOT_Y} r={CR} rot={(1 - roll) * 360} />}
      <PairString t={t} at={oneMore + 1.25} k={3} />
      <Pop t={t} at={same} x={868} y={290} bounce={10}>
        <T x={868} y={290 - bump(t, same + 0.5, 0.4) * 10} r={wobble(t, same + 0.3, { amp: 4, freq: 2, decay: 4 })}>
          <Balance />
        </T>
      </Pop>
      <Burst t={t} at={same + 0.3} x={868} y={260} r={110} />
    </>
  )
}

/**
 * kCompare/bears — "Your turn! Here come bears and balls. Does every bear get
 * a ball?" Three bears pop into the top row, four balls into the bottom row,
 * lined up in columns; the fourth ball sits alone at the end. Nothing is
 * joined: the child works it out (the check: more bears, more balls, or the same?).
 */
const bears: Scene = ({ t, cue }: SceneProps) => {
  const b = cue('bears')
  const l = cue('balls')
  const every = cue('every bear')
  return (
    <>
      <Paper />
      <rect x={120} y={TOP_Y - 78} width={660} height={156} rx={60} fill={M.white} opacity={0.6} stroke={M.ink} strokeOpacity={0.15} strokeWidth={4} strokeDasharray="14 10" />
      <rect x={120} y={BOT_Y - 64} width={660} height={128} rx={60} fill={M.white} opacity={0.6} stroke={M.ink} strokeOpacity={0.15} strokeWidth={4} strokeDasharray="14 10" />
      {[0, 1, 2].map((k) => (
        <Pop key={k} t={t} at={b + k * 0.18} x={COLS[k]} y={TOP_Y} bounce={11}>
          <T x={COLS[k]} y={TOP_Y - bump(t, every + k * 0.12, 0.36) * 16}>
            <Bear r={50} />
          </T>
        </Pop>
      ))}
      {COLS.map((x, k) => (
        <Pop key={k} t={t} at={l + k * 0.18} x={x} y={BOT_Y} bounce={11}>
          <T x={x} y={BOT_Y}>
            <Ball r={42} />
          </T>
        </Pop>
      ))}
    </>
  )
}

const FRAME_CELL = 46

/** A ten-frame (5 × 2) with `n` dots, centred on (0, 0); dot k pops in at `at[k]`. */
function SceneFrame({ t, n, at }: { t: number; n: number; at: number[] }) {
  const w = FRAME_CELL * 5
  const h = FRAME_CELL * 2
  return (
    <g>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={8} fill="#fffaf0" stroke={M.ink} strokeWidth={4} />
      <path d={`M ${-w / 2} 0 H ${w / 2} ${[1, 2, 3, 4].map((k) => `M ${-w / 2 + k * FRAME_CELL} ${-h / 2} V ${h / 2}`).join(' ')}`} stroke={M.ink} strokeWidth={3} />
      {Array.from({ length: n }, (_, k) => {
        const s = spring(t, at[k] ?? 0, { stiffness: 260, damping: 14 })
        if (s <= 0.001) return null
        return <circle key={k} cx={-w / 2 + (k % 5) * FRAME_CELL + FRAME_CELL / 2} cy={-h / 2 + Math.floor(k / 5) * FRAME_CELL + FRAME_CELL / 2} r={FRAME_CELL * 0.33 * s} fill={M.coral} stroke={M.ink} strokeWidth={3} />
      })}
    </g>
  )
}

/** A big numeral sticker. */
function BigNumeral({ n, color }: { n: number; color: string }) {
  return (
    <text x={0} y={6} fontFamily={M.font} fontWeight={700} fontSize={150} textAnchor="middle" dominantBaseline="middle" fill={color} stroke={M.ink} strokeWidth={9} strokeLinejoin="round" paintOrder="stroke fill">
      {n}
    </text>
  )
}

/**
 * kCompare/numbers — "Numbers can be more, too. Four dots, seven dots. Seven
 * is more!" A 4 and a 7, each with its ten-frame; the dots pop in as each is
 * said; on "Seven is more!" the 7 and its frame glow and hop.
 */
const numbers: Scene = ({ t, cue }: SceneProps) => {
  const start = cue('Numbers')
  const four = cue('Four dots')
  const seven = cue('seven dots')
  const wins = cue('Seven is more')
  const L = 290
  const R = 670
  return (
    <>
      <Paper />
      <Glow t={t} at={wins} x={R} y={250} r={190} breathe={false} />
      <Pop t={t} at={start + 0.1} x={L} y={170} bounce={11}>
        <T x={L} y={170}>
          <BigNumeral n={4} color={STICKER.gold} />
        </T>
      </Pop>
      <Pop t={t} at={start + 0.3} x={R} y={170} bounce={11}>
        <T x={R} y={170 - bump(t, wins + 0.1, 0.4) * 26} s={1 + 0.12 * ease.outCubic(progress(t, wins, 0.4))}>
          <BigNumeral n={7} color={STICKER.blue} />
        </T>
      </Pop>
      <Pop t={t} at={four - 0.2} x={L} y={370} bounce={14}>
        <T x={L} y={370}>
          <SceneFrame t={t} n={4} at={[0, 1, 2, 3].map((k) => four + k * 0.14)} />
        </T>
      </Pop>
      <Pop t={t} at={seven - 0.2} x={R} y={370} bounce={14}>
        <T x={R} y={370 - bump(t, wins + 0.2, 0.4) * 18}>
          <SceneFrame t={t} n={7} at={[0, 1, 2, 3, 4, 5, 6].map((k) => seven + k * 0.12)} />
        </T>
      </Pop>
      <Burst t={t} at={wins + 0.3} x={R} y={170} r={120} />
    </>
  )
}

export const kCompareScenes: Record<string, Scene> = { lineUp, more, bears, numbers }
