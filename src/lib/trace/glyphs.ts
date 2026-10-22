import { A, L, M, movesPath, pointAlong, sampleMoves, type Move, type Pt, type SampledStroke } from './geometry'

/**
 * What a kindergartner traces in Writing Workshop: warm-up strokes, the
 * numerals 0–9 and the capital letters A–Z, hand-authored in ball-and-stick
 * manuscript (upright lines and circles, matching the Andika letters) in a
 * 100 × 100 box, y down.
 *
 * Letters and numerals stand on the writing lines: the top line at y = 10,
 * the dashed middle line at y = 50, the base line at y = 90. Strokes come in
 * school order and direction: lines from the top down and from left to
 * right; circles and C-curves counter-clockwise from about two o'clock
 * (Zaner-Bloser style ball-and-stick).
 *
 * Each stroke names what the voice says for it (`say`, a `k-trace/say-<id>`
 * line): a small vocabulary reused across glyphs ("Start at the top. Big line
 * down.", "Around like a C.").
 */

export const TOP = 10
export const MID = 50
export const BASE = 90

/** What the voice says for a stroke: `k-trace/say-<id>`. */
export const STROKE_PHRASES = {
  bigDown: 'Start at the top. Big line down.',
  littleDown: 'Little line down.',
  bigAcross: 'Big line across.',
  littleAcross: 'Little line across.',
  slantDown: 'Slant down.',
  slantDownUp: 'Slant down, then slant up.',
  slantInOut: 'Slant in, then slant out.',
  slantOut: 'Slant out.',
  downUpDownUp: 'Slant down, up, down, up!',
  acrossSlantAcross: 'Across, slant down, across.',
  aroundC: 'Around like a C.',
  aroundO: 'Around like a C. Keep going, all the way around!',
  bumpTop: 'Back to the top. Around for a bump.',
  bumpBottom: 'Around for another bump.',
  bigCurve: 'Back to the top. Big curve around.',
  hook: 'Line down, then hook around.',
  downAroundUp: 'Line down, around, and up.',
  snake: 'Curve around, then curve back, like a snake.',
  tail: 'Little slant for the tail.',
  zigzag: 'Zig, zag, zig, zag!',
  wave: 'Up and down, like a wave.',
  two: 'Around, slant down, then across.',
  three: 'Around and in. Around again.',
  downAcross: 'Line down, then across.',
  fiveBelly: 'Line down, then around for a big belly.',
  six: 'Curve down, and around.',
  seven: 'Line across, then slant down.',
  eight: 'Like an S, then back up to the top.',
  nine: 'Around like a C, then line down.',
} as const

export type StrokePhrase = keyof typeof STROKE_PHRASES

/**
 * 1st grade's lowercase letters (Writing Workshop, `g1-trace-1`) reuse the
 * phrases above where they fit ("Little line down.", "Around like a C.") and
 * add these (`g1-writing/say-<id>` lines).
 */
export const LOWER_PHRASES = {
  ballRight: 'Back up, and around the other way.',
  hump: 'Back up, and over for a hump.',
  hump2: 'Over again, for one more hump.',
  rCurve: 'Back up, and a little curve.',
  eLine: 'Little line across, then around like a C.',
  fHook: 'Curve over the top, then line down.',
  descDown: 'Line down, below the bottom line.',
  dot: 'Now a dot on top!',
  bigSlant: 'Big slant down, below the bottom line.',
  tStem: 'Start above the dashed line. Line down.',
} as const

export type LowerPhrase = keyof typeof LOWER_PHRASES

/** The voice line of a stroke's phrase: kindergarten's (`k-trace/say-*`) or 1st grade's (`g1-writing/say-*`). */
export function strokeLine(say: StrokePhrase | LowerPhrase): string {
  return say in STROKE_PHRASES ? `k-trace/say-${say}` : `g1-writing/say-${say}`
}

export interface StrokeDef {
  moves: Move[]
  say: StrokePhrase | LowerPhrase
}

