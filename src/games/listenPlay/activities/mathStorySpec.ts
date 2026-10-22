import type { VoiceRef } from '../../../voice/types'
import type { ListenActivitySpec } from '../types'

/**
 * The `mathStory` activity's question (K.OA.1–5), as plain data (no React),
 * so providers and tests can build and read it: a tiny scene told line by
 * line, the things joining or leaving on screen in time with the voice, then
 * numeral cards. Add-and-Take Falls watches it happen; Story Woods acts it
 * out (`act`: the child taps the things to move them before the question).
 *
 * - `join` (add to): `a` at home, `b` more come in → a + b;
 * - `leave` (take from): `a` at home, `b` go → a − b;
 * - `together` (put together): `a` of one kind at home, `b` of another
 *   (`emoji2`) put in with them → a + b;
 * - `compare` (how many more): a row of `a` friends, `b` treats (`emoji2`),
 *   one under each friend in turn → a − b friends still waiting;
 * - `frame` (make ten): `a` in a ten-frame → 10 − a empty spots.
 *
 * 1st grade (Story Woods, 1.OA.1–2) adds the other unknowns, taking apart
 * and three groups, all acted out:
 *
 * - `joinChange` (add to, the change unknown): `a` at home, then "some more",
 *   then "now there are a + b": dashed spots up to the total; the child brings
 *   newcomers in (counting on) until they are full → b (the side holds
 *   `extra` more than are needed, so it's the spots that say when to stop);
 * - `leaveChange` (take from, the change unknown): `a` at home, "some went
 *   away", "now there are a − b": the child taps them away (counting back)
 *   until that many are left; the leavers wait at the side → b;
 * - `joinStart` (add to, the start unknown): "some" at home (unseen), `b`
 *   more come in, "now there are a + b": the spots the newcomers didn't
 *   fill are dashed → a (they pop in once it's found);
 * - `apart` (take apart): `a` of one kind and `b` of another (`emoji2`) at
 *   home, "a + b in all; a are this kind": the child takes the `a` out to the
 *   side → b;
 * - `three` (three addends): `a` at home, then `b` (`emoji2`) and `c`
 *   (`emoji3`) are put in → a + b + c.
 */
export type MathPlot = 'join' | 'leave' | 'together' | 'compare' | 'frame' | 'joinChange' | 'leaveChange' | 'joinStart' | 'apart' | 'three'

/** The backdrop. */
export type MathPlace = 'falls' | 'woods' | 'farm' | 'park' | 'beach' | 'garden' | 'snow' | 'tree' | 'kitchen' | 'night' | 'river' | 'lake' | 'room'

/** What the group sits in or on (drawn behind its spots). */
export type MathHome = 'log' | 'water' | 'patch' | 'branch' | 'basket' | 'nest' | 'box' | 'plate' | 'blanket' | 'frame' | 'sky'

/** How things move in and out (`melt`: leaving, they fade away where they are). */
export type MathMotion = 'hop' | 'swim' | 'fly' | 'float' | 'slide' | 'melt'

export interface MathStorySpec extends ListenActivitySpec {
  kind: 'mathStory'
  plot: MathPlot
  /** The group at the start (join / leave / together), the row of friends (compare), the spots filled (frame). */
  a: number
  /** How many join, leave or are put in; the treats (compare); the empty spots (frame: 10 − a). */
  b: number
  /** What is counted (the first kind). */
  emoji: string
  /** The second kind: put in with them (together), or given out (compare). */
  emoji2?: string
  place: MathPlace
  home: MathHome
  /** Story Woods: the story's character, standing by the group. */
  who?: string
  /** The other character: where newcomers come from, or where the leavers go. */
  friend?: string
  motion: MathMotion
  /** The story, line by line: how it starts (the group appears), then what happens (the change). */
  lines: readonly VoiceRef[]
  /** The question (the cards light up as it's asked). */
  ask: VoiceRef
  /**
   * Story Woods: after the change line, this prompt ("Tap each one to bring it
   * in!") and the child moves the things one tap at a time; the question
   * comes once they've all moved. Without it, they move by themselves.
   */
  act?: VoiceRef
  // ── 1st grade (Story Woods, phase 2b) ──
  /** `three`: the third group (`emoji3`). */
  c?: number
  /** `three`: the third kind. */
  emoji3?: string
  /** `joinChange`: more newcomers wait at the side than are needed (the dashed spots say when to stop). */
  extra?: number
  /** Written once the answer is found ("8 + 5 = 13"), the answer's number lit, and read aloud (`sentenceSaid`). */
  sentence?: readonly (number | '+' | '−' | '=')[]
  /** Where the answer is in `sentence`. */
  sentenceAnswerAt?: number
  /** The sentence read aloud as it appears ("Eight plus five equals thirteen."). */
  sentenceSaid?: VoiceRef
}

export const isMathStorySpec = (s: { kind: string } | undefined | null): s is MathStorySpec => s?.kind === 'mathStory'

