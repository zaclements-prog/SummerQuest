/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { ease, lerp, progress, spring, wobble } from '../anim'
import { Burst, Draw, Glow, Paper, Pop, T, Title } from '../kit'
import { M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { PointerHand } from './_kart'

/*
 * 1st-grade graph colour code (whole lesson), the same graph as Graph Delta:
 * a row for each fruit, its picture in a box at the start (never a word), one
 * picture for each friend in the row's cells; counted ones get GOLD number
 * badges; the most glows GOLD, the fewest BLUE; matched one with one, a BLUE
 * line joins two pictures, and the one with no match glows GOLD.
 * Nothing to read but numerals.
 */

const EMOJI_FONT = "'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif"
const FRUIT = ['🍎', '🍌', '🍇'] as const
const COUNTS = [4, 2, 3]
const ROW_Y = [140, 275, 410]
const HEAD_X = 150
const CELL0 = 260
const CELL = 104

const cellX = (k: number) => CELL0 + k * CELL + CELL / 2

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

function Emoji({ x, y, size, children }: { x: number; y: number; size: number; children: string }) {
  return (
    <text x={x} y={y + size * 0.06} fontSize={size} fontFamily={EMOJI_FONT} textAnchor="middle" dominantBaseline="central">
      {children}
    </text>
  )
}

/** The graph's frame: a row band for each fruit, the fruit's picture boxed at its start, dashed cells. */
function Frame({ dim = [] as number[] }) {
  return (
    <g>
      <rect x={90} y={60} width={800} height={420} rx={34} fill="#fffaf0" stroke={M.ink} strokeWidth={5} />
      {ROW_Y.map((y, r) => (
        <g key={r} opacity={dim.includes(r) ? 0.35 : 1}>
          <rect x={106} y={y - 58} width={768} height={116} rx={22} fill={r % 2 ? '#ffffff' : '#fff1d6'} />
          <rect x={HEAD_X - 50} y={y - 50} width={100} height={100} rx={22} fill="#fffaf0" stroke={M.ink} strokeWidth={5} />
          <Emoji x={HEAD_X} y={y} size={62}>
            {FRUIT[r]}
          </Emoji>
          {Array.from({ length: 6 }, (_, k) => (
            <rect key={k} x={CELL0 + k * CELL + 6} y={y - 46} width={CELL - 12} height={92} rx={14} fill="none" stroke={M.ink} strokeOpacity={0.14} strokeWidth={3} strokeDasharray="8 8" />
          ))}
        </g>
      ))}
    </g>
  )
}

/** The pictures in the rows (the first `shown[r]` of each). */
function Picks({ shown = COUNTS, dim = [] as number[] }) {
  return (
    <g>
      {ROW_Y.map((y, r) =>
        Array.from({ length: shown[r] }, (_, k) => (
          <g key={`${r}-${k}`} opacity={dim.includes(r) ? 0.35 : 1}>
            <Emoji x={cellX(k)} y={y} size={66}>
              {FRUIT[r]}
            </Emoji>
          </g>
        )),
      )}
    </g>
  )
}

function NumBadge({ t, at, x, y, n }: { t: number; at: number; x: number; y: number; n: number }) {
  return (
    <Pop t={t} at={at} x={x} y={y} bounce={10}>
      <circle cx={x} cy={y} r={22} fill={M.gold} stroke={M.ink} strokeWidth={4} />
      <Title x={x} y={y + 2} size={28}>
        {n}
      </Title>
    </Pop>
  )
}

/** The order the friends' picks go into the rows (a row index each). */
const PICK_ORDER = [0, 1, 2, 0, 2, 0, 1, 2, 0]
/** Where each pick waits before it goes (a pile on the right). */
const pileAt = (i: number) => ({ x: 600 + (i % 3) * 110, y: 150 + Math.floor(i / 3) * 120 })

/**
 * g1Graphs/sort — "Our friends picked their favorite fruit. Put each one in its
 * row. One picture for each friend!" The empty graph; the friends' picks pop in
 * as a pile on the right; from "Put each one" they fly one by one into the
 * next cell of their row; the cells glow on "One picture".
 */
const sort: Scene = ({ t, cue }: SceneProps) => {
  const pile = cue('favorite fruit')
  const go = cue('Put each one')
  const each = cue('One picture')
  const placed = [0, 0, 0]
  const at = PICK_ORDER.map((r) => placed[r]++)
  return (
    <>
      <Paper />
      <Frame />
      {PICK_ORDER.map((r, i) => {
        const from = pileAt(i)
        const to = { x: cellX(at[i]), y: ROW_Y[r] }
        const k = ease.inOutCubic(progress(t, go + i * 0.42, 0.6))
        const s = spring(t, pile + i * 0.08, { stiffness: 240, damping: 15 })
        if (s <= 0.01) return null
        return (
          <T key={i} x={lerp(from.x, to.x, k)} y={lerp(from.y, to.y, k) - Math.sin(k * Math.PI) * 50} s={Math.min(1.1, s)}>
            {k < 0.98 && <rect x={-48} y={-48} width={96} height={96} rx={20} fill="#fffaf0" stroke={M.ink} strokeWidth={4} opacity={1 - k} />}
            <Emoji x={0} y={0} size={66}>
              {FRUIT[r]}
            </Emoji>
          </T>
        )
      })}
      <Glow t={t} at={each} x={cellX(1.5)} y={ROW_Y[1]} r={380} color={M.gold} breathe={false} />
    </>
  )
}

/**
 * g1Graphs/count — "Now count each row. Four friends like apples. Your turn!"
 * The graph made; the apples get their numbers one by one, then a burst on
 * "Four friends"; on "Your turn" the banana row glows. (The check: how many
 * friends like bananas?)
 */
const count: Scene = ({ t, cue }: SceneProps) => {
  const c = cue('count each row')
  const four = cue('Four friends')
  const turn = cue('Your turn')
  return (
    <>
      <Paper />
      <Frame />
      <Glow t={t} at={turn} x={cellX(1)} y={ROW_Y[1]} r={260} color={M.gold} />
      <Picks />
      {Array.from({ length: 4 }, (_, k) => (
        <NumBadge key={k} t={t} at={c + 0.3 + k * 0.32} x={cellX(k) + 34} y={ROW_Y[0] - 34} n={k + 1} />
      ))}
      <Burst t={t} at={four} x={cellX(3)} y={ROW_Y[0]} r={80} />
      <TurnHand t={t} at={turn + 0.3} />
    </>
  )
}

/**
 * g1Graphs/most — "The longest row has the most. Apples! The shortest row has
 * the fewest. Bananas!" The apple row glows gold (and bursts on "Apples!"),
 * then the banana row glows blue.
 */
const most: Scene = ({ t, cue }: SceneProps) => {
  const longest = cue('longest row')
  const apples = cue('Apples')
  const shortest = cue('shortest row')
  return (
    <>
      <Paper />
      <Frame />
      <Glow t={t} at={longest} x={cellX(1.5)} y={ROW_Y[0]} r={330} color={M.gold} out={shortest} breathe={false} />
      <Glow t={t} at={shortest} x={cellX(0.5)} y={ROW_Y[1]} r={240} color={M.sea} breathe={false} />
      <Picks />
      <Burst t={t} at={apples} x={cellX(3)} y={ROW_Y[0]} r={90} />
      <Burst t={t} at={cue('Bananas')} x={cellX(1)} y={ROW_Y[1]} r={80} color={M.sea} />
    </>
  )
}

/**
 * g1Graphs/more — "How many more like apples than grapes? Match them up, one
 * with one. One apple has no match. One more! Your turn!" The bananas fade; a
 * blue line joins each grape to an apple, one by one; the fourth apple, with
 * no match, glows gold and gets a 1; a hand waves on "Your turn".
 */
const more: Scene = ({ t, cue }: SceneProps) => {
  const match = cue('Match them up')
  const none = cue('no match')
  const one = cue('One more')
  return (
    <>
      <Paper />
      <Frame dim={[1]} />
      <Glow t={t} at={none} x={cellX(3)} y={ROW_Y[0]} r={110} color={M.gold} />
      {[0, 1, 2].map((k) => (
        <Draw key={k} t={t} at={match + 0.2 + k * 0.35} dur={0.4} d={`M ${cellX(k)} ${ROW_Y[0] + 38} L ${cellX(k)} ${ROW_Y[2] - 38}`} stroke="#4aa6d6" width={9} />
      ))}
      <Picks dim={[1]} />
      <NumBadge t={t} at={one} x={cellX(3) + 40} y={ROW_Y[0] - 36} n={1} />
      <TurnHand t={t} at={cue('Your turn')} />
    </>
  )
}

export const g1GraphsScenes: Record<string, Scene> = { sort, count, most, more }
