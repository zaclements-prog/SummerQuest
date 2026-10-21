/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { arc, ease, lerp, progress, spring, wobble } from '../anim'
import { Burst, Glow, Paper, Pop, T } from '../kit'
import { M } from '../palette'
import { Apple } from '../shapes'
import type { Scene, SceneProps } from '../types'
import { Bear, Ear, NumDisc, PointerHand, STICKER } from './_kart'
import { Basket, Bird, Branch, BunnyFace, FoxFace, Owl, Peach, Pear } from './_kmathart'

/*
 * Kindergarten story problems (K.OA.2), for Story Woods: a story is told and
 * acted out on the stage — Bear's apples and the ones Fox brings, Owl's birds
 * flying off, pears and peaches in Bunny's basket. A pointing hand does the
 * acting; numerals only, never words.
 */

const bump = (t: number, at: number, dur = 0.32) => {
  const k = progress(t, at, dur)
  return k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI)
}

/** A woodland floor along the bottom, and two soft trees at the back. */
function Woods() {
  return (
    <>
      <g opacity={0.45}>
        <rect x={52} y={250} width={22} height={220} fill="#a37650" />
        <path d="M 63 120 L 128 300 L -2 300 Z" fill="#5fae6b" />
        <rect x={880} y={260} width={22} height={210} fill="#a37650" />
        <path d="M 891 140 L 950 300 L 832 300 Z" fill="#5fae6b" />
      </g>
      <path d="M 0 470 Q 240 448 480 466 T 960 458 L 960 540 L 0 540 Z" fill="#9fd88a" />
      <path d="M 0 470 Q 240 448 480 466 T 960 458" fill="none" stroke={M.ink} strokeWidth={4} strokeLinecap="round" />
    </>
  )
}

const BASKET_X = 450
const BASKET_Y = 352
const AX = [326, 388, 450, 512, 574]
const APPLE_Y = 330
const APPLE_R = 28

/**
 * kStoryMath/story — "Listen to a story. Bear has two apples. Fox brings her
 * three more!" An ear says "listen"; Bear and her basket pop in, two apples
 * drop into it; Fox slides in holding three apples, and on "three more" they
 * hop over into the basket, one by one.
 */
const story: Scene = ({ t, cue }: SceneProps) => {
  const listen = cue('Listen')
  const bear = cue('Bear has')
  const two = cue('two apples')
  const fox = cue('Fox brings')
  const more = cue('three more')
  const foxIn = ease.outCubic(progress(t, fox, 0.8))
  const fx = lerp(1060, 800, foxIn)
  return (
    <>
      <Paper />
      <Woods />
      <Pop t={t} at={listen} x={480} y={110} out={bear - 0.2} bounce={11}>
        <T x={480} y={110}>
          <Ear r={48} waves={ease.outCubic(progress(t, listen + 0.3, 0.5))} />
        </T>
      </Pop>
      <Pop t={t} at={bear} x={170} y={300} bounce={11}>
        <T x={170} y={300 - bump(t, bear + 0.1, 0.4) * 20}>
          <Bear r={70} />
        </T>
      </Pop>
      <Pop t={t} at={bear + 0.2} x={BASKET_X} y={BASKET_Y + 40} bounce={12}>
        <T x={BASKET_X} y={BASKET_Y}>
          <Basket w={340} />
        </T>
      </Pop>
      {[0, 1].map((k) => {
        const s = spring(t, two + k * 0.2, { stiffness: 210, damping: 13 })
        if (s <= 0.001) return null
        return <Apple key={k} x={AX[k]} y={APPLE_Y - (1 - Math.min(1, s)) * 200} r={APPLE_R} color={STICKER.coral} />
      })}
      {foxIn > 0 && (
        <T x={fx} y={300 - bump(t, more - 0.1, 0.4) * 16}>
          <FoxFace r={66} />
        </T>
      )}
      {[2, 3, 4].map((k, j) => {
        if (foxIn <= 0) return null
        const held: [number, number] = [fx - 60 + j * 60, 196]
        const at = more + 0.25 + j * 0.45
        const p = ease.inOutCubic(progress(t, at, 0.6))
        const [x, y] = p > 0 ? arc(held, [AX[k], APPLE_Y], 120, p) : held
        return <Apple key={k} x={x} y={y} r={APPLE_R} color={STICKER.coral} />
      })}
    </>
  )
}

