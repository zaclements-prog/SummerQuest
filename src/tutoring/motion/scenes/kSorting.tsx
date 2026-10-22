/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import type { ReactNode } from 'react'
import { arc, ease, lerp, progress, spring } from '../anim'
import { Glow, Paper, T } from '../kit'
import { starPath } from '../layout'
import { M } from '../palette'
import { Apple, Cookie, Frog } from '../shapes'
import type { Scene, SceneProps } from '../types'
import { Bear, Fish, PointerHand } from './_kart'

/*
 * Kindergarten sorting colour code (whole lesson), the same boxes as Sorting
 * Delta: each box shows what goes in it on a white sticker (a bear for
 * animals, an apple for food, a splash of colour for red or blue); things
 * fly in an arc into their box and line up two by two. Nothing to read.
 */

const RED = '#ef4b3f'
const BLUE = '#3d8bf2'
const BOX = { w: 350, h: 262, y: 252 }
const BX = [278, 682]

/** A thing to sort, drawn around (0, 0), about 2 × `r` across. */
type Thing = 'bear' | 'frog' | 'fish' | 'apple' | 'cookie' | 'redApple' | 'redHeart' | 'redBall' | 'redStar' | 'blueFish' | 'blueHeart'

function heart(r: number) {
  return `M 0 ${r * 0.75} C ${-r * 1.15} ${-r * 0.05} ${-r * 0.6} ${-r * 1.05} 0 ${-r * 0.4} C ${r * 0.6} ${-r * 1.05} ${r * 1.15} ${-r * 0.05} 0 ${r * 0.75} Z`
}

function ThingArt({ thing, r }: { thing: Thing; r: number }) {
  switch (thing) {
    case 'bear':
      return <Bear r={r * 0.78} />
    case 'frog':
      return <Frog x={0} y={r * 0.85} r={r * 0.55} />
    case 'fish':
      return <Fish r={r * 0.62} color={M.mint} />
    case 'apple':
      return <Apple x={0} y={0} r={r * 0.8} color={M.coral} />
    case 'cookie':
      return <Cookie x={0} y={0} r={r * 0.8} rot={20} />
    case 'redApple':
      return <Apple x={0} y={0} r={r * 0.8} color={RED} />
    case 'redHeart':
      return <path d={heart(r * 0.85)} fill={RED} stroke={M.ink} strokeWidth={4} strokeLinejoin="round" />
    case 'redBall':
      return (
        <g>
          <circle r={r * 0.78} fill={RED} stroke={M.ink} strokeWidth={4} />
          <ellipse cx={-r * 0.28} cy={-r * 0.3} rx={r * 0.18} ry={r * 0.1} fill="#fff" opacity={0.7} />
        </g>
      )
    case 'redStar':
      return <path d={starPath(r * 0.9)} fill={RED} stroke={M.ink} strokeWidth={4} strokeLinejoin="round" />
    case 'blueFish':
      return <Fish r={r * 0.62} color={BLUE} />
    case 'blueHeart':
      return <path d={heart(r * 0.85)} fill={BLUE} stroke={M.ink} strokeWidth={4} strokeLinejoin="round" />
  }
}

/** A box: an open crate, tinted, with its sticker (the children) on the front. */
function Box({ cx, tint, children }: { cx: number; tint: string; children: ReactNode }) {
  const x = cx - BOX.w / 2
  return (
    <g strokeLinejoin="round">
      <rect x={x} y={BOX.y} width={BOX.w} height={BOX.h} rx={26} fill={tint} stroke={M.ink} strokeWidth={5} />
      <rect x={x + 6} y={BOX.y + 6} width={BOX.w - 12} height={14} rx={7} fill="#ffffff" opacity={0.45} />
      <rect x={cx - 66} y={BOX.y + BOX.h - 76} width={132} height={64} rx={16} fill="#fffaf0" stroke={M.ink} strokeWidth={4} />
      <T x={cx} y={BOX.y + BOX.h - 44}>{children}</T>
    </g>
  )
}

/** A colour splash for a colour box's sticker. */
function Splash({ color }: { color: string }) {
  return <path d="M -38 0 C -42 -18 -12 -26 0 -22 C 16 -28 44 -18 38 0 C 44 16 16 26 0 20 C -16 28 -44 16 -38 0 Z" fill={color} stroke={M.ink} strokeWidth={3.5} />
}

/** Where the k-th thing sits in box b: two by two, above the sticker. */
const slot = (b: number, k: number): [number, number] => [BX[b] + (k % 2 ? 76 : -76), BOX.y + 62 + Math.floor(k / 2) * 84]

