/**
 * How a group of N things is laid out to count: in rows a 5-year-old can
 * take in (dice patterns up to 5; even rows after that, so 7 reads as "4 and
 * 3"; teen numbers in rows of five, the ten-frame structure). Positions are
 * cell centres in cell units (a cell is one object wide); the order is
 * reading order, which is also the order a count-along lights them in.
 *
 * `aspect` (box width ÷ height) picks, for 6–10, the row length that draws the
 * objects biggest in that box: 5 + 5 in a wide panel, 4 + 3 + 3 in a square card.
 */

export interface GroupLayout {
  cols: number
  rows: number
  cells: { x: number; y: number }[]
}

function rowsOf(sizes: number[], cols: number): GroupLayout {
  const cells: GroupLayout['cells'] = []
  sizes.forEach((n, r) => {
    const off = (cols - n) / 2
    for (let c = 0; c < n; c++) cells.push({ x: off + c + 0.5, y: r + 0.5 })
  })
  return { cols, rows: sizes.length, cells }
}

/** `n` in `rows` rows as even as can be, longer rows first (10 in 3 → 4, 3, 3). */
function balanced(n: number, rows: number): number[] {
  const base = Math.floor(n / rows)
  const extra = n % rows
  return Array.from({ length: rows }, (_, r) => base + (r < extra ? 1 : 0))
}

/** How big one object is when `L` is fitted into a box of this aspect (height 1). */
export function cellSize(L: Pick<GroupLayout, 'cols' | 'rows'>, aspect: number): number {
  return Math.min(aspect / L.cols, 1 / L.rows)
}

export function groupLayout(n: number, aspect = 2): GroupLayout {
  const count = Math.max(0, Math.floor(n))
  switch (count) {
    case 0:
      return { cols: 1, rows: 1, cells: [] }
    case 1:
      return rowsOf([1], 1)
    case 2:
      return rowsOf([2], 2)
    case 3:
      return aspect < 1.2 ? rowsOf([2, 1], 2) : rowsOf([3], 3)
    case 4:
      return rowsOf([2, 2], 2)
    case 5:
      // the dice five
      return {
        cols: 3,
        rows: 3,
        cells: [
          { x: 0.5, y: 0.5 },
          { x: 2.5, y: 0.5 },
          { x: 1.5, y: 1.5 },
          { x: 0.5, y: 2.5 },
          { x: 2.5, y: 2.5 },
        ],
      }
  }
  if (count > 10) {
    const sizes: number[] = []
    for (let left = count; left > 0; left -= 5) sizes.push(Math.min(5, left))
    return rowsOf(sizes, 5)
  }
  // 6–10: the canonical rows first (3+3, 4+3, 4+4, 3+3+3, 5+5), then any
  // other row length that draws them bigger in this box
  const canonical = count === 9 ? 3 : count === 10 ? 5 : count === 6 ? 3 : 4
  let best = rowsOf(balanced(count, Math.ceil(count / canonical)), canonical)
  for (const cols of [4, 5, 3]) {
    const rows = Math.ceil(count / cols)
    const sizes = balanced(count, rows)
    const L = rowsOf(sizes, Math.max(...sizes))
    if (cellSize(L, aspect) > cellSize(best, aspect) + 1e-9) best = L
  }
  return best
}
