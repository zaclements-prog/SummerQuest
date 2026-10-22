/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { ease, progress } from '../anim'
import { Burst, Chip, Equation, Glow, Paper, Pop, Title } from '../kit'
import { DEEP, M } from '../palette'
import type { Scene, SceneProps } from '../types'
import { ColorWords, Box, CUBE_TONES, CubeBuild, boxCells, isoView } from './_g5mgd'

/*
 * 5th-grade volume colour code (whole lesson): cubes and the first box GOLD,
 * the base layer MINT, a second box BLUE; length CORAL, width BLUE, height
 * LILAC (on the edges and in the equations alike).
 */

const L_C = DEEP.coral
const W_C = DEEP.blue
const H_C = DEEP.lilac

// One 4 × 3 × 3 box for the first three steps, in the same spot.
const U = 52
const P = isoView(330, 230, U)

/** volume/cubes — the bottom layer of 12 drops in, then two more layers stack: 36 cubic centimeters. */
const cubes: Scene = ({ t, cue }: SceneProps) => {
  const layer = cue('Build the bottom layer')
  const twelve = cue('makes twelve cubes')
  const stack = cue('Stack three layers')
  const total = cue('thirty-six cubes')
  const cm = cue('cubic centimeters')
  return (
    <>
      <Paper />
      <Glow t={t} at={0.2} x={330} y={300} r={210} color={M.sky} />
      <CubeBuild t={t} P={P} cells={boxCells(4, 3, 1)} at={layer + 0.2} gap={0.09} tone={CUBE_TONES.mint} />
      <CubeBuild t={t} P={P} cells={boxCells(4, 3, 1, 1)} at={stack + 0.2} gap={0.04} />
      <CubeBuild t={t} P={P} cells={boxCells(4, 3, 1, 2)} at={stack + 0.9} gap={0.04} />
      <Chip t={t} at={twelve} x={760} y={150} text="1 layer = 12" color={M.mint} size={30} />
      <Chip t={t} at={stack + 0.4} x={760} y={240} text="3 layers" color={M.gold} size={30} />
      <Pop t={t} at={total} x={760} y={340}>
        <Title x={760} y={340} size={64} color={DEEP.gold} stroke={M.white}>
          36 cubes
        </Title>
      </Pop>
      <Chip t={t} at={cm} x={760} y={430} text="36 cubic cm" color={M.white} size={30} />
      <Burst t={t} at={cm} x={760} y={430} />
    </>
  )
}

/** The 4 × 3 × 3 box with its edges labelled as they're named. */
function LabelledBox({ t, l, w, h }: { t: number; l: number; w: number; h: number }) {
  const [lx, ly] = P(2, 3, 0)
  const [wx, wy] = P(4, 1.5, 0)
  const [hx, hy] = P(0, 3, 1.5)
  return (
    <>
      <Box P={P} l={4} w={3} h={3} />
      <Pop t={t} at={l} x={lx - 30} y={ly + 34}>
        <Title x={lx - 30} y={ly + 34} size={34} color={L_C} stroke={M.white}>
          4 cm
        </Title>
      </Pop>
      <Pop t={t} at={w} x={wx + 40} y={wy + 30}>
        <Title x={wx + 40} y={wy + 30} size={34} color={W_C} stroke={M.white}>
          3 cm
        </Title>
      </Pop>
      <Pop t={t} at={h} x={hx - 56} y={hy}>
        <Title x={hx - 56} y={hy} size={34} color={H_C} stroke={M.white}>
          3 cm
        </Title>
      </Pop>
    </>
  )
}