interface Flyer {
  thing: Thing
  from: [number, number]
  box: number
  k: number
  /** When it flies (seconds). */
  at: number
}

/** Things popping in at their tray place, then flying in an arc into their box slot. */
function Flyers({ t, items, appear, r = 56 }: { t: number; items: Flyer[]; appear: number; r?: number }) {
  return (
    <>
      {items.map((f, i) => {
        const s = spring(t, appear + i * 0.08, { stiffness: 220, damping: 15 })
        if (s <= 0.001) return null
        const k = ease.inOutCubic(progress(t, f.at, 0.7))
        const [x, y] = arc(f.from, slot(f.box, f.k), 90, k)
        return (
          <T key={i} x={x} y={y} s={s * lerp(1, 0.72, k)}>
            <ThingArt thing={f.thing} r={r} />
          </T>
        )
      })}
    </>
  )
}

/** The same things, already in their boxes (popping in at `appear`). */
function Sorted({ t, items, appear }: { t: number; items: { thing: Thing; box: number; k: number }[]; appear: number }) {
  return (
    <>
      {items.map((f, i) => {
        const [x, y] = slot(f.box, f.k)
        return (
          <T key={i} x={x} y={y} s={0.72 * spring(t, appear + i * 0.06, { stiffness: 220, damping: 15 })}>
            <ThingArt thing={f.thing} r={56} />
          </T>
        )
      })}
    </>
  )
}

const ROW_Y = 118

/**
 * kSorting/sort — "Sorting means putting things that go together. Animals go
 * in this box. Food goes in that box!" A bear, an apple, a frog and a cookie
 * in a row; on "Animals" the bear and the frog fly into the box with the bear
 * sticker, on "Food" the apple and the cookie into the box with the apple.
 */
const sort: Scene = ({ t, cue }: SceneProps) => {
  const animals = cue('Animals go')
  const food = cue('Food goes')
  const items: Flyer[] = [
    { thing: 'bear', from: [195, ROW_Y], box: 0, k: 0, at: animals + 0.2 },
    { thing: 'apple', from: [385, ROW_Y], box: 1, k: 0, at: food + 0.2 },
    { thing: 'frog', from: [575, ROW_Y], box: 0, k: 1, at: animals + 0.6 },
    { thing: 'cookie', from: [765, ROW_Y], box: 1, k: 1, at: food + 0.6 },
  ]
  return (
    <>
      <Paper />
      <Glow t={t} at={cue('this box')} x={BX[0]} y={BOX.y + BOX.h / 2} r={200} breathe={false} />
      <Glow t={t} at={cue('that box')} x={BX[1]} y={BOX.y + BOX.h / 2} r={200} breathe={false} />
      <Box cx={BX[0]} tint="#fff1d6">
        <Bear r={22} />
      </Box>
      <Box cx={BX[1]} tint="#e3f2ff">
        <Apple x={0} y={0} r={22} color={M.coral} />
      </Box>
      <Flyers t={t} items={items} appear={0.2} />
    </>
  )
}

/** 0 → 1 → 0 over `dur` from `at` (a tap). */
const bump = (t: number, at: number, dur = 0.3) => {
  const k = progress(t, at, dur)
  return k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI)
}

/** A hand that taps each spot in turn (from `at`, one every `gap` s), then leaves. */
function TapHand({ t, at, spots, gap = 0.5 }: { t: number; at: number; spots: [number, number][]; gap?: number }) {
  if (t < at - 0.5 || t > at + spots.length * gap + 0.6) return null
  let x = spots[0][0]
  let y = spots[0][1]
  for (let i = 1; i < spots.length; i++) {
    const m = ease.inOutCubic(progress(t, at + i * gap - 0.25, 0.22))
    x = lerp(x, spots[i][0], m)
    y = lerp(y, spots[i][1], m)
  }
  const press = Math.max(...spots.map((_, i) => bump(t, at + i * gap)))
  const fadeIn = ease.outCubic(progress(t, at - 0.5, 0.4))
  const fadeOut = 1 - progress(t, at + spots.length * gap + 0.1, 0.4)
  return (
    <T x={x + 10} y={y - 26 + press * 14} r={-8} s={0.6} o={Math.min(fadeIn, fadeOut)}>
      <PointerHand press={press} />
    </T>
  )
}

/**
 * kSorting/count — "Now count each group. Let's count the animals!" The two
 * boxes, sorted: a bear, a frog and a fish with the animals; an apple and a
 * cookie with the food. Both glow on "each group"; on "the animals" their box
 * glows and a hand taps each animal in turn (no numbers: the check asks how many).
 */
