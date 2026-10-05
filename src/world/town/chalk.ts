import type { Inst } from './kit'

/** Seven-segment strokes per glyph (a top, b/c right, d bottom, e/f left, g middle). */
const GLYPHS: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd',
  '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
  A: 'abcefg', b: 'cdefg', C: 'adef', d: 'bcdeg', E: 'adefg',
}

/**
 * Chunky chalk lettering from little sticks (seven-segment style), for
 * chalkboards — no fonts needed. Returns instances for a unit box, centered on
 * (x, y) in the board's plane (z), laid out left to right.
 */
export function chalkText(
  text: string,
  { x = 0, y = 0, z = 0, w = 0.1, h = 0.2, t = 0.025, gap = 0.06, color }: { x?: number; y?: number; z?: number; w?: number; h?: number; t?: number; gap?: number; color?: string },
): Inst[] {
  const out: Inst[] = []
  const pitch = w + gap
  const x0 = x - ((text.length - 1) * pitch) / 2
  const hz = (cx: number, cy: number, len = w): Inst => ({ x: cx, y: cy, z, s: [len + t, t, t], color })
  const vt = (cx: number, cy: number, len = h / 2): Inst => ({ x: cx, y: cy, z, s: [t, len + t * 0.5, t], color })
  ;[...text].forEach((ch, i) => {
    const cx = x0 + i * pitch
    if (ch === '+') {
      out.push(hz(cx, y), vt(cx, y, w))
      return
    }
    if (ch === '=') {
      out.push(hz(cx, y + h / 8), hz(cx, y - h / 8))
      return
    }
    for (const seg of GLYPHS[ch] ?? '') {
      if (seg === 'a') out.push(hz(cx, y + h / 2))
      if (seg === 'g') out.push(hz(cx, y))
      if (seg === 'd') out.push(hz(cx, y - h / 2))
      if (seg === 'b') out.push(vt(cx + w / 2, y + h / 4))
      if (seg === 'c') out.push(vt(cx + w / 2, y - h / 4))
      if (seg === 'e') out.push(vt(cx - w / 2, y - h / 4))
      if (seg === 'f') out.push(vt(cx - w / 2, y + h / 4))
    }
  })
  return out
}