export type GlyphKind = 'warmup' | 'digit' | 'letter' | 'lower'

/** Where a glyph's writing lines are (box units, y down): top, dashed middle, base, and (lowercase) the descender line. */
export interface Ruling {
  top: number
  mid: number
  base: number
  desc?: number
}

export interface GlyphDef {
  /** `down`, `circle` (warm-ups), `7`, `B`. */
  id: string
  kind: GlyphKind
  strokes: StrokeDef[]
}

/** A stroke ready to draw and check: its samples, the guide path, where it starts and ends. */
export interface Stroke extends StrokeDef {
  sampled: SampledStroke
  path: string
  start: Pt
  end: Pt
}

export interface Glyph extends Omit<GlyphDef, 'strokes'> {
  strokes: Stroke[]
  /** Letters and numerals stand on the writing lines; warm-ups float free. */
  lines: boolean
  /** Lowercase letters: their own lines (with room below for a tail); others use TOP, MID and BASE. */
  ruling?: Ruling
}

/** Sample spacing (box units): the check compares a trace against points this far apart. */
export const SAMPLE_SPACING = 2

const S = (say: StrokePhrase | LowerPhrase, ...moves: Move[]): StrokeDef => ({ say, moves })

// ── warm-ups (pre-writing strokes), easiest first ────────────────────────────

const WARMUP_DEFS: GlyphDef[] = [
  { id: 'down', kind: 'warmup', strokes: [S('bigDown', L(50, 12, 50, 88))] },
  { id: 'across', kind: 'warmup', strokes: [S('bigAcross', L(12, 50, 88, 50))] },
  { id: 'slantRight', kind: 'warmup', strokes: [S('slantDown', L(24, 12, 76, 88))] },
  { id: 'slantLeft', kind: 'warmup', strokes: [S('slantDown', L(76, 12, 24, 88))] },
  { id: 'circle', kind: 'warmup', strokes: [S('aroundO', A(50, 50, 36, 36, 45, 405))] },
  { id: 'curve', kind: 'warmup', strokes: [S('aroundC', A(54, 50, 36, 38, 45, 315))] },
  { id: 'zigzag', kind: 'warmup', strokes: [S('zigzag', L(10, 32, 30, 68, 50, 32, 70, 68, 90, 32))] },
  { id: 'wave', kind: 'warmup', strokes: [S('wave', A(23, 50, 13, 16, 180, 0), A(49, 50, 13, 16, 180, 360), A(75, 50, 13, 16, 180, 0))] },
]

// ── numerals 0–9 ─────────────────────────────────────────────────────────────

const DIGIT_DEFS: GlyphDef[] = [
  { id: '0', kind: 'digit', strokes: [S('aroundO', A(50, 50, 28, 40, 50, 410))] },
  { id: '1', kind: 'digit', strokes: [S('bigDown', L(50, TOP, 50, BASE))] },
  { id: '2', kind: 'digit', strokes: [S('two', A(50, 32, 23, 22, 155, -35), L(26, BASE, 76, BASE))] },
  { id: '3', kind: 'digit', strokes: [S('three', A(48, 30, 21, 20, 150, -90), A(48, 70, 24, 20, 90, -150))] },
  { id: '4', kind: 'digit', strokes: [S('downAcross', M(28, TOP), L(28, 62, 80, 62)), S('bigDown', L(64, TOP, 64, BASE))] },
  // (the line down runs into the belly: the arc starts where x = 32)
  { id: '5', kind: 'digit', strokes: [S('fiveBelly', M(32, TOP), A(48, 64, 26, 26, 128, -150)), S('littleAcross', L(32, TOP, 72, TOP))] },
  { id: '6', kind: 'digit', strokes: [S('six', A(62, 66, 36, 56, 90, 180), A(50, 66, 24, 24, 180, 540))] },
  { id: '7', kind: 'digit', strokes: [S('seven', L(24, TOP, 76, TOP, 42, BASE))] },
  { id: '8', kind: 'digit', strokes: [S('eight', A(50, 30, 19, 20, 30, 270), A(50, 70, 23, 20, 90, -270), A(50, 30, 19, 20, 270, 390))] },
  { id: '9', kind: 'digit', strokes: [S('nine', A(48, 30, 22, 20, 25, 360), L(70, BASE))] },
]

