import type { VoiceRef } from '../../../voice/types'
import type { ListenActivitySpec } from '../types'

/**
 * Shape Grove's "Put shapes together" (1st grade, 1.G.2): plain data and
 * geometry for the `snap` activity, no React, so the provider and the tests
 * share it. Drawn in a 160 × 120 box.
 *
 * Recipes (a shape made of two pieces):
 * - `square2tri`: two triangles make a square (corner to corner);
 * - `rect2sq`: two squares make a rectangle;
 * - `bigTri`: a trapezoid and a triangle make a bigger triangle;
 * - `hex2trap`: two trapezoids make a hexagon;
 * - `square2rect`: two rectangles make a square.
 *
 * - `fill`: one piece is in place, the other's spot is a dashed gap; three
 *   pieces to pick from, only one the gap's shape (the others plainly not);
 *   the right one snaps in;
 * - `makes`: the two pieces slide together as the voice says so; "What shape
 *   do they make?" — shape cards.
 */

export type Pt = readonly [number, number]
export type Recipe = 'square2tri' | 'rect2sq' | 'bigTri' | 'hex2trap' | 'square2rect'
export const RECIPES: readonly Recipe[] = ['square2tri', 'rect2sq', 'bigTri', 'hex2trap', 'square2rect']

/** A shape's name, as said and as a card shows it. */
export type SnapShape = 'triangle' | 'square' | 'rectangle' | 'trapezoid' | 'hexagon' | 'circle'

const H3 = Math.sqrt(3) / 2

/** A recipe: the piece in place, the gap's piece, and what they make. */
export interface RecipeDef {
  placed: Pt[]
  gap: Pt[]
  /** What the gap's piece is. */
  gapShape: SnapShape
  /** What the two make. */
  makes: SnapShape
}

const r = (v: number) => Math.round(v * 10) / 10

export const RECIPE: Record<Recipe, RecipeDef> = {
  square2tri: {
    placed: [
      [40, 20],
      [120, 100],
      [40, 100],
    ],
    gap: [
      [40, 20],
      [120, 20],
      [120, 100],
    ],
    gapShape: 'triangle',
    makes: 'square',
  },
  rect2sq: {
    placed: [
      [20, 30],
      [80, 30],
      [80, 90],
      [20, 90],
    ],
    gap: [
      [80, 30],
      [140, 30],
      [140, 90],
      [80, 90],
    ],
    gapShape: 'square',
    makes: 'rectangle',
  },
  bigTri: {
    // a big triangle (side 100): the trapezoid at the bottom, the small triangle on top
    placed: [
      [30, 108],
      [130, 108],
      [105, r(108 - 50 * H3)],
      [55, r(108 - 50 * H3)],
    ],
    gap: [
      [55, r(108 - 50 * H3)],
      [105, r(108 - 50 * H3)],
      [80, r(108 - 100 * H3)],
    ],
    gapShape: 'triangle',
    makes: 'triangle',
  },
  hex2trap: {
    // a hexagon (side 50) cut across the middle: the bottom trapezoid in place, the top one the gap
    placed: [
      [30, 60],
      [130, 60],
      [105, r(60 + 50 * H3)],
      [55, r(60 + 50 * H3)],
    ],
    gap: [
      [30, 60],
      [55, r(60 - 50 * H3)],
      [105, r(60 - 50 * H3)],
      [130, 60],
    ],
    gapShape: 'trapezoid',
    makes: 'hexagon',
  },
  square2rect: {
    placed: [
      [40, 20],
      [120, 20],
      [120, 60],
      [40, 60],
    ],
    gap: [
      [40, 60],
      [120, 60],
      [120, 100],
      [40, 100],
    ],
    gapShape: 'rectangle',
    makes: 'square',
  },
}

/** Pieces that plainly don't fill any gap (each recipe takes two that aren't its gap's shape). */
export const DECOYS: Record<Recipe, readonly SnapShape[]> = {
  square2tri: ['square', 'circle'],
  rect2sq: ['triangle', 'circle'],
  bigTri: ['square', 'circle'],
  hex2trap: ['triangle', 'square'],
  square2rect: ['triangle', 'circle'],
}

/** The cards of "What shape do they make?": what they make, and two others a child might say. */
export const MAKES_CARDS: Record<Recipe, readonly SnapShape[]> = {
  square2tri: ['square', 'triangle', 'hexagon'],
  rect2sq: ['rectangle', 'square', 'triangle'],
  bigTri: ['triangle', 'trapezoid', 'square'],
  hex2trap: ['hexagon', 'trapezoid', 'rectangle'],
  square2rect: ['square', 'rectangle', 'triangle'],
}

/** A decoy piece, sized like the gaps (in the same 160 × 120 units). */
export function decoyPiece(shape: SnapShape): Pt[] | null {
  switch (shape) {
    case 'square':
      return [
        [52, 32],
        [108, 32],
        [108, 88],
        [52, 88],
      ]
    case 'triangle':
      return [
        [80, r(60 - 30 * H3 * 1.2)],
        [r(80 + 34), r(60 + 30 * H3 * 0.8)],
        [r(80 - 34), r(60 + 30 * H3 * 0.8)],
      ]
    case 'circle':
      return null
    default:
      return null
  }
}

export interface SnapSpec extends ListenActivitySpec {
  kind: 'snap'
  ask: 'fill' | 'makes'
  recipe: Recipe
  /** fill: the pieces to pick from (shape names: the gap's shape is the one that fits); makes: the shapes on the cards. */
  cards: readonly SnapShape[]
}

export const isSnapSpec = (s: ListenActivitySpec | undefined): s is SnapSpec => s?.kind === 'snap'

/** The answer: the piece that fills the gap, or what the two make. */
export const snapAnswer = (s: Pick<SnapSpec, 'ask' | 'recipe'>): SnapShape => (s.ask === 'fill' ? RECIPE[s.recipe].gapShape : RECIPE[s.recipe].makes)

/** A shape card's (or piece's) name, as it is tapped: "Triangle!" */
export const sayShape = (s: SnapShape): VoiceRef => ({ template: 'g1-shapes/label', slots: { shape: s } })

/** The help: "Look at the gap: three sides and three corners. A triangle fits!" or "Three sides and three corners: a triangle!" */
export const snapHelpLine = (s: Pick<SnapSpec, 'ask' | 'recipe'>): VoiceRef =>
  s.ask === 'fill' ? { line: `g1-shapes/gap-${RECIPE[s.recipe].gapShape}` } : { line: `g1-shapes/is-${RECIPE[s.recipe].makes}` }

/** Every line a snap question can say. */
export function snapLines(speech: VoiceRef | undefined, s: SnapSpec): VoiceRef[] {
  return [...(speech ? [speech] : []), ...s.cards.map(sayShape), snapHelpLine(s)]
}

/** A polygon's box. */
export function bbox(pts: readonly Pt[]) {
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}

/** An SVG path for a polygon. */
export const ptsPath = (pts: readonly Pt[]) => `M ${pts.map((p) => `${p[0]} ${p[1]}`).join(' L ')} Z`