const count: Scene = ({ t, cue }: SceneProps) => {
  const each = cue('each group')
  const animals = cue('the animals')
  const sorted: { thing: Thing; box: number; k: number }[] = [
    { thing: 'bear', box: 0, k: 0 },
    { thing: 'frog', box: 0, k: 1 },
    { thing: 'fish', box: 0, k: 2 },
    { thing: 'apple', box: 1, k: 0 },
    { thing: 'cookie', box: 1, k: 1 },
  ]
  return (
    <>
      <Paper />
      <Glow t={t} at={each} x={BX[0]} y={BOX.y + BOX.h / 2} r={200} out={animals - 0.2} breathe={false} />
      <Glow t={t} at={each} x={BX[1]} y={BOX.y + BOX.h / 2} r={200} out={animals - 0.2} breathe={false} />
      <Glow t={t} at={animals} x={BX[0]} y={BOX.y + BOX.h / 2} r={210} color={M.gold} breathe={false} />
      <Box cx={BX[0]} tint="#fff1d6">
        <Bear r={22} />
      </Box>
      <Box cx={BX[1]} tint="#e3f2ff">
        <Apple x={0} y={0} r={22} color={M.coral} />
      </Box>
      <Sorted t={t} items={sorted} appear={0.1} />
      <TapHand t={t} at={animals + 0.4} spots={[slot(0, 0), slot(0, 1), slot(0, 2)]} gap={0.55} />
    </>
  )
}

const COLOR_ITEMS: { thing: Thing; box: number; k: number }[] = [
  { thing: 'redBall', box: 0, k: 0 },
  { thing: 'blueFish', box: 1, k: 0 },
  { thing: 'redHeart', box: 0, k: 1 },
  { thing: 'redStar', box: 0, k: 2 },
  { thing: 'blueHeart', box: 1, k: 1 },
  { thing: 'redApple', box: 0, k: 3 },
]
const COLOR_ROW = [130, 270, 410, 550, 690, 830]

function ColorBoxes() {
  return (
    <>
      <Box cx={BX[0]} tint="#ffe0dc">
        <Splash color={RED} />
      </Box>
      <Box cx={BX[1]} tint="#dcebff">
        <Splash color={BLUE} />
      </Box>
    </>
  )
}

/**
 * kSorting/color — "We can sort by color, too. Red ones go here. Blue ones go
 * there!" Six things in a row (four red, two blue); on "Red ones" the red ones
 * fly into the box with the red splash, on "Blue ones" the blue ones into the blue.
 */
const color: Scene = ({ t, cue }: SceneProps) => {
  const red = cue('Red ones')
  const blue = cue('Blue ones')
  let r = 0
  let b = 0
  const items: Flyer[] = COLOR_ITEMS.map((it, i) => ({ ...it, from: [COLOR_ROW[i], ROW_Y] as [number, number], at: it.box === 0 ? red + 0.15 + 0.3 * r++ : blue + 0.15 + 0.3 * b++ }))
  return (
    <>
      <Paper />
      <Glow t={t} at={cue('go here')} x={BX[0]} y={BOX.y + BOX.h / 2} r={200} color={RED} breathe={false} />
      <Glow t={t} at={cue('go there')} x={BX[1]} y={BOX.y + BOX.h / 2} r={200} color={BLUE} breathe={false} />
      <ColorBoxes />
      <Flyers t={t} items={items} appear={0.2} r={50} />
    </>
  )
}

/**
 * kSorting/more — "Look at the two groups. Count each one. Which group has
 * more?" The colour boxes, sorted: four red, two blue. Both glow on "two
 * groups", and a hand taps each thing, the red box first, then the blue.
 */
const more: Scene = ({ t, cue }: SceneProps) => {
  const groups = cue('two groups')
  const each = cue('Count each one')
  const spots = [...COLOR_ITEMS.filter((it) => it.box === 0), ...COLOR_ITEMS.filter((it) => it.box === 1)].map((it) => slot(it.box, it.k))
  return (
    <>
      <Paper />
      <Glow t={t} at={groups} x={BX[0]} y={BOX.y + BOX.h / 2} r={200} color={RED} breathe={false} />
      <Glow t={t} at={groups + 0.3} x={BX[1]} y={BOX.y + BOX.h / 2} r={200} color={BLUE} breathe={false} />
      <ColorBoxes />
      <Sorted t={t} items={COLOR_ITEMS} appear={0.1} />
      <TapHand t={t} at={each + 0.3} spots={spots} gap={0.42} />
    </>
  )
}

export const kSortingScenes: Record<string, Scene> = { sort, count, color, more }