// ── capital letters A–Z ──────────────────────────────────────────────────────

/** The bump of P, R and the top of B: out along the top, around, back in to the middle line. */
const bump = (x: number, w: number, top: number, bottom: number) => {
  const r = (bottom - top) / 2
  return [L(x, top, x + w, top), A(x + w, top + r, r, r, 90, -90), L(x, bottom)]
}

const LETTER_DEFS: GlyphDef[] = [
  { id: 'A', kind: 'letter', strokes: [S('slantDown', L(50, TOP, 22, BASE)), S('slantDown', L(50, TOP, 78, BASE)), S('littleAcross', L(32, 62, 68, 62))] },
  {
    id: 'B',
    kind: 'letter',
    strokes: [S('bigDown', L(28, TOP, 28, BASE)), S('bumpTop', ...bump(28, 22, TOP, MID)), S('bumpBottom', ...bump(28, 26, MID, BASE))],
  },
  { id: 'C', kind: 'letter', strokes: [S('aroundC', A(52, 50, 38, 40, 45, 315))] },
  { id: 'D', kind: 'letter', strokes: [S('bigDown', L(28, TOP, 28, BASE)), S('bigCurve', L(28, TOP, 40, TOP), A(40, 50, 34, 40, 90, -90), L(28, BASE))] },
  {
    id: 'E',
    kind: 'letter',
    strokes: [S('bigDown', L(30, TOP, 30, BASE)), S('littleAcross', L(30, TOP, 72, TOP)), S('littleAcross', L(30, MID, 64, MID)), S('littleAcross', L(30, BASE, 72, BASE))],
  },
  { id: 'F', kind: 'letter', strokes: [S('bigDown', L(30, TOP, 30, BASE)), S('littleAcross', L(30, TOP, 72, TOP)), S('littleAcross', L(30, MID, 64, MID))] },
  { id: 'G', kind: 'letter', strokes: [S('aroundC', A(52, 50, 38, 40, 45, 360)), S('littleAcross', L(66, MID, 90, MID))] },
  { id: 'H', kind: 'letter', strokes: [S('bigDown', L(26, TOP, 26, BASE)), S('bigDown', L(74, TOP, 74, BASE)), S('littleAcross', L(26, MID, 74, MID))] },
  { id: 'I', kind: 'letter', strokes: [S('bigDown', L(50, TOP, 50, BASE)), S('littleAcross', L(34, TOP, 66, TOP)), S('littleAcross', L(34, BASE, 66, BASE))] },
  { id: 'J', kind: 'letter', strokes: [S('hook', L(62, TOP, 62, 68), A(44, 68, 18, 22, 0, -180))] },
  { id: 'K', kind: 'letter', strokes: [S('bigDown', L(30, TOP, 30, BASE)), S('slantInOut', L(72, TOP, 31, 52, 74, BASE))] },
  { id: 'L', kind: 'letter', strokes: [S('bigDown', L(32, TOP, 32, BASE)), S('littleAcross', L(32, BASE, 72, BASE))] },
  { id: 'M', kind: 'letter', strokes: [S('bigDown', L(18, TOP, 18, BASE)), S('slantDownUp', L(18, TOP, 50, 62, 82, TOP)), S('bigDown', L(82, TOP, 82, BASE))] },
  { id: 'N', kind: 'letter', strokes: [S('bigDown', L(24, TOP, 24, BASE)), S('slantDown', L(24, TOP, 76, BASE)), S('bigDown', L(76, TOP, 76, BASE))] },
  { id: 'O', kind: 'letter', strokes: [S('aroundO', A(50, 50, 40, 40, 45, 405))] },
  { id: 'P', kind: 'letter', strokes: [S('bigDown', L(28, TOP, 28, BASE)), S('bumpTop', ...bump(28, 22, TOP, MID))] },
  { id: 'Q', kind: 'letter', strokes: [S('aroundO', A(50, 50, 40, 40, 45, 405)), S('tail', L(60, 72, 84, 95))] },
  { id: 'R', kind: 'letter', strokes: [S('bigDown', L(28, TOP, 28, BASE)), S('bumpTop', ...bump(28, 22, TOP, MID)), S('slantOut', L(46, MID, 74, BASE))] },
  { id: 'S', kind: 'letter', strokes: [S('snake', A(50, 30, 22, 20, 30, 270), A(50, 70, 24, 20, 90, -150))] },
  { id: 'T', kind: 'letter', strokes: [S('bigDown', L(50, TOP, 50, BASE)), S('bigAcross', L(22, TOP, 78, TOP))] },
  { id: 'U', kind: 'letter', strokes: [S('downAroundUp', L(26, TOP, 26, 64), A(50, 64, 24, 26, 180, 360), L(74, TOP))] },
  { id: 'V', kind: 'letter', strokes: [S('slantDownUp', L(20, TOP, 50, BASE, 80, TOP))] },
  { id: 'W', kind: 'letter', strokes: [S('downUpDownUp', L(10, TOP, 30, BASE, 50, TOP, 70, BASE, 90, TOP))] },
  { id: 'X', kind: 'letter', strokes: [S('slantDown', L(24, TOP, 76, BASE)), S('slantDown', L(76, TOP, 24, BASE))] },
  { id: 'Y', kind: 'letter', strokes: [S('slantDown', L(24, TOP, 50, MID)), S('slantDown', L(76, TOP, 50, MID)), S('littleDown', L(50, MID, 50, BASE))] },
  { id: 'Z', kind: 'letter', strokes: [S('acrossSlantAcross', L(24, TOP, 76, TOP, 24, BASE, 76, BASE))] },
]