/** volume/formula — l, w and h light up on the box; V = l × w × h, then 4 × 3 × 3 = 36. */
const formula: Scene = ({ t, cue }: SceneProps) => {
  const len = cue('Length times')
  const wid = cue('width tells')
  const hgt = cue('by the height')
  const v = cue('Volume equals')
  const nums = cue('four times three')
  return (
    <>
      <Paper />
      <LabelledBox t={t} l={len} w={wid} h={hgt} />
      <Equation
        t={t}
        x={730}
        y={190}
        size={54}
        tokens={[
          { text: 'V', at: v },
          { text: '=', at: v + 0.15 },
          { text: 'l', at: v + 0.35, color: L_C },
          { text: '×', at: v + 0.5 },
          { text: 'w', at: v + 0.65, color: W_C },
          { text: '×', at: v + 0.8 },
          { text: 'h', at: v + 0.95, color: H_C },
        ]}
      />
      <Equation
        t={t}
        x={730}
        y={320}
        size={54}
        tokens={[
          { text: '4', at: nums, color: L_C },
          { text: '×', at: nums + 0.2 },
          { text: '3', at: nums + 0.4, color: W_C },
          { text: '×', at: nums + 0.6 },
          { text: '3', at: nums + 0.8, color: H_C },
          { text: '=', at: nums + 1.1 },
          { text: '36', at: nums + 1.4, color: DEEP.gold },
        ]}
      />
      <Burst t={t} at={nums + 1.4} x={850} y={320} />
    </>
  )
}

/** volume/base — the bottom layer glows as the base (B = 12), the height rises: V = B × h. */
const base: Scene = ({ t, cue }: SceneProps) => {
  const b = cue('called the base')
  const area = cue('Its area')
  const h = cue('B times h')
  const nums = cue('A base of twelve')
  const k = ease.outCubic(progress(t, b, 0.6))
  return (
    <>
      <Paper />
      {/* the box lifts a little so the base layer shows apart from the rest */}
      <CubeBuild t={t} P={P} cells={boxCells(4, 3, 1)} at={-1} tone={CUBE_TONES.mint} />
      {/* the two layers above it, lifted to show the base */}
      <g transform={`translate(0 ${-U - 30 * k})`}>
        <Box P={P} l={4} w={3} h={2} />
      </g>
      <Chip t={t} at={area} x={330} y={470} text="B = 12 square cm" color={M.mint} size={30} />
      <Equation
        t={t}
        x={730}
        y={200}
        size={58}
        tokens={[
          { text: 'V', at: h - 0.6 },
          { text: '=', at: h - 0.45 },
          { text: 'B', at: h - 0.2, color: DEEP.mint },
          { text: '×', at: h },
          { text: 'h', at: h + 0.2, color: H_C },
        ]}
      />
      <Equation
        t={t}
        x={730}
        y={330}
        size={58}
        tokens={[
          { text: '12', at: nums, color: DEEP.mint },
          { text: '×', at: nums + 0.3 },
          { text: '3', at: cue('height of three'), color: H_C },
          { text: '=', at: cue('make thirty-six') },
          { text: '36', at: cue('make thirty-six') + 0.3, color: DEEP.gold },
        ]}
      />
    </>
  )
}

/** volume/composed — two boxes slide apart, each gets its volume, then they join: 24 + 12 = 36. */
const composed: Scene = ({ t, cue }: SceneProps) => {
  const two = cue('two boxes')
  const each = cue('volume of each box')
  const add = cue('then add')
  const sum = cue('Twenty-four plus')
  const Q = isoView(300, 200, 54)
  const apart = ease.inOutCubic(progress(t, each, 0.7)) * (1 - ease.inOutCubic(progress(t, add, 0.7)))
  const [ax, ay] = Q(1, 1.5, 4.6)
  const [bx, by] = Q(3 + 1.6 * apart, 1.5, 2.6)
  return (
    <>
      <Paper />
      <Pop t={t} at={two - 0.6} x={300} y={300} bounce={16}>
        <Box P={Q} l={2} w={3} h={4} />
        <Box P={Q} x0={2} dx={1.6 * apart} l={2} w={3} h={2} tone={CUBE_TONES.blue} />
      </Pop>
      <Chip t={t} at={each + 0.4} out={add + 0.2} x={ax} y={ay - 30} text="2 × 3 × 4 = 24" color={M.gold} size={26} />
      <Chip t={t} at={each + 0.9} out={add + 0.2} x={bx + 30} y={by - 30} text="2 × 3 × 2 = 12" color={M.sky} size={26} />
      <Equation
        t={t}
        x={720}
        y={300}
        size={58}
        tokens={[
          { text: '24', at: sum, color: DEEP.gold },
          { text: '+', at: sum + 0.3 },
          { text: '12', at: sum + 0.6, color: DEEP.blue },
          { text: '=', at: sum + 0.9 },
          { text: '36', at: sum + 1.2 },
        ]}
      />
      <Chip t={t} at={cue('cubic meters')} x={720} y={400} text="36 cubic meters" color={M.white} size={28} />
    </>
  )
}