/**
 * kStoryMath/act — "Let's act it out. Put them together and count. One, two,
 * three, four, five. Five apples!" The two and the three in the basket slide
 * together; a hand taps each apple as it's counted and its number pops under
 * the basket; a big 5.
 */
const act: Scene = ({ t, cue }: SceneProps) => {
  const together = cue('Put them together')
  const n = [cue('One,'), cue('two,'), cue('three,'), cue('four,'), cue('five.')]
  const five = cue('Five apples')
  const slide = ease.inOutCubic(progress(t, together, 0.7))
  // before: a gap between Bear's two and Fox's three
  const xOf = (k: number) => (k < 2 ? lerp(AX[k] - 22, AX[k], slide) : lerp(AX[k] + 22, AX[k], slide))
  const hover = (k: number): [number, number] => [xOf(k), APPLE_Y - 64]
  let [hx, hy] = [1020, 600]
  const enter = ease.outCubic(progress(t, n[0] - 0.7, 0.6))
  hx = lerp(hx, hover(0)[0], enter)
  hy = lerp(hy, hover(0)[1], enter)
  for (let k = 1; k < 5; k++) {
    const m = ease.inOutCubic(progress(t, n[k] - 0.32, 0.28))
    hx = lerp(hx, hover(k)[0], m)
    hy = lerp(hy, hover(k)[1], m)
  }
  const leave = ease.inQuad(progress(t, n[4] + 0.7, 0.5))
  hx = lerp(hx, 1040, leave)
  hy = lerp(hy, 80, leave)
  const press = Math.max(...n.map((at) => bump(t, at - 0.05)))
  return (
    <>
      <Paper />
      <Woods />
      <T x={170} y={300}>
        <Bear r={70} />
      </T>
      <T x={800} y={300}>
        <FoxFace r={66} />
      </T>
      <T x={BASKET_X} y={BASKET_Y}>
        <Basket w={340} />
      </T>
      {AX.map((_, k) => {
        const counted = t >= n[k]
        const sq = wobble(t, n[k] + 0.04, { amp: 0.12, freq: 2.6, decay: 6 })
        return (
          <g key={k}>
            {counted && (
              <T x={xOf(k)} y={APPLE_Y} s={ease.outBack(progress(t, n[k], 0.35))}>
                <circle r={APPLE_R + 12} fill={M.gold} opacity={0.35} />
              </T>
            )}
            <T x={xOf(k)} y={APPLE_Y} sx={1 + sq} sy={1 - sq}>
              <Apple x={0} y={0} r={APPLE_R} color={STICKER.coral} />
            </T>
          </g>
        )
      })}
      {AX.map((x, k) => (
        <Pop key={`n${k}`} t={t} at={n[k]} x={x} y={BASKET_Y + 104} bounce={10}>
          <T x={x} y={BASKET_Y + 104}>
            <NumDisc n={k + 1} r={24} />
          </T>
        </Pop>
      ))}
      {t >= n[0] - 0.7 && leave < 1 && (
        <T x={hx} y={hy + press * 26} r={-8}>
          <PointerHand press={press} />
        </T>
      )}
      <Glow t={t} at={five} x={BASKET_X} y={104} r={84} breathe={false} />
      <Pop t={t} at={five} x={BASKET_X} y={104} bounce={10}>
        <T x={BASKET_X} y={104}>
          <NumDisc n={5} r={56} />
        </T>
      </Pop>
      <Burst t={t} at={five + 0.2} x={BASKET_X} y={104} r={110} />
    </>
  )
}

