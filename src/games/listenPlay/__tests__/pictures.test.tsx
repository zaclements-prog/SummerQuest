import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { Picture } from '../../../lib/problem'
import { PictureArt, PictureCard } from '../PictureCard'
import { cellSize, groupLayout } from '../groupLayout'
import { pictureLabel } from '../pictureLabel'
import { countAlongOffsets, countAlongText, numberWord } from '../../../lib/numberWords'
import { voiceText } from '../../../voice/registry'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
  document.body.innerHTML = ''
})

function render(ui: React.ReactNode) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  root = createRoot(el)
  act(() => root!.render(ui))
  return el
}

const EVERY_KIND: Picture[] = [
  { kind: 'numeral', n: 7 },
  { kind: 'group', count: 6, emoji: '🐞' },
  { kind: 'tenFrame', count: 13 },
  ...(['circle', 'square', 'triangle', 'rectangle', 'hexagon', 'oval', 'star', 'cube', 'sphere', 'cone', 'cylinder'] as const).map((shape): Picture => ({ kind: 'shape', shape })),
  { kind: 'letter', ch: 'b' },
  { kind: 'word', text: 'see' },
  { kind: 'emoji', emoji: '🚀' },
  { kind: 'clock', hour: 7, minute: 30 },
]

describe('pictures', () => {
  it('draws every Picture kind as inline SVG (nothing to download)', () => {
    for (const p of EVERY_KIND) {
      const el = render(<PictureArt picture={p} />)
      const svg = el.querySelector('svg')
      expect(svg, p.kind).not.toBeNull()
      expect(svg!.getAttribute('viewBox')).toMatch(/^0 0 \d+(\.\d+)? \d+(\.\d+)?$/)
      expect(el.querySelector('img, image')).toBeNull()
      act(() => root!.unmount())
      root = null
    }
  })

  it('draws the right number of things', () => {
    const el = render(<PictureArt picture={{ kind: 'group', count: 9, emoji: '🍪' }} />)
    expect(el.querySelectorAll('[data-obj]')).toHaveLength(9)
    act(() => root!.unmount())
    const tf = render(<PictureArt picture={{ kind: 'tenFrame', count: 13 }} />)
    expect(tf.querySelectorAll('circle')).toHaveLength(13)
  })

  it('a card is a big button named for its picture; a tried card ignores taps', () => {
    let picks = 0
    const el = render(
      <>
        <PictureCard picture={{ kind: 'numeral', n: 4 }} onPick={() => picks++} guideId="c0" />
        <PictureCard picture={{ kind: 'numeral', n: 5 }} onPick={() => picks++} state="tried" />
      </>,
    )
    const [a, b] = el.querySelectorAll('button')
    expect(a.getAttribute('aria-label')).toBe('4')
    expect(a.getAttribute('data-guide')).toBe('c0')
    expect(a.className).toMatch(/min-w-24/) // 96 px at the very least
    act(() => a.click())
    act(() => b.click())
    expect(picks).toBe(1)
  })

  it('a counted card shows its running count', () => {
    const el = render(<PictureCard picture={{ kind: 'group', count: 5 }} marks={{ 0: 1, 1: 2, 4: 3 }} />)
    expect(el.querySelector('.lp-count-bubble')?.textContent).toBe('3')
    expect(el.querySelectorAll('[data-marked]')).toHaveLength(3)
  })

  it('labels every kind for screen readers', () => {
    for (const p of EVERY_KIND) expect(pictureLabel(p)).toBeTruthy()
  })
})

describe('group layout', () => {
  it('lays out 0–20 things, each once, in reading order', () => {
    for (let n = 0; n <= 20; n++) {
      for (const aspect of [1, 4 / 3, 2]) {
        const L = groupLayout(n, aspect)
        expect(L.cells).toHaveLength(n)
        const keys = new Set(L.cells.map((c) => `${c.x},${c.y}`))
        expect(keys.size).toBe(n)
        for (const c of L.cells) {
          expect(c.x).toBeGreaterThan(0)
          expect(c.x).toBeLessThan(L.cols)
          expect(c.y).toBeLessThan(L.rows)
        }
        // reading order: row by row, left to right
        for (let i = 1; i < n; i++) {
          const a = L.cells[i - 1]
          const b = L.cells[i]
          if (n !== 5) expect(b.y > a.y || (b.y === a.y && b.x > a.x)).toBe(true)
        }
      }
    }
  })

  it('keeps the counting structure: 7 is 4 and 3 in a wide box, teens are rows of five', () => {
    expect(groupLayout(7, 2).cols).toBe(4)
    expect(groupLayout(10, 3).cols).toBe(5)
    expect(groupLayout(13, 1).cols).toBe(5)
    expect(groupLayout(13, 1).rows).toBe(3)
  })

  it('draws a group bigger in a square card than rows of five would', () => {
    const L = groupLayout(10, 1)
    expect(cellSize(L, 1)).toBeGreaterThan(cellSize({ cols: 5, rows: 2 }, 1))
  })
})

describe('number words', () => {
  it('says numbers the way the narrator does', () => {
    expect([0, 7, 13, 20, 42, 100, 115].map(numberWord)).toEqual(['zero', 'seven', 'thirteen', 'twenty', 'forty-two', 'one hundred', 'one hundred fifteen'])
    expect(countAlongText(3)).toBe('One, two, three.')
  })

  it('finds each number word in a count-along line (where its object lights up)', () => {
    const text = voiceText({ line: 'listen/count12' })
    const at = countAlongOffsets(text)
    expect(at).toHaveLength(12)
    expect(text.slice(at[10], at[10] + 6)).toBe('eleven')
  })
})