/** volume/convert — 3 meter sticks become 300 centimeters (× 100); 120 minutes become 2 hours (÷ 60). */
const convert: Scene = ({ t, cue }: SceneProps) => {
  const small = cue('smaller unit')
  const meter = cue('one meter is')
  const three = cue('three meters is')
  const big = cue('bigger unit')
  const hours = cue('two hours')
  return (
    <>
      <Paper />
      <Chip t={t} at={small} x={240} y={80} text="smaller unit: multiply" color={M.gold} size={26} />
      {[0, 1, 2].map((i) => (
        <Pop key={i} t={t} at={meter + i * 0.35} x={240} y={170 + i * 62}>
          <rect x={90} y={150 + i * 62} width={300} height={40} rx={8} fill="#f6d9a8" stroke={M.ink} strokeWidth={3} />
          {Array.from({ length: 11 }, (_, k) => (
            <line key={k} x1={100 + k * 28} y1={150 + i * 62} x2={100 + k * 28} y2={150 + i * 62 + (k % 5 === 0 ? 18 : 10)} stroke={M.ink} strokeWidth={2.5} />
          ))}
          <Title x={240} y={182 + i * 62} size={20} color={M.ink}>
            {progress(t, three, 0.1) > 0 ? '100 cm' : '1 m'}
          </Title>
        </Pop>
      ))}
      <ColorWords t={t} at={three} x={240} y={410} size={46} text="3 m = 300 cm" colors={[M.ink, M.ink, M.ink, DEEP.coral, DEEP.coral]} />
      <Chip t={t} at={big} x={710} y={80} text="bigger unit: divide" color={M.sky} size={26} />
      <Pop t={t} at={big + 0.4} x={710} y={220}>
        <circle cx={710} cy={220} r={86} fill={M.white} stroke={M.ink} strokeWidth={5} />
        {Array.from({ length: 12 }, (_, k) => {
          const a = (k / 12) * Math.PI * 2
          return <line key={k} x1={710 + Math.sin(a) * 70} y1={220 - Math.cos(a) * 70} x2={710 + Math.sin(a) * 80} y2={220 - Math.cos(a) * 80} stroke={M.ink} strokeWidth={3} />
        })}
        <line x1={710} y1={220} x2={710} y2={152} stroke={DEEP.blue} strokeWidth={6} strokeLinecap="round" transform={`rotate(${720 * ease.inOutCubic(progress(t, big + 0.8, 2))} 710 220)`} />
        <circle cx={710} cy={220} r={7} fill={M.ink} />
      </Pop>
      <ColorWords t={t} at={big + 0.8} gap={0.25} x={710} y={410} size={42} text="120 min ÷ 60 = 2 h" colors={[M.ink, M.ink, DEEP.blue, DEEP.blue, M.ink, DEEP.blue, DEEP.blue]} />
      <Burst t={t} at={hours} x={800} y={410} color={M.sky} />
    </>
  )
}

export const g5VolumeScenes: Record<string, Scene> = { cubes, formula, base, composed, convert }
