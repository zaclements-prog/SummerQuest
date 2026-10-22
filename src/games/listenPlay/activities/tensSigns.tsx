/* eslint-disable react-refresh/only-export-components -- the comparison signs, shared by the Tens Plateau activities, its lesson and the art registry */
import type { ReactNode } from 'react'
import { M } from '../../../tutoring/motion/palette'
import type { TensSign } from './tensSpecs'

/*
 * Kept apart from ./baseTen (which loads the activities' stylesheet) so the
 * lesson and the `art` registry can import the signs from plain scripts too
 * (the voice and narration dumps run outside the bundler).
 */

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

/** The art registry's names for the three signs (the lesson's sign cards draw them as the stage does). */
export const signArtName = (sign: TensSign): string => `g1sign-${sign === '>' ? 'gt' : sign === '<' ? 'lt' : 'eq'}`

/** The three signs, by name, for the `art` registry (src/games/listenPlay/drawings.tsx). */
export const G1_SIGN_DRAWINGS: Record<string, () => ReactNode> = Object.fromEntries(
  (['>', '<', '='] as const).map((s) => [signArtName(s), () => <SignGlyph sign={s} />]),
)