// ── lowercase letters a–z (1st grade) ────────────────────────────────────────

/**
 * Lowercase letters stand on their own writing lines, three equal spaces: the
 * top line (tall letters start here), the dashed middle line (small letters
 * start here: the x-height), the base line, and the descender line below it
 * (g, j, p, q and y hang their tails down to it). Ball-and-stick, school
 * order and direction: circles counter-clockwise from about two o'clock (a c
 * first), humps and bowls clockwise from the line (n, h, b, p), lines from the
 * top down; a dot last (i, j), a cross last (f, t).
 */
export const LOWER_RULING: Ruling = { top: 6, mid: 36, base: 66, desc: 96 }
const { top: LT, mid: LM, base: LB, desc: LD = 96 } = LOWER_RULING

/** The bowl of a, d, g, o and q: around like a c, from about two o'clock, all the way round. */
const bowl = (cx: number) => A(cx, 51, 14, 15, 40, 400)
/** i's and j's dot: a tiny stroke, done with a tap. */
const dotAt = (x: number) => L(x, 22.5, x, 25.5)

const LOWER_DEFS: GlyphDef[] = [
  { id: 'a', kind: 'lower', strokes: [S('aroundO', bowl(46)), S('littleDown', L(60, LM, 60, LB))] },
  { id: 'b', kind: 'lower', strokes: [S('bigDown', L(38, LT, 38, LB)), S('ballRight', A(52, 51, 14, 15, 180, -180))] },
  { id: 'c', kind: 'lower', strokes: [S('aroundC', A(52, 51, 14, 15, 45, 315))] },
  { id: 'd', kind: 'lower', strokes: [S('aroundO', bowl(46)), S('bigDown', L(60, LT, 60, LB))] },
  { id: 'e', kind: 'lower', strokes: [S('eLine', M(38, 51), L(66, 51), A(52, 51, 14, 15, 0, 315))] },
  { id: 'f', kind: 'lower', strokes: [S('fHook', A(56, 15, 8, 9, 15, 180), L(48, LB)), S('littleAcross', L(38, LM, 60, LM))] },
  { id: 'g', kind: 'lower', strokes: [S('aroundO', bowl(46)), S('hook', L(60, LM, 60, 84), A(48, 84, 12, 11, 0, -165))] },
  { id: 'h', kind: 'lower', strokes: [S('bigDown', L(36, LT, 36, LB)), S('hump', A(50, 50, 14, 14, 180, 0), L(64, LB))] },
  { id: 'i', kind: 'lower', strokes: [S('littleDown', L(50, LM, 50, LB)), S('dot', dotAt(50))] },
  { id: 'j', kind: 'lower', strokes: [S('hook', L(56, LM, 56, 84), A(44, 84, 12, 11, 0, -165)), S('dot', dotAt(56))] },
  { id: 'k', kind: 'lower', strokes: [S('bigDown', L(38, LT, 38, LB)), S('slantInOut', L(62, LM, 39, 53, 64, LB))] },
  { id: 'l', kind: 'lower', strokes: [S('bigDown', L(50, LT, 50, LB))] },
  {
    id: 'm',
    kind: 'lower',
    strokes: [S('littleDown', L(28, LM, 28, LB)), S('hump', A(39, 47, 11, 11, 180, 0), L(50, LB)), S('hump2', A(61, 47, 11, 11, 180, 0), L(72, LB))],
  },
  { id: 'n', kind: 'lower', strokes: [S('littleDown', L(36, LM, 36, LB)), S('hump', A(50, 50, 14, 14, 180, 0), L(64, LB))] },
  { id: 'o', kind: 'lower', strokes: [S('aroundO', A(50, 51, 14, 15, 45, 405))] },
  { id: 'p', kind: 'lower', strokes: [S('descDown', L(38, LM, 38, LD)), S('ballRight', A(52, 51, 14, 15, 180, -180))] },
  { id: 'q', kind: 'lower', strokes: [S('aroundO', bowl(46)), S('descDown', L(60, LM, 60, LD))] },
  { id: 'r', kind: 'lower', strokes: [S('littleDown', L(42, LM, 42, LB)), S('rCurve', A(56, 50, 14, 14, 180, 45))] },
  { id: 's', kind: 'lower', strokes: [S('snake', A(50, 43.5, 10, 7.5, 30, 270), A(50, 58.5, 11, 7.5, 90, -150))] },
  { id: 't', kind: 'lower', strokes: [S('tStem', L(50, 20, 50, LB)), S('littleAcross', L(38, LM, 62, LM))] },
  { id: 'u', kind: 'lower', strokes: [S('downAroundUp', L(36, LM, 36, 54), A(50, 54, 14, 12, 180, 360), L(64, LM)), S('littleDown', L(64, LM, 64, LB))] },
  { id: 'v', kind: 'lower', strokes: [S('slantDownUp', L(36, LM, 50, LB, 64, LM))] },
  { id: 'w', kind: 'lower', strokes: [S('downUpDownUp', L(26, LM, 37, LB, 50, LM, 63, LB, 74, LM))] },
  { id: 'x', kind: 'lower', strokes: [S('slantDown', L(37, LM, 63, LB)), S('slantDown', L(63, LM, 37, LB))] },
  { id: 'y', kind: 'lower', strokes: [S('slantDown', L(36, LM, 50, LB)), S('bigSlant', L(64, LM, 38, LD))] },
  { id: 'z', kind: 'lower', strokes: [S('acrossSlantAcross', L(37, LM, 63, LM, 37, LB, 63, LB))] },
]

