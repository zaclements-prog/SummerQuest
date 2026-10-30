import type { GobbleSetId, SnackValue } from './sets'

/**
 * The skill each snack decision practises, under the ids the zone's other
 * stages already use (src/tutoring/skills.ts), so This Week's Focus and the
 * Parent Dashboard count Gobble Garden's comparisons with the rest:
 *
 * - Number Dunes (K): `k-compare-numbers`;
 * - Tens Plateau (1st grade): `g1-compare-2digit`;
 * - Place Value Plateau (2–4): `pv-identify` (which place decides);
 * - Fraction Falls (2–4): `frac-cmp-likeden` for a same-bottom snack, else `frac-cmp-unlikeden`;
 * - Place Value Plateau (5th grade): `g5-dec-compare`;
 * - Fraction Falls (5th grade): `g5-frac-compare`.
 */
export interface GobbleSkill {
  id: string
  label: string
}

export function gobbleSkill(set: GobbleSetId, snack?: Pick<SnackValue, 'family'>): GobbleSkill {
  switch (set) {
    case 'k':
      return { id: 'k-compare-numbers', label: 'comparing numbers to 10' }
    case 'g1':
      return { id: 'g1-compare-2digit', label: 'comparing two-digit numbers' }
    case 'whole':
      return { id: 'pv-identify', label: 'place value of a digit' }
    case 'frac':
      return snack?.family === 'sameDen' ? { id: 'frac-cmp-likeden', label: 'comparing (same bottom)' } : { id: 'frac-cmp-unlikeden', label: 'comparing (different bottoms)' }
    case 'dec':
      return { id: 'g5-dec-compare', label: 'comparing decimals' }
    case 'fracDec':
      return { id: 'g5-frac-compare', label: 'comparing fractions' }
  }
}

/** The topic the game's answers are filed under. */
export const GOBBLE_TOPIC = 'gobble-garden'