/** The answer the scene shows. */
export function storyAnswer(s: Pick<MathStorySpec, 'plot' | 'a' | 'b'> & { c?: number }): number {
  switch (s.plot) {
    case 'join':
    case 'together':
      return s.a + s.b
    case 'leave':
    case 'compare':
      return s.a - s.b
    case 'frame':
      return 10 - s.a
    // 1st grade
    case 'joinChange':
    case 'leaveChange':
    case 'apart':
      return s.b
    case 'joinStart':
      return s.a
    case 'three':
      return s.a + s.b + (s.c ?? 0)
  }
}

/** How many things the child moves acting the story out (the change; taking apart: the known part; three groups: both). */
export function storyMoves(s: Pick<MathStorySpec, 'plot' | 'a' | 'b'> & { c?: number }): number {
  if (s.plot === 'apart') return s.a
  if (s.plot === 'three') return s.b + (s.c ?? 0)
  return s.b
}

/** How many lines tell the story before it's acted out (1st grade's unknowns and three groups say a third). */
export function storyLines(s: Pick<MathStorySpec, 'plot'>): number {
  return s.plot === 'joinChange' || s.plot === 'leaveChange' || s.plot === 'joinStart' || s.plot === 'three' ? 3 : 2
}

/** Guide ids inside the activity. */
export const MS_SCENE = 'ms-scene'
export const MS_HOME = 'ms-home'
export const MS_SIDE = 'ms-side'
/** 1st grade: the number sentence written once the answer is found. */
export const MS_SENTENCE = 'ms-sentence'
export const msObj = (k: number) => `ms-obj-${k}`

// ── layout (px in the scene's own box) ───────────────────────────────────────

export interface Pt {
  x: number
  y: number
}
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface StoryLayout {
  w: number
  h: number
  /** One thing's size (the same everywhere, so nothing changes size as it moves). */
  cell: number
  /** The home's box (its art) and its spots' centres, in reading order (`cols` × `rows`). */
  home: Rect
  cols: number
  rows: number
  spots: Pt[]
  /** Where the newcomers wait, or the leavers go to the friend (null: in and out at the right edge). */
  side: Rect | null
  sideSpots: Pt[]
  who: (Pt & { s: number }) | null
  friend: (Pt & { s: number }) | null
  /** Just past the right edge: where things come from and go to without a side. */
  offX: number
}

/** The home's spots: five to a row (the ten-frame's rows), or a row of friends over their treats. */
export function homeGrid(s: Pick<MathStorySpec, 'plot' | 'a' | 'b'> & { c?: number }): { cols: number; rows: number } {
  if (s.plot === 'frame') return { cols: 5, rows: 2 }
  if (s.plot === 'compare') return { cols: Math.max(1, s.a), rows: 2 }
  const n = Math.max(1, s.plot === 'leave' || s.plot === 'leaveChange' ? s.a : s.plot === 'three' ? s.a + s.b + (s.c ?? 0) : s.a + s.b)
  return { cols: Math.min(5, n), rows: Math.ceil(n / 5) }
}

/** Is there a side area: newcomers waiting to be tapped in, or a friend at the side? */
export function hasSide(s: Pick<MathStorySpec, 'plot' | 'act' | 'friend'>): boolean {
  if (s.friend) return true
  // (1st grade: the ones that went away, or were taken out, wait at the side to be counted)
  if (s.plot === 'leaveChange' || s.plot === 'apart') return true
  return !!s.act && s.plot !== 'leave' && s.plot !== 'frame'
}

/** How many spots the side holds (the newcomers waiting, or the leavers arriving at the friend). */
export function sideCount(s: Pick<MathStorySpec, 'plot' | 'a' | 'b'> & { c?: number; extra?: number }): number {
  if (s.plot === 'joinChange') return Math.max(0, s.b + (s.extra ?? 0))
  if (s.plot === 'apart' || s.plot === 'three') return storyMoves(s)
  return s.plot === 'frame' ? 0 : Math.max(0, s.b)
}

/** The biggest thing size (px): a thing never grows past this on a big screen. */
export const CELL_MAX = 132

/** `n` spots in `cols` columns, centred in `r`, `step` apart (rows centred too; a short last row centred). */
function gridIn(r: Rect, n: number, cols: number, step: number): Pt[] {
  const rows = Math.ceil(n / Math.max(1, cols))
  const out: Pt[] = []
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols)
    const inRow = row < rows - 1 ? cols : n - cols * (rows - 1)
    const c = i % cols
    out.push({
      x: r.x + r.w / 2 + (c - (inRow - 1) / 2) * step,
      y: r.y + r.h / 2 + (row - (rows - 1) / 2) * step,
    })
  }
  return out
}

/** How big a thing can be when `cols` × `rows` spots (`space` apart, in things) and a margin (in things) fit a `w` × `h` box. */
const fitCell = (w: number, h: number, cols: number, rows: number, space: number, margin: number) => Math.min(w / (cols * space + margin), h / (rows * space + margin))