function build(def: GlyphDef): Glyph {
  return {
    ...def,
    lines: def.kind !== 'warmup',
    ...(def.kind === 'lower' ? { ruling: LOWER_RULING } : {}),
    strokes: def.strokes.map((s) => {
      const sampled = sampleMoves(s.moves, SAMPLE_SPACING)
      return { ...s, sampled, path: movesPath(s.moves), start: sampled.pts[0], end: sampled.pts[sampled.pts.length - 1] }
    }),
  }
}

/** A kindergarten glyph: every stroke says one of kindergarten's phrases (`k-trace/say-*`). */
export type KGlyph = Omit<Glyph, 'strokes'> & { strokes: (Stroke & { say: StrokePhrase })[] }

export const WARMUPS = WARMUP_DEFS.map(build) as readonly KGlyph[]
export const DIGITS = DIGIT_DEFS.map(build) as readonly KGlyph[]
export const LETTERS = LETTER_DEFS.map(build) as readonly KGlyph[]
/** The lowercase letters a–z (1st grade). */
export const LOWER: readonly Glyph[] = LOWER_DEFS.map(build)

const BY_ID = new Map<string, Glyph>([...WARMUPS, ...DIGITS, ...LETTERS, ...LOWER].map((g) => [`${g.kind}:${g.id}`, g]))

