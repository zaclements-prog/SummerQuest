/* eslint-disable react-refresh/only-export-components -- shared pieces of the Tens Plateau activities (art and guide steps); not an HMR boundary */
import type { ReactNode } from 'react'
import { Rod, UnitCube } from '../../../tutoring/motion/shapes'
import { M } from '../../../tutoring/motion/palette'
import type { TensSign } from './tensSpecs'
import { onesOf, tensOf } from './tensSpecs'
import './tens.css'

/**
 * Base-ten blocks for Tens Plateau (1st grade, 1.NBT.2): a ROD is a ten (ten
 * cubes stuck together, mint, the lessons' colour for tens) and a CUBE is a
 * one (gold). Rods stand side by side on the left, cubes sit in two short
 * columns on the right. Things light up as they are counted (a gold halo and
 * a number badge: 10, 20, 30… on the rods, 31, 32… on the cubes). Nothing to
 * read: numerals and symbols only.
 */

const S = 10 // a cube's side, in drawing units
const ROD_H = S * 10
const PITCH = 15 // rod to rod
const D = S * 0.35 // the blocks' 3-D depth (top and side)
const PAD = 9
const ONES_GAP = 12
const ONE_PITCH = S + 3

/** Counted blocks: `r<k>` (rod k) or `o<k>` (cube k) → the number its badge shows. */
export type BlockMarks = Readonly<Record<string, number>>

export interface BaseTenProps {
  /** The number shown: its tens as rods, its ones as cubes (0–99). */
  n: number
  /** Lay out room for at least this many rods (cards shown together draw at one size). */
  frameTens?: number
  marks?: BlockMarks
  /** A rod rolling in (ten more): the last rod. */
  freshRod?: boolean
  /** A rod rolling away (ten less): drawn after the others, leaving. */
  goneRod?: boolean
  /** Badge text size: bigger on a small card. */
  badgeScale?: number
  className?: string
}

/** The drawing's size for a frame of `tens` rods (and the ones' two columns). */
export function baseTenBox(tens: number) {
  const rods = Math.max(1, tens)
  const w = PAD * 2 + rods * PITCH - (PITCH - S) + ONES_GAP + 2 * ONE_PITCH + D
  const h = PAD * 2 + ROD_H + D + 6
  return { w, h }
}

const rodX = (k: number) => PAD + k * PITCH
const TOP = PAD + D + 6
/** Where cube k sits: two columns of five, filled bottom up. */
function cubeAt(k: number, rods: number): [number, number] {
  const col = Math.floor(k / 5)
  const row = k % 5
  const x0 = PAD + rods * PITCH - (PITCH - S) + ONES_GAP
  return [x0 + col * ONE_PITCH, TOP + ROD_H - (row + 1) * ONE_PITCH + 3]
}

function Badge({ x, y, n, scale = 1 }: { x: number; y: number; n: number; scale?: number }) {
  const r = 7.6 * scale
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="lp-badge">
        <circle r={r} fill="#ffcf4d" stroke={M.ink} strokeWidth={1.8 * scale} />
        <text y={0.6} fontFamily={M.font} fontWeight={700} fontSize={(n > 99 ? 6.4 : n > 9 ? 8 : 9.5) * scale} textAnchor="middle" dominantBaseline="central" fill={M.ink}>
          {n}
        </text>
      </g>
    </g>
  )
}

