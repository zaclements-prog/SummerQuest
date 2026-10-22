/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { arc, ease, lerp, progress, spring, wobble } from '../anim'
import { Burst, Glow, Paper, Pop, T } from '../kit'
import { M } from '../palette'
import { Apple } from '../shapes'
import type { Scene, SceneProps } from '../types'
import { Bear, NumDisc, PointerHand, STICKER } from './_kart'
import { Basket, Bird, Branch, BunnyFace, FoxFace, Owl, Pear, TenFrame, frameCell } from './_kmathart'
import { Cloud, EmptySpot, SentenceLine } from './_g1art'

/*
 * 1st grade story problems within 20 (1.OA.1–2), for Story Woods: a story is
 * acted out on the stage and its number sentence written: Bear's apples and
 * the ones Fox brings, Owl's birds (some fly away: how many?), three bunches
 * of flowers made into a ten first, and two rows of pears lined up. Numerals
 * and math signs only, never words.
 */

const EQ_Y = 72

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

/** A flower: a ring of petals (one circle) on a stem, a gold centre. */
function Bloom({ x, y, r = 24, petal }: { x: number; y: number; r?: number; petal: string }) {
  return (
    <g>
      <path d={`M ${x} ${y + r * 0.6} L ${x} ${y + r * 1.6}`} stroke={M.leaf} strokeWidth={r * 0.24} strokeLinecap="round" />
      <circle cx={x} cy={y} r={r} fill={petal} stroke={M.ink} strokeWidth={3.5} strokeDasharray={`${r * 0.9} ${r * 0.18}`} />
      <circle cx={x} cy={y} r={r * 0.38} fill={STICKER.gold} stroke={M.ink} strokeWidth={3} />
    </g>
  )
}

const BASKET = { x: 430, y: 372 }
/** The basket's apple spots: rows of five, from the bottom up. */
const appleSpot = (i: number): [number, number] => [BASKET.x - 104 + (i % 5) * 52, BASKET.y - 24 - Math.floor(i / 5) * 50]

/**
 * g1StoryMath/story — "Bear has eight apples. Fox brings five more. Eight
 * plus five is thirteen!" Bear and her basket of eight apples; Fox slides in
 * with five more, and they hop into the basket one by one; then 8 + 5 = 13
 * is written.
 */
const story: Scene = ({ t, cue }: SceneProps) => {
  const bear = cue('Bear has')
  const fox = cue('Fox brings')
  const more = cue('five more')
  const sentence = cue('Eight plus five')
  const foxIn = ease.outCubic(progress(t, fox, 0.8))
  const fx = lerp(1080, 830, foxIn)
  return (
    <>
      <Paper />
      <Pop t={t} at={bear} x={130} y={330} bounce={11}>
        <T x={130} y={330}>
          <Bear r={70} />
        </T>
      </Pop>
      <Pop t={t} at={bear + 0.2} x={BASKET.x} y={BASKET.y} bounce={12}>
        <T x={BASKET.x} y={BASKET.y}>
          <Basket w={340} />
        </T>
      </Pop>
      {foxIn > 0 && (
        <T x={fx} y={300}>
          <FoxFace r={62} />
        </T>
      )}
      {Array.from({ length: 13 }, (_, i) => {
        if (i < 8) {
          const s = spring(t, bear + 0.5 + i * 0.1, { stiffness: 220, damping: 13 })
          if (s <= 0.001) return null
          const [x, y] = appleSpot(i)
          return <Apple key={i} x={x} y={y - (1 - Math.min(1, s)) * 110} r={22} color={STICKER.coral} />
        }
        // Fox's five wait beside him, then hop into the basket one by one
        if (foxIn <= 0) return null
        const j = i - 8
        const wait: [number, number] = [fx - 110 + (j % 3) * 46, 420 - Math.floor(j / 3) * 46]
        const p = ease.inOutCubic(progress(t, more + 0.3 + j * 0.35, 0.55))
        const [x, y] = arc(wait, appleSpot(i), 120, p)
        return <Apple key={i} x={x} y={y} r={22} color={STICKER.coral} />
      })}
      <SentenceLine t={t} x={480} y={EQ_Y} tokens={[8, '+', 5, '=', 13]} at={sentence} />
      <Burst t={t} at={sentence + 1.1} x={620} y={EQ_Y} r={80} />
    </>
  )
}