/** A glyph by kind and id (`glyph('letter', 'B')`); throws on a typo. */
export function glyph(kind: GlyphKind, id: string): Glyph {
  const g = BY_ID.get(`${kind}:${id}`)
  if (!g) throw new Error(`no ${kind} glyph "${id}"`)
  return g
}

/** Kindergarten's glyphs: the warm-ups, the numerals and the capital letters (1st grade's lowercase are `LOWER`). */
export const ALL_GLYPHS: readonly KGlyph[] = [...WARMUPS, ...DIGITS, ...LETTERS]

/**
 * The capital letters by stroke family, the order Trace big letters teaches
 * them in: straight lines, then slants, then curves.
 */
export const LETTER_FAMILIES = {
  straight: ['L', 'T', 'I', 'E', 'F', 'H'],
  slant: ['A', 'K', 'M', 'N', 'V', 'W', 'X', 'Y', 'Z'],
  curve: ['C', 'O', 'Q', 'G', 'S', 'D', 'P', 'B', 'R', 'J', 'U'],
} as const

/** The warm-ups by kind, the order Warm-up lines teaches them in. */
export const WARMUP_FAMILIES = {
  lines: ['down', 'across'],
  slants: ['slantRight', 'slantLeft'],
  curves: ['circle', 'curve'],
  patterns: ['zigzag', 'wave'],
} as const

/**
 * The lowercase letters by stroke family, the order Trace little letters
 * deals them in: line letters, the c family (around like a c), humps and
 * bowls, slants.
 */
export const LOWER_FAMILIES = {
  lines: ['l', 'i', 't', 'j', 'f'],
  curves: ['c', 'o', 'a', 'd', 'g', 'q', 'e', 's'],
  humps: ['r', 'n', 'm', 'h', 'b', 'p', 'u'],
  slants: ['v', 'w', 'x', 'y', 'z', 'k'],
} as const

/** A stroke so short it is a dot (i's and j's): a tap on it is the stroke. */
export function isDotStroke(s: Pick<Stroke, 'sampled'>): boolean {
  return s.sampled.length < 6
}

/** The green start dot's radius (box units). */
export const DOT_R = 5.4

/**
 * Where a stroke's direction arrows go: a little way past the green dot,
 * and just past each sharp corner (the bottom of a V), each pointing the way
 * the stroke goes there.
 */
export function strokeArrows(s: Stroke): { p: Pt; dir: Pt }[] {
  const len = s.sampled.length
  // (a dot has no way to go: it's a tap)
  if (isDotStroke(s)) return []
  // (clear of the green dot and the guide's ring round it)
  const first = Math.min(len * 0.45, DOT_R + 14)
  const at = [first, ...s.sampled.corners.map((c) => c + 7).filter((c) => c < len - 5)]
  return at.map((d) => pointAlong(s.sampled, d))
}
