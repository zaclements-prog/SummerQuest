import { describe, it, expect } from 'vitest'
import { visualSize } from '../visualSize'
import type { ProblemVisual } from '../../lib/problem'

const array = (rows: number): ProblemVisual => ({ kind: 'array', rows, cols: 4 }) as ProblemVisual

describe('visualSize', () => {
  it('draws small on a phone held sideways', () => {
    expect(visualSize(array(2), true, true)).toBe('sm')
  })
  it('keeps a short array full size beside the answers', () => {
    expect(visualSize(array(6), false, true)).toBe('md')
  })
  it('shrinks a tall array beside the answers so it stays above the fold', () => {
    expect(visualSize(array(10), false, true)).toBe('sm')
  })
  it('keeps tall arrays full size when stacked (a tablet held upright)', () => {
    expect(visualSize(array(10), false, false)).toBe('md')
  })
})