/** The birds on the branch: two rows of six. */
const birdSpot = (i: number): [number, number] => [250 + (i % 6) * 86, 372 - Math.floor(i / 6) * 74]
/** Where the three that fly away land, on a cloud. */
const CLOUD = { x: 800, y: 150 }
const cloudSpot = (j: number): [number, number] => [CLOUD.x - 62 + j * 62, CLOUD.y - 44]

/**
 * g1StoryMath/mystery — "Your turn! Owl saw twelve birds. Some flew away. Now
 * nine are left." Owl and a branch of twelve birds; on "Some flew away" three
 * fly up to a cloud; on "Now nine are left" the nine still on the branch
 * light up, and 12 − ? = 9 is written. No answer: the check asks for it.
 */
const mystery: Scene = ({ t, cue }: SceneProps) => {
  const turn = cue('Your turn')
  const owl = cue('Owl saw')
  const away = cue('Some flew away')
  const left = cue('Now nine are left')
  return (
    <>
      <Paper />
      <Pop t={t} at={away} x={CLOUD.x} y={CLOUD.y} bounce={12}>
        <T x={CLOUD.x} y={CLOUD.y}>
          <Cloud w={240} />
        </T>
      </Pop>
      <Pop t={t} at={owl} x={110} y={330} bounce={11}>
        <T x={110} y={330}>
          <Owl r={48} />
        </T>
      </Pop>
      {/* the nine still on the branch light up */}
      <Glow t={t} at={left} x={410} y={335} r={230} breathe={false} />
      <T x={480} y={400}>
        <Branch w={640} />
      </T>
      {Array.from({ length: 12 }, (_, i) => {
        const s = spring(t, owl + 0.4 + i * 0.07, { stiffness: 220, damping: 14 })
        if (s <= 0.001) return null
        const home = birdSpot(i)
        if (i >= 9) {
          const j = i - 9
          const p = ease.inOutCubic(progress(t, away + 0.3 + j * 0.3, 0.8))
          const [x, y] = arc(home, cloudSpot(j), 90, p)
          const flap = p > 0 && p < 1 ? Math.abs(Math.sin(p * Math.PI * 4)) : 0
          return (
            <T key={i} x={x} y={y} s={Math.min(1, s)}>
              <Bird r={28} color={STICKER.blue} flap={flap} />
            </T>
          )
        }
        const hop = bump(t, left + i * 0.06, 0.35) * 14
        return (
          <T key={i} x={home[0]} y={home[1] - hop} s={Math.min(1, s)}>
            <Bird r={28} color={STICKER.blue} />
          </T>
        )
      })}
      <SentenceLine t={t} x={440} y={EQ_Y} tokens={[12, '−', '?', '=', 9]} at={left + 0.3} />
      <Wave t={t} at={turn} />
    </>
  )
}

const FLOWER_CELL = 66
const TEN = { x: 450, y: 360 }
const tenSpot = (i: number): [number, number] => {
  const [dx, dy] = frameCell(i, FLOWER_CELL)
  return [TEN.x + dx, TEN.y + dy - 8]
}
/** Where each bunch is picked: tulips, roses, daisies. */
const pickSpot = (i: number): [number, number] => {
  if (i < 4) return [250 + (i % 2) * 60, 250 + Math.floor(i / 2) * 70]
  if (i < 10) return [450 + ((i - 4) % 3) * 60, 250 + Math.floor((i - 4) / 3) * 70]
  return [740 + ((i - 10) % 2) * 60, 250 + Math.floor((i - 10) / 2) * 70]
}
const PETALS = [STICKER.pink, STICKER.pink, STICKER.pink, STICKER.pink, ...Array(6).fill(STICKER.coral), M.white, M.white, M.white] as string[]

/**
 * g1StoryMath/three — "Bunny picks four tulips, six roses and three daisies.
 * Four and six make ten. Ten and three is thirteen!" Bunny and three bunches
 * of flowers, each popping up as it is named; on "Four and six make ten" the
 * tulips and roses slide into a ten-frame, a full ten (10); on "Ten and
 * three" the daisies glow, and 4 + 6 + 3 = 13 is written.
 */
