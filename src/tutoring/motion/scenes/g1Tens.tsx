/* eslint-disable react-refresh/only-export-components -- scene modules export a Record<stepId, Scene> registry of components; not an HMR boundary */
import { ease, lerp, progress, spring } from '../anim'
import { Burst, Glow, Paper, Pop, T } from '../kit'
import { M } from '../palette'
import { Rod, UnitCube } from '../shapes'
import type { Scene, SceneProps } from '../types'
import { NumDisc, PointerHand, STICKER } from './_kart'

/*
 * 1st grade tens and ones (whole lesson; the same look as Tens Plateau's
 * blocks): a ROD is a ten (mint, ten cubes stuck together), a CUBE is a one
 * (gold). Counted things glow gold and get a number disc (10, 20, 30… on the
 * rods; 31, 32… on the cubes). In a numeral the tens digit is mint-deep and
 * the ones digit gold-deep, like the blocks they stand for. No words.
 */

/** 0 → 1 → 0 over `dur` from `at` (a hop). */
const bump = (t: number, at: number, dur = 0.36) => {
  const k = progress(t, at, dur)
  return k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI)
}

/** A numeral sticker centred on (0, 0). */
function Num({ n, size = 120, color = STICKER.blue }: { n: number | string; size?: number; color?: string }) {
  return (
    <text x={0} y={size * 0.04} fontFamily={M.font} fontWeight={700} fontSize={size} textAnchor="middle" dominantBaseline="middle" fill={color} stroke={M.ink} strokeWidth={size / 16} strokeLinejoin="round" paintOrder="stroke fill">
      {n}
    </text>
  )
}

/** A two-digit numeral with its tens digit in the rods' colour and its ones digit in the cubes'. */
function TensOnesNum({ n, size = 150 }: { n: number; size?: number }) {
  const w = size * 0.3
  return (
    <g>
      <T x={-w}>
        <Num n={Math.floor(n / 10)} size={size} color={STICKER.mint} />
      </T>
      <T x={w}>
        <Num n={n % 10} size={size} color={STICKER.gold} />
      </T>
    </g>
  )
}

/** A gold glow behind a block (rect), fading in at `at`. */
function Lit({ t, at, x, y, w, h }: { t: number; at: number; x: number; y: number; w: number; h: number }) {
  const k = ease.outCubic(progress(t, at, 0.25))
  if (k <= 0.001) return null
  return <rect x={x - 7} y={y - 7} width={w + 14} height={h + 14} rx={8} fill={M.gold} opacity={0.55 * k} />
}

/** A number disc that pops in at `at`, centred at (x, y). */
function DiscAt({ t, at, x, y, n, r = 22 }: { t: number; at: number; x: number; y: number; n: number; r?: number }) {
  return (
    <Pop t={t} at={at} x={x} y={y} bounce={11}>
      <T x={x} y={y}>
        <NumDisc n={n} r={r} fill={M.white} />
      </T>
    </Pop>
  )
}

/**
 * g1Tens/bundle — "Here are ten little cubes. Snap them together, and they
 * make one rod. One rod is a ten!" Ten cubes pop in along a row; on "Snap them
 * together" they fly into a column; on "one rod" the column becomes a rod
 * (a pop, a glow); on "is a ten" a 10 disc pops beside it.
 */
const bundle: Scene = ({ t, cue }: SceneProps) => {
  const cubes = cue('ten little cubes')
  const snap = cue('Snap them')
  const rod = cue('make one rod')
  const ten = cue('is a ten')
  const S = 38
  const colX = 460
  const top = 70
  const snapped = progress(t, rod, 0.3)
  return (
    <>
      <Paper />
      <Glow t={t} at={rod} x={colX + S / 2} y={top + S * 5} r={150} breathe={false} />
      {snapped < 1 &&
        Array.from({ length: 10 }, (_, k) => {
          const s = spring(t, cubes + k * 0.07, { stiffness: 240, damping: 13 })
          if (s <= 0.001) return null
          const from: [number, number] = [118 + k * 72, 260]
          const to: [number, number] = [colX, top + k * S]
          const m = ease.inOutCubic(progress(t, snap + k * 0.06, 0.6))
          const x = lerp(from[0], to[0], m)
          const y = lerp(from[1], to[1], m) - Math.sin(m * Math.PI) * 50
          return (
            <g key={k} opacity={1 - snapped}>
              <T x={x + S / 2} y={y + S / 2} s={s}>
                <UnitCube x={-S / 2} y={-S / 2} s={S} />
              </T>
            </g>
          )
        })}
      {snapped > 0 && (
        <Pop t={t} at={rod} x={colX + S / 2} y={top + S * 5} bounce={10}>
          <Rod x={colX} y={top} s={S} />
        </Pop>
      )}
      <DiscAt t={t} at={ten} x={colX + S + 110} y={top + S * 5} n={10} r={46} />
      <Burst t={t} at={ten + 0.2} x={colX + S + 110} y={top + S * 5} r={110} />
    </>
  )
}

