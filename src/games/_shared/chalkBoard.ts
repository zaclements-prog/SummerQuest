/** Usable width inside the board's green panel, for fitting the equation. */
export const BOARD_W = 2.96

/** Chalk pitch that fits `text` inside `panel` (w sized, gap kept proportional). */
export function fitChalk(text: string, panel = BOARD_W) {
  const n = Math.max(1, text.length)
  const w = Math.min(0.24, panel / (n + 0.45 * (n - 1)))
  return { w, gap: w * 0.45 }
}
