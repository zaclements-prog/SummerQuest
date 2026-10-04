import { describe, it, expect } from 'vitest'
import { heuristicFeedback } from '../writingGrader'

describe('offline writing grader', () => {
  it('gives a careful, complete answer all 3 stars', () => {
    const fb = heuristicFeedback(
      'My favorite summer day was when we went to the beach and built a huge sandcastle with a moat.',
      6,
    )
    expect(fb.stars).toBe(3)
    expect(fb.score).toBeGreaterThanOrEqual(85)
  })

  it('can award 3 stars on the longer paragraph and story stages too', () => {
    const para =
      'Last summer my family drove to the mountains. We hiked up a steep trail and saw a deer drinking from a stream. ' +
      'At the top we ate sandwiches and watched hawks circle over the valley. I was tired, but it was the best day of the trip.'
    expect(heuristicFeedback(para, 30).stars).toBe(3)
  })

  it('does not reward keyboard mashing or repeating one word', () => {
    expect(heuristicFeedback('asdf asdf asdf asdf asdf asdf', 6).stars).toBeLessThanOrEqual(1)
    expect(heuristicFeedback('sdfg hjkl qwrt zxcv bnmk ghjk', 6).stars).toBeLessThanOrEqual(1)
  })

  it('scores short answers low and suggests writing more', () => {
    const fb = heuristicFeedback('I like dogs.', 30)
    expect(fb.stars).toBeLessThanOrEqual(1)
    expect(fb.improvements.join(' ')).toMatch(/at least 30 words/)
  })

  it('always returns finite numbers', () => {
    for (const t of ['', '   ', '!!!', 'a']) {
      const fb = heuristicFeedback(t, 6)
      expect(Number.isFinite(fb.score)).toBe(true)
      expect(Number.isFinite(fb.stars)).toBe(true)
    }
  })
})