/** Three rods and six cubes, left of the stage (the `build` scene's blocks). */
const BS = 30
const rodX = (k: number) => 80 + k * 70
const ROD_TOP = 120
/** The cubes sit in a row on the floor, right of the rods. */
const cubeXY = (k: number): [number, number] => [300 + k * 48, ROD_TOP + BS * 10 - BS]

/**
 * g1Tens/build — "Three rods and six cubes. Ten, twenty, thirty. Thirty-one,
 * thirty-two, …, thirty-six! Three tens and six ones make thirty-six." The
 * rods pop in, then the cubes; each rod lights on its ten (10, 20, 30), each
 * cube on its one (31…36); on "make thirty-six" a big 36 pops in, its 3 in
 * the rods' mint and its 6 in the cubes' gold.
 */
const build: Scene = ({ t, cue }: SceneProps) => {
  const rods = cue('Three rods')
  const cubes = cue('six cubes')
  const tens = [cue('Ten,'), cue('twenty'), cue('thirty.')]
  const ones = ['thirty-one', 'thirty-two', 'thirty-three', 'thirty-four', 'thirty-five', 'thirty-six'].map((w) => cue(w))
  const make = cue('make thirty-six')
  return (
    <>
      <Paper />
      {[0, 1, 2].map((k) => (
        <g key={`r${k}`}>
          <Lit t={t} at={tens[k]} x={rodX(k)} y={ROD_TOP - BS * 0.35} w={BS * 1.35} h={BS * 10.35} />
          <Pop t={t} at={rods + k * 0.12} x={rodX(k) + BS / 2} y={ROD_TOP + BS * 5} bounce={12}>
            <Rod x={rodX(k)} y={ROD_TOP} s={BS} />
          </Pop>
          <DiscAt t={t} at={tens[k] + 0.05} x={rodX(k) + BS / 2 + 4} y={ROD_TOP - 34} n={(k + 1) * 10} />
        </g>
      ))}
      {ones.map((at, k) => {
        const [x, y] = cubeXY(k)
        return (
          <g key={`o${k}`}>
            <Lit t={t} at={at} x={x} y={y - BS * 0.35} w={BS * 1.35} h={BS * 1.35} />
            <Pop t={t} at={cubes + k * 0.09} x={x + BS / 2} y={y + BS / 2} bounce={12}>
              <UnitCube x={x} y={y} s={BS} />
            </Pop>
            <DiscAt t={t} at={at + 0.05} x={x + BS / 2 + 4} y={y - 34} n={31 + k} r={20} />
          </g>
        )
      })}
      <Glow t={t} at={make} x={760} y={230} r={150} breathe={false} />
      <Pop t={t} at={make + 0.1} x={760} y={230} bounce={10}>
        <T x={760} y={230 - bump(t, make + 0.8, 0.4) * 14}>
          <TensOnesNum n={36} size={170} />
        </T>
      </Pop>
      <Burst t={t} at={make + 0.4} x={760} y={230} r={140} />
    </>
  )
}

/**
 * g1Tens/count — "Your turn! Count the tens first. Then count on the ones."
 * Five rods and two cubes; the rods glow on "tens first", the cubes on "the
 * ones", a hand pointing at each. No numbers: the check asks how many.
 */
const count: Scene = ({ t, cue }: SceneProps) => {
  const turn = cue('Your turn')
  const tens = cue('tens first')
  const ones = cue('the ones')
  const S = 28
  const x0 = 230
  const top = 150
  const handTo = t < ones ? [x0 + 2 * 60 + S / 2, top - 14] : [x0 + 5 * 60 + 40 + S / 2, top + S * 10 - 2 * 44 - 14]
  const handIn = ease.outCubic(progress(t, tens, 0.6))
  return (
    <>
      <Paper />
      {Array.from({ length: 5 }, (_, k) => (
        <g key={`r${k}`}>
          <Lit t={t} at={tens} x={x0 + k * 60} y={top - S * 0.35} w={S * 1.35} h={S * 10.35} />
          <Pop t={t} at={turn + k * 0.1} x={x0 + k * 60 + S / 2} y={top + S * 5}>
            <Rod x={x0 + k * 60} y={top} s={S} />
          </Pop>
        </g>
      ))}
      {[0, 1].map((k) => {
        const x = x0 + 5 * 60 + 40
        const y = top + S * 10 - S - k * 44
        return (
          <g key={`o${k}`}>
            <Lit t={t} at={ones} x={x} y={y - S * 0.35} w={S * 1.35} h={S * 1.35} />
            <Pop t={t} at={turn + 0.6 + k * 0.1} x={x + S / 2} y={y + S / 2}>
              <UnitCube x={x} y={y} s={S} />
            </Pop>
          </g>
        )
      })}
      {t >= tens && (
        <T x={lerp(1000, handTo[0], handIn)} y={handTo[1]} r={0}>
          <PointerHand press={bump(t, (t < ones ? tens : ones) + 0.7, 0.4)} />
        </T>
      )}
    </>
  )
}

