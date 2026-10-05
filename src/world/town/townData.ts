import type { Collider } from '../worldLayout'

/**
 * Where the town's hand-placed props stand, in world coordinates. The renderers
 * (House / Schoolhouse / Library / TownDecor) and the town colliders
 * (areas/colliders/town.ts) both read these, so what you see is what blocks you.
 *
 * Kept free of runtime imports from worldLayout (which imports the colliders) —
 * the building centers below mirror WORLD_AREAS (house (0,−10) size 10,
 * schoolhouse (−12,−6) size 6, library (12,−6) size 6).
 */
export type XZ = [number, number]

export const HOUSE_C: XZ = [0, -10]
export const SCHOOL_C: XZ = [-12, -6]
export const LIBRARY_C: XZ = [12, -6]

// ── House yard ──────────────────────────────────────────────────────────────
export const HOUSE_YARD = {
  /** Potted topiary left of the door. */
  pot: [-1.45, -4.45] as XZ,
  mailbox: [1.5, -4.2] as XZ,
  /** Flower beds along the front wall (w × d), each with a low picket fence in front. */
  beds: [
    { c: [-3.0, -4.4] as XZ, w: 2.2, d: 0.62 },
    { c: [3.0, -4.4] as XZ, w: 2.2, d: 0.62 },
  ],
  mat: [0, -4.08] as XZ,
  /** Vegetable beds between the back wall and the river, and their scarecrow. */
  veg: [
    { c: [-2.7, -15.95] as XZ, w: 3.0, d: 0.8 },
    { c: [2.7, -15.95] as XZ, w: 3.0, d: 0.8 },
  ],
  scarecrow: [0, -15.95] as XZ,
}

// ── Schoolhouse ─────────────────────────────────────────────────────────────
export const SCHOOL_YARD = {
  /** A-frame chalkboard by the door. */
  chalkboard: [-14.25, -2.3] as XZ,
  flagpole: [-8.45, -2.6] as XZ,
  /** Playground across the Division Dunes path (the school yard). */
  swings: [-11.45, 4.6] as XZ,
  slide: [-14.15, 4.75] as XZ,
}

/** Schoolhouse interior, local to the building center: desks face the chalkboard (−z). */
export const SCHOOL_DESKS: XZ[] = [
  [-1.55, -0.55], [1.55, -0.55],
  [-1.55, 0.65], [1.55, 0.65],
  [-1.55, 1.85], [1.55, 1.85],
]
export const SCHOOL_TEACHER_DESK: XZ = [-1.35, -1.95]
/** Cubby shelf against the west (−x) wall. */
export const SCHOOL_CUBBY: XZ = [-2.6, 0.95]

// ── Library ─────────────────────────────────────────────────────────────────
export const LIBRARY_YARD = {
  /** Portico columns either side of the door. */
  columns: [[10.55, -2.45], [13.45, -2.45]] as XZ[],
  /** Reading bench against the east (+x) wall, facing out. */
  bench: [15.78, -5.6] as XZ,
  benchPlant: [15.72, -4.35] as XZ,
}

/** Library interior (local): bookcases along the two back walls + a reading nook. */
export const LIBRARY_SHELVES = [
  { c: [-1.35, -2.58] as XZ, w: 2.3, alongX: true },
  { c: [1.35, -2.58] as XZ, w: 2.3, alongX: true },
  { c: [-2.58, -0.75] as XZ, w: 2.0, alongX: false },
  { c: [-2.58, 1.45] as XZ, w: 1.6, alongX: false },
]
export const LIBRARY_NOOK = {
  rug: [-0.75, -0.7] as XZ,
  table: [1.75, 0.2] as XZ,
  armchair: [1.85, -1.35] as XZ,
}