const three: Scene = ({ t, cue }: SceneProps) => {
  const tulips = cue('four tulips')
  const roses = cue('six roses')
  const daisies = cue('three daisies')
  const ten = cue('Four and six make ten')
  const sum = cue('Ten and three')
  const shownAt = (i: number) => (i < 4 ? tulips : i < 10 ? roses : daisies) + (i < 4 ? i : i < 10 ? i - 4 : i - 10) * 0.1
  const frameIn = spring(t, ten, { stiffness: 210, damping: 13 })
  return (
    <>
      <Paper />
      <Pop t={t} at={tulips - 0.6} x={100} y={380} bounce={11}>
        <T x={100} y={380}>
          <BunnyFace r={52} />
        </T>
      </Pop>
      {frameIn > 0.001 && (
        <T x={TEN.x} y={TEN.y} s={Math.min(1, frameIn)}>
          <TenFrame cell={FLOWER_CELL} />
        </T>
      )}
      <Glow t={t} at={sum} x={800} y={360} r={110} breathe={false} />
      {Array.from({ length: 13 }, (_, i) => {
        const s = spring(t, shownAt(i), { stiffness: 220, damping: 13 })
        if (s <= 0.001) return null
        let [x, y] = pickSpot(i)
        if (i < 10) {
          // into the ten-frame, one by one
          const p = ease.inOutCubic(progress(t, ten + 0.4 + i * 0.12, 0.6))
          const to = tenSpot(i)
          x = lerp(x, to[0], p)
          y = lerp(y, to[1], p)
        } else {
          // the daisies wait beside it
          x = 800
          y = 300 + (i - 10) * 66
        }
        return (
          <g key={i} transform={`translate(${x} ${y}) scale(${Math.min(1, s)}) translate(${-x} ${-y})`}>
            <Bloom x={x} y={y} r={24} petal={PETALS[i]} />
          </g>
        )
      })}
      <Pop t={t} at={ten + 1.8} x={TEN.x + 2.5 * FLOWER_CELL} y={TEN.y - FLOWER_CELL} bounce={10}>
        <T x={TEN.x + 2.5 * FLOWER_CELL} y={TEN.y - FLOWER_CELL}>
          <NumDisc n={10} r={32} />
        </T>
      </Pop>
      <SentenceLine t={t} x={480} y={EQ_Y} size={64} tokens={[4, '+', 6, '+', 3, '=', 13]} at={sum} />
      <Burst t={t} at={sum + 1.4} x={700} y={EQ_Y} r={70} />
    </>
  )
}

const PEAR_X = (i: number) => 205 + i * 70
const TOP = 210
const BOTTOM = 400

/**
 * g1StoryMath/fewer — "Your turn! Bear has nine pears. Fox has six pears."
 * Bear's nine pears in a row; Fox's six lined up under them, one under each;
 * three dashed spots where Fox has none. No answer: the check asks for it.
 */
const fewer: Scene = ({ t, cue }: SceneProps) => {
  const turn = cue('Your turn')
  const bear = cue('Bear has')
  const fox = cue('Fox has')
  return (
    <>
      <Paper />
      <Pop t={t} at={bear} x={110} y={TOP} bounce={11}>
        <T x={110} y={TOP}>
          <Bear r={54} />
        </T>
      </Pop>
      <Pop t={t} at={fox} x={110} y={BOTTOM} bounce={11}>
        <T x={110} y={BOTTOM}>
          <FoxFace r={54} />
        </T>
      </Pop>
      {Array.from({ length: 9 }, (_, i) => {
        const s = spring(t, bear + 0.3 + i * 0.08, { stiffness: 220, damping: 14 })
        if (s <= 0.001) return null
        return (
          <T key={`t${i}`} x={PEAR_X(i)} y={TOP} s={Math.min(1, s)}>
            <Pear r={26} />
          </T>
        )
      })}
      {Array.from({ length: 9 }, (_, i) => {
        if (i >= 6) {
          const k = ease.outCubic(progress(t, fox + 1.2 + (i - 6) * 0.15, 0.4))
          if (k <= 0) return null
          return (
            <T key={`b${i}`} x={PEAR_X(i)} y={BOTTOM} s={k}>
              <EmptySpot r={30} />
            </T>
          )
        }
        const s = spring(t, fox + 0.3 + i * 0.08, { stiffness: 220, damping: 14 })
        if (s <= 0.001) return null
        return (
          <g key={`b${i}`}>
            <line x1={PEAR_X(i)} y1={TOP + 40} x2={PEAR_X(i)} y2={BOTTOM - 40} stroke={STICKER.coral} strokeWidth={4} opacity={0.5 * Math.min(1, s)} />
            <T x={PEAR_X(i)} y={BOTTOM} s={Math.min(1, s)}>
              <Pear r={26} />
            </T>
          </g>
        )
      })}
      <Wave t={t} at={turn} />
    </>
  )
}

export const g1StoryMathScenes: Record<string, Scene> = { story, mystery, three, fewer }