/** Rods and cubes for a number, each lighting up as it is counted. */
export function BaseTen({ n, frameTens = 0, marks, freshRod = false, goneRod = false, badgeScale = 1, className = '' }: BaseTenProps) {
  const tens = tensOf(Math.max(0, n))
  const ones = onesOf(Math.max(0, n))
  // a rod rolling away is drawn one past the tens left
  const rodsDrawn = tens + (goneRod ? 1 : 0)
  const frame = Math.max(frameTens, rodsDrawn, 1)
  const { w, h } = baseTenBox(frame)
  // the blocks sit in the middle of the frame (a card of two rods beside one of five)
  const shift = ((frame - rodsDrawn) * PITCH) / 2
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`block w-full h-full ${className}`} aria-hidden="true" data-blocks={n} data-tens={tens} data-ones={ones}>
      <g transform={`translate(${shift} 0)`}>
        {Array.from({ length: rodsDrawn }, (_, k) => {
          const m = marks?.[`r${k}`]
          const leaving = goneRod && k === rodsDrawn - 1
          const arriving = freshRod && k === rodsDrawn - 1
          return (
            <g key={`r${k}`} className={leaving ? 'tq-rod-out' : arriving ? 'tq-rod-in' : undefined} data-rod={k} data-marked={m !== undefined ? '' : undefined}>
              {m !== undefined && <rect x={rodX(k) - 3.5} y={TOP - D - 3.5} width={S + D + 7} height={ROD_H + D + 7} rx={4} fill="#ffe594" stroke="#ffcf4d" strokeWidth={2.2} />}
              <Rod x={rodX(k)} y={TOP} s={S} />
              {m !== undefined && <Badge x={rodX(k) + S / 2 + D / 2} y={TOP - D - 2} n={m} scale={badgeScale} />}
            </g>
          )
        })}
        {Array.from({ length: ones }, (_, k) => {
          const m = marks?.[`o${k}`]
          const [x, y] = cubeAt(k, rodsDrawn)
          return (
            <g key={`o${k}`} data-cube={k} data-marked={m !== undefined ? '' : undefined}>
              {m !== undefined && <rect x={x - 3} y={y - D - 3} width={S + D + 6} height={S + D + 6} rx={3} fill="#ffe594" stroke="#ffcf4d" strokeWidth={2} />}
              <UnitCube x={x} y={y} s={S} />
              {m !== undefined && <Badge x={x + S + D} y={y - D} n={m} scale={badgeScale * 0.85} />}
            </g>
          )
        })}
      </g>
    </svg>
  )
}

/** A big numeral (one to three digits) in the kit's sticker style, for a 100 × 100 box. */
export function BigNumeralGlyph({ n, fill }: { n: number; fill?: string }) {
  const s = String(n)
  const size = s.length > 2 ? 46 : s.length > 1 ? 66 : 84
  const colors = ['#f2766b', '#ffcf4d', '#74d3bd', '#8ab8ff', '#b79af0', '#f7a1c4', '#8edb7c', '#ff9f80']
  return (
    <text x={50} y={53} fontFamily={M.font} fontWeight={700} fontSize={size} textAnchor="middle" dominantBaseline="central" fill={fill ?? colors[((n % 8) + 8) % 8]} stroke={M.ink} strokeWidth={size / 17} strokeLinejoin="round" paintOrder="stroke fill">
      {s}
    </text>
  )
}

/** A big numeral filling its box. */
export function BigNumeral({ n, className = '' }: { n: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`block w-full h-full ${className}`} aria-hidden="true">
      <BigNumeralGlyph n={n} />
    </svg>
  )
}

/** A comparison sign drawn as thick strokes (no font needed): > < = */
export function SignGlyph({ sign, color = '#8ab8ff' }: { sign: TensSign; color?: string }) {
  const stroke = (d: string): ReactNode => (
    <>
      <path d={d} fill="none" stroke={M.ink} strokeWidth={17} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={color} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
    </>
  )
  if (sign === '=') return <g>{stroke('M 24 38 H 76 M 24 64 H 76')}</g>
  return <g>{stroke(sign === '>' ? 'M 30 24 L 72 51 L 30 78' : 'M 70 24 L 28 51 L 70 78')}</g>
}

/** A sign filling its box. */
export function Sign({ sign, className = '' }: { sign: TensSign; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`block w-full h-full ${className}`} aria-hidden="true" data-sign={sign}>
      <SignGlyph sign={sign} />
    </svg>
  )
}