/** The columns that draw `n` things biggest in a `w` × `h` box (at most `maxCols`), and that size. */
function bestCols(n: number, w: number, h: number, maxCols: number, space: number, margin: number): { cols: number; size: number } {
  let best = { cols: 1, size: 0 }
  for (let cols = 1; cols <= Math.max(1, Math.min(n, maxCols)); cols++) {
    const size = fitCell(w, h, cols, Math.ceil(n / cols), space, margin)
    if (size > best.size + 1e-6) best = { cols, size }
  }
  return best
}

/**
 * Where everything goes in a scene box `w` × `h` (px). Wide boxes put the
 * character on the left, the group in the middle and the side on the right;
 * tall ones put the character and the side in a band over the group.
 */
export function storyLayout(s: Pick<MathStorySpec, 'plot' | 'a' | 'b' | 'act' | 'who' | 'friend' | 'c' | 'extra'>, w: number, h: number): StoryLayout {
  const { cols, rows } = homeGrid(s)
  const side = hasSide(s)
  const nSide = side ? Math.max(1, sideCount(s)) : 0
  const m = Math.max(8, Math.min(w, h) * 0.04)
  const wide = w >= h * 1.15
  const SPACE = 1.1 // a spot is a little bigger than its thing

  let homeArea: Rect
  let sideArea: Rect | null = null
  let who: StoryLayout['who'] = null
  let friend: StoryLayout['friend'] = null

  if (wide) {
    const whoW = s.who ? Math.min(w * 0.17, h * 0.45) : 0
    const sideW = side ? w * 0.26 : 0
    const x0 = m + (whoW ? whoW + m * 0.5 : 0)
    const x1 = w - m - (sideW ? sideW + m * 0.5 : 0)
    homeArea = { x: x0, y: m, w: Math.max(40, x1 - x0), h: h - 2 * m }
    if (s.who) who = { x: m + whoW / 2, y: h - m - whoW * 0.55, s: whoW * 0.95 }
    if (side) {
      const fs = s.friend ? Math.min(sideW * 0.5, h * 0.3) : 0
      if (s.friend) friend = { x: w - m - sideW / 2, y: m + fs * 0.55, s: fs }
      sideArea = { x: w - m - sideW, y: m + (fs ? fs * 1.1 : 0), w: sideW, h: h - 2 * m - (fs ? fs * 1.1 : 0) }
    }
  } else {
    const band = s.who || side ? h * 0.32 : 0
    homeArea = { x: m, y: m + (band ? band + m * 0.5 : 0), w: w - 2 * m, h: h - 2 * m - (band ? band + m * 0.5 : 0) }
    if (band) {
      const ws = s.who ? Math.min(band * 0.92, w * 0.26) : 0
      const fs = s.friend ? Math.min(band * 0.7, w * 0.2) : 0
      if (s.who) who = { x: m + ws / 2, y: m + band / 2, s: ws }
      if (s.friend) friend = { x: w - m - fs / 2, y: m + fs * 0.55, s: fs }
      if (side) {
        const x0 = m + (ws ? ws + m : 0)
        const x1 = w - m - (fs ? fs + m * 0.5 : 0)
        sideArea = { x: x0, y: m, w: Math.max(40, x1 - x0), h: band }
      }
    }
  }

  // one size for everything: the home's spots and the side's (each with a little room around for its art)
  const HOME_MARGIN = 0.5
  const SIDE_MARGIN = 0.35
  let cell = fitCell(homeArea.w, homeArea.h, cols, rows, SPACE, HOME_MARGIN)
  let sideCols = 1
  if (sideArea) {
    const best = bestCols(nSide, sideArea.w, sideArea.h, wide ? 3 : 5, SPACE, SIDE_MARGIN)
    sideCols = best.cols
    cell = Math.min(cell, best.size)
  }
  cell = Math.max(24, Math.min(CELL_MAX, cell))
  const step = cell * SPACE

  // the home's box hugs its spots (a little room around them for its art), sitting low in its area
  const hw = cols * step + cell * HOME_MARGIN
  const hh = rows * step + cell * HOME_MARGIN
  const home: Rect = {
    x: homeArea.x + (homeArea.w - hw) / 2,
    y: homeArea.y + Math.max(0, (homeArea.h - hh) * (wide ? 0.62 : 0.5)),
    w: hw,
    h: hh,
  }
  const spots: Pt[] = []
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) spots.push({ x: home.x + hw / 2 + (c - (cols - 1) / 2) * step, y: home.y + hh / 2 + (r - (rows - 1) / 2) * step })

  let sideRect: Rect | null = null
  let sideSpots: Pt[] = []
  if (sideArea) {
    const sRows = Math.ceil(nSide / sideCols)
    const sw = sideCols * step + cell * SIDE_MARGIN
    const sh = sRows * step + cell * SIDE_MARGIN
    sideRect = { x: sideArea.x + (sideArea.w - sw) / 2, y: sideArea.y + (sideArea.h - sh) / 2, w: sw, h: sh }
    sideSpots = gridIn(sideRect, nSide, sideCols, step)
  }
  return { w, h, cell, home, cols, rows, spots, side: sideRect, sideSpots, who, friend, offX: w + cell }
}
