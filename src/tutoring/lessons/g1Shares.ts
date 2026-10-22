import type { Lesson } from '../types'
import type { PictureOption } from '../../lib/problem'
import { shareArtName, type ShareCut } from '../../games/listenPlay/shareGeometry'

/** A pizza cut this way (maybe one share coloured in), said as it is tapped. */
const pizza = (value: string, cut: ShareCut, said: string, colored?: number): PictureOption => ({
  value,
  picture: { kind: 'art', name: shareArtName({ thing: 'pizza', cut, colored, turn: 0 }) },
  speech: { line: `g1-shares/${said}` },
})

/**
 * 1st grade: equal shares (1.G.3), for Fair Share Falls. Fair shares are the
 * same size: equal shares. Two equal shares are halves; cut each half again
 * and there are four: fourths (quarters). More equal shares make smaller
 * shares. Voice-first: the stage cuts a pizza as it is told; the checks are
 * answered with Fair Share Falls' own pizza drawings and reuse its lines.
 */
export const g1SharesLesson: Lesson = {
  id: 'g1Shares',
  band: 'g1',
  zoneId: 'fraction-falls',
  skillIds: ['g1-shares-equal', 'g1-shares-halves', 'g1-shares-size'],
  title: 'Fair Shares',
  emoji: '🍕',
  intro: 'Equal shares are the same size: halves and fourths.',
  practiceStageId: 'g1-shares-1',
  steps: [
    {
      id: 'fair',
      narration: 'Two friends share one pizza. Is this fair? No! One share is too big. Fair shares are the same size. They are equal shares!',
    },
    {
      id: 'halves',
      narration: 'Two equal shares are called halves. Each share is one half. Your turn!',
      check: {
        question: 'Which pizza is cut in half?',
        speech: { template: 'g1-shares/halves', slots: { thing: 'pizza' } },
        options: ['u2', 'q4', 'h2'],
        answer: 'h2',
        explain: 'Two equal shares: halves.',
        pictures: [pizza('u2', 'u2', 'cardUnequal2'), pizza('q4', 'q4', 'cardFourths'), pizza('h2', 'h2', 'cardHalves')],
      },
    },
    {
      id: 'fourths',
      narration: 'Now cut each half again. Four equal shares! They are called fourths, or quarters.',
    },
    {
      id: 'smaller',
      narration: 'More shares make smaller shares. A fourth is smaller than a half. Your turn!',
      check: {
        question: 'Which blue share is smaller?',
        speech: { line: 'g1-shares/smaller' },
        options: ['half', 'fourth'],
        answer: 'fourth',
        explain: 'A fourth is smaller than a half.',
        pictures: [pizza('half', 'h2', 'nameHalf', 0), pizza('fourth', 'q4', 'nameFourth', 1)],
      },
    },
  ],
}