const BRANCH_Y = 300
const BX = [330, 420, 510, 600, 690, 780]
const BIRD_COLORS = [STICKER.blue, STICKER.mint, STICKER.lilac, STICKER.pink, STICKER.gold, STICKER.coral]

/**
 * kStoryMath/away — "Owl sees six birds in a tree. Then two birds fly away."
 * Owl sits on the trunk; six birds land on the branch one by one; on "two
 * birds fly away" the last two flap up and away to the right (the check asks
 * how many are still in the tree).
 */
const away: Scene = ({ t, cue }: SceneProps) => {
  const owl = cue('Owl sees')
  const six = cue('six birds')
  const fly = cue('fly away')
  return (
    <>
      <Paper />
      <rect x={110} y={140} width={64} height={360} rx={18} fill="#a37650" stroke={M.ink} strokeWidth={4} />
      <ellipse cx={142} cy={110} rx={150} ry={86} fill="#7cc46e" stroke={M.ink} strokeWidth={4} />
      <T x={560} y={BRANCH_Y}>
        <Branch w={760} />
      </T>
      <Pop t={t} at={owl} x={142} y={226} bounce={11}>
        <T x={142} y={226}>
          <Owl r={50} />
        </T>
      </Pop>
      {BX.map((x, k) => {
        const land = six + k * 0.16
        if (t < land - 0.6) return null
        const s = ease.outCubic(progress(t, land - 0.6, 0.6))
        let bx = lerp(x + 120, x, s)
        let by = lerp(BRANCH_Y - 260, BRANCH_Y - 36, s)
        let flap = s < 1 ? Math.abs(Math.sin(t * 14)) : 0
        if (k >= 4) {
          const at = fly + 0.1 + (k - 4) * 0.35
          const p = ease.inQuad(progress(t, at, 1.3))
          if (p >= 1) return null
          if (p > 0) {
            bx = lerp(x, 1100, p)
            by = lerp(BRANCH_Y - 36, -60, p)
            flap = Math.abs(Math.sin(t * 14))
          }
        }
        return (
          <T key={k} x={bx} y={by}>
            <g transform="scale(-1 1)">
              <Bird r={30} color={BIRD_COLORS[k]} flap={flap} />
            </g>
          </T>
        )
      })}
    </>
  )
}

const PX = [380, 445, 510, 590, 655]

/**
 * kStoryMath/basket — "Your turn! Bunny has three pears and two peaches."
 * A hand waves hello; Bunny and her basket pop in; three pears, then two
 * peaches drop into the basket (the check asks how many fruits in all). No
 * numbers.
 */
const basket: Scene = ({ t, cue }: SceneProps) => {
  const turn = cue('Your turn')
  const bunny = cue('Bunny has')
  const pears = cue('three pears')
  const peaches = cue('two peaches')
  return (
    <>
      <Paper />
      <Woods />
      <Pop t={t} at={bunny} x={180} y={330} bounce={11}>
        <T x={180} y={330}>
          <BunnyFace r={62} />
        </T>
      </Pop>
      <Pop t={t} at={bunny + 0.15} x={520} y={BASKET_Y + 40} bounce={12}>
        <T x={520} y={BASKET_Y}>
          <Basket w={380} />
        </T>
      </Pop>
      {PX.map((x, k) => {
        const at = k < 3 ? pears + k * 0.2 : peaches + (k - 3) * 0.2
        const s = spring(t, at, { stiffness: 210, damping: 13 })
        if (s <= 0.001) return null
        const y = APPLE_Y - (1 - Math.min(1, s)) * 220
        return <T key={k} x={x} y={y}>{k < 3 ? <Pear r={26} /> : <Peach r={27} />}</T>
      })}
      <Pop t={t} at={turn} x={892} y={520} bounce={11}>
        <T x={892} y={520} r={-22 + wobble(t, turn + 0.3, { amp: 14, freq: 1.6, decay: 2.6 })}>
          <PointerHand />
        </T>
      </Pop>
    </>
  )
}

export const kStoryMathScenes: Record<string, Scene> = { story, act, away, basket }