/** A number with its blocks under it, centred at x. */
function NumberWithBlocks({ t, at, x, n, litTens = Infinity, S = 24 }: { t: number; at: number; x: number; n: number; litTens?: number; S?: number }) {
  const tn = Math.floor(n / 10)
  const on = n % 10
  const w = tn * (S + 14) + 20 + Math.ceil(on / 5) * (S + 12)
  const x0 = x - w / 2
  const top = 220
  return (
    <Pop t={t} at={at} x={x} y={300} bounce={12}>
      <T x={x} y={120}>
        <TensOnesNum n={n} size={130} />
      </T>
      {Array.from({ length: tn }, (_, k) => (
        <g key={`r${k}`}>
          <Lit t={t} at={litTens} x={x0 + k * (S + 14)} y={top - S * 0.35} w={S * 1.35} h={S * 10.35} />
          <Rod x={x0 + k * (S + 14)} y={top} s={S} />
        </g>
      ))}
      {Array.from({ length: on }, (_, k) => (
        <UnitCube key={`o${k}`} x={x0 + tn * (S + 14) + 20 + Math.floor(k / 5) * (S + 12)} y={top + S * 10 - S - (k % 5) * (S + 10)} s={S} />
      ))}
    </Pop>
  )
}

/**
 * g1Tens/compare — "Forty-one or fourteen: which is bigger? Look at the tens
 * first. Four tens beat one ten. Forty-one is bigger!" 41 and 14 pop in on
 * their words, each over its blocks; the rods light on "tens first" (the four
 * on "Four tens", the one on "one ten"); 41 grows and bursts on "Forty-one is
 * bigger".
 */
const compare: Scene = ({ t, cue }: SceneProps) => {
  const a = cue('Forty-one or')
  const b = cue('fourteen')
  const first = cue('tens first')
  const four = cue('Four tens')
  const one = cue('one ten')
  const win = cue('Forty-one is bigger')
  const grow = 1 + 0.08 * ease.outCubic(progress(t, win, 0.4))
  return (
    <>
      <Paper />
      <Glow t={t} at={win} x={260} y={290} r={190} breathe={false} />
      <g transform={`translate(260 290) scale(${grow}) translate(-260 -290)`}>
        <NumberWithBlocks t={t} at={a} x={260} n={41} litTens={Math.min(four, first + 0.6)} />
      </g>
      <NumberWithBlocks t={t} at={b} x={700} n={14} litTens={Math.min(one, first + 0.6)} />
      <Burst t={t} at={win + 0.2} x={260} y={120} r={120} />
    </>
  )
}

/** The greater-than sign, drawn as a thick stroke, centred on (0, 0). */
function Greater({ s = 1, color = STICKER.blue }: { s?: number; color?: string }) {
  const d = `M ${-28 * s} ${-36 * s} L ${30 * s} 0 L ${-28 * s} ${36 * s}`
  return (
    <g>
      <path d={d} fill="none" stroke={M.ink} strokeWidth={22 * s} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={color} strokeWidth={12 * s} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
}

/**
 * g1Tens/sign — "This sign means greater than. Its open side faces the bigger
 * number. Your turn!" A big > pops in between 41 and 14; on "open side" its
 * open mouth glows and an arrow-ish glow runs to 41. On "Your turn" it all
 * slides away and 53 ☐ 35 comes in (the check: which sign goes in the box?).
 */
const sign: Scene = ({ t, cue }: SceneProps) => {
  const sg = cue('This sign')
  const open = cue('open side')
  const turn = cue('Your turn')
  const away = ease.inOutCubic(progress(t, turn, 0.5))
  const come = spring(t, turn + 0.35, { stiffness: 200, damping: 14 })
  return (
    <>
      <Paper />
      {away < 1 && (
        <g opacity={1 - away} transform={`translate(0 ${-away * 60})`}>
          <T x={220} y={270}>
            <TensOnesNum n={41} size={150} />
          </T>
          <T x={740} y={270}>
            <TensOnesNum n={14} size={150} />
          </T>
          <Glow t={t} at={open} x={420} y={270} r={110} breathe={false} />
          <Pop t={t} at={sg} x={480} y={270} bounce={10}>
            <T x={480} y={270}>
              <Greater s={2.2} />
            </T>
          </Pop>
          <Glow t={t} at={open + 0.5} x={220} y={270} r={150} breathe={false} />
        </g>
      )}
      {come > 0.001 && (
        <g opacity={Math.min(1, come * 1.5)}>
          <T x={240} y={260} s={come}>
            <TensOnesNum n={53} size={150} />
          </T>
          <T x={480} y={262} s={come}>
            <rect x={-62} y={-62} width={124} height={124} rx={22} fill="#fffaf0" stroke={M.ink} strokeOpacity={0.5} strokeWidth={6} strokeDasharray="16 12" />
          </T>
          <T x={720} y={260} s={come}>
            <TensOnesNum n={35} size={150} />
          </T>
        </g>
      )}
    </>
  )
}

export const g1TensScenes: Record<string, Scene> = { bundle, build, count, compare, sign }