// ── Town square & lanes ─────────────────────────────────────────────────────
export const NOTICE_BOARD: XZ = [8.45, -2.45]
export const TOWN_LAMPS: XZ[] = [
  // north lanes to the bridges
  [-8.75, -11], [-8.75, -15.2], [8.75, -11], [8.75, -15.2],
  // a ring along the lanes leaving the square
  [-9.85, 0.55], [-6.66, 9.49], [1.96, 11.92], [7.0, 9.17], [9.97, 2.94],
]
export const TOWN_BENCHES: { p: XZ; rot: number }[] = [
  { p: [12.4, -13.2], rot: Math.PI }, // riverside, behind the library (faces the water)
  { p: [9.7, 7.0], rot: -2.3 }, // south-east green, facing the plaza
]
export const TOWN_TREES: { p: XZ; variant: 'round' | 'blossom' | 'fruit' | 'autumn' | 'pine'; s: number; seed: number }[] = [
  { p: [-11.2, -11.6], variant: 'round', s: 1.1, seed: 3 },
  { p: [-14.1, -11.0], variant: 'autumn', s: 1.0, seed: 4 },
  { p: [-12.2, -13.6], variant: 'pine', s: 1.0, seed: 5 },
  { p: [11.2, -11.6], variant: 'fruit', s: 1.1, seed: 6 },
  { p: [14.3, -10.6], variant: 'round', s: 1.0, seed: 7 },
  { p: [10.2, 9.3], variant: 'blossom', s: 1.15, seed: 8 },
  { p: [13.6, 2.4], variant: 'round', s: 1.0, seed: 9 },
  { p: [3.6, 11.6], variant: 'blossom', s: 1.0, seed: 10 },
  { p: [-3.7, 11.9], variant: 'fruit', s: 1.0, seed: 11 },
  { p: [-9.6, 9.9], variant: 'round', s: 1.05, seed: 12 },
]
/** Round stone-rimmed flower beds. */
export const TOWN_BEDS: { p: XZ; r: number; seed: number }[] = [
  { p: [11.0, 2.35], r: 0.7, seed: 21 },
  { p: [-2.4, 9.6], r: 0.6, seed: 22 },
  { p: [2.8, 9.4], r: 0.6, seed: 23 },
]
/** A picnic blanket on the south-east green (walk-over), and its basket. */
export const PICNIC = { p: [11.5, 7.7] as XZ, rot: 0.35, basket: [11.85, 7.55] as XZ }

// ── Colliders (world coordinates) ───────────────────────────────────────────
const circle = ([cx, cz]: XZ, r: number): Collider => ({ kind: 'circle', cx, cz, r })
const box = ([cx, cz]: XZ, w: number, d: number): Collider => ({ kind: 'box', cx, cz, w, d })
const local = ([cx, cz]: XZ, [x, z]: XZ): XZ => [cx + x, cz + z]

export function townColliders(): Collider[] {
  return [
    // house yard
    circle(HOUSE_YARD.pot, 0.3),
    circle(HOUSE_YARD.mailbox, 0.18),
    ...HOUSE_YARD.beds.map((b) => box([b.c[0], b.c[1] + 0.08], b.w + 0.1, b.d + 0.2)),
    ...HOUSE_YARD.veg.map((b) => box(b.c, b.w, b.d)),
    circle(HOUSE_YARD.scarecrow, 0.25),
    // schoolhouse yard + playground
    circle(SCHOOL_YARD.chalkboard, 0.42),
    circle(SCHOOL_YARD.flagpole, 0.2),
    box(SCHOOL_YARD.swings, 2.3, 1.1),
    box(SCHOOL_YARD.slide, 2.6, 0.75),
    // schoolhouse interior: student desks (+ chairs behind them), teacher's desk
    ...SCHOOL_DESKS.map(([x, z]) => box(local(SCHOOL_C, [x, z + 0.18]), 0.86, 0.85)),
    box(local(SCHOOL_C, SCHOOL_TEACHER_DESK), 1.3, 0.7),
    box(local(SCHOOL_C, SCHOOL_CUBBY), 0.45, 1.75),
    // library
    ...LIBRARY_YARD.columns.map((c) => circle(c, 0.24)),
    box(LIBRARY_YARD.bench, 0.6, 1.3),
    circle(LIBRARY_YARD.benchPlant, 0.22),
    ...LIBRARY_SHELVES.map((s) => box(local(LIBRARY_C, s.c), s.alongX ? s.w : 0.5, s.alongX ? 0.5 : s.w)),
    box(local(LIBRARY_C, LIBRARY_NOOK.table), 0.8, 0.8),
    box(local(LIBRARY_C, LIBRARY_NOOK.armchair), 0.85, 0.8),
    // town square & lanes
    box(NOTICE_BOARD, 1.3, 0.45),
    ...TOWN_LAMPS.map((p) => circle(p, 0.15)),
    ...TOWN_BENCHES.map((b) => circle(b.p, 0.6)),
    ...TOWN_TREES.map((t) => circle(t.p, 0.25 * t.s)),
    ...TOWN_BEDS.map((b) => circle(b.p, b.r + 0.1)),
    circle(PICNIC.basket, 0.25),
  ]
}
