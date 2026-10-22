import type { PictureOption } from '../../lib/problem'
import type { Lesson } from '../types'
import { askAloud } from './k1Voice'

/**
 * Kindergarten: measuring by comparing (K.MD.1–2). Two snakes slide to the
 * same start line, and then the one that goes further is longer; two towers
 * stand on the same ground, and then the one that goes higher is taller; on
 * a scale, the heavy side goes down. Voice-first: the stage draws everything
 * (the same snakes, towers and scale as Measure Marsh), and the checks are
 * answered with picture cards. "Line them up at the start" is the method the
 * Measure Marsh help says after a miss, too.
 */
const card = (value: string, emoji: string): PictureOption => ({ value, picture: { kind: 'emoji', emoji }, speech: { line: `k-measure/${value}` } })

export const kMeasureLesson: Lesson = {
  id: 'kMeasure',
  band: 'k1',
  zoneId: 'measurement-marsh',
  skillIds: ['k-measure-length', 'k-measure-height', 'k-measure-weight'],
  title: 'Long, Tall, Heavy',
  emoji: '📏',
  intro: 'Line them up at the start. The heavy side of a scale goes down.',
  practiceStageId: 'k-measure-1',
  steps: [
    {
      id: 'lineUp',
      narration: "Look at the two snakes. Let's line them up at the start. Now look at the ends. This snake is longer!",
    },
    {
      id: 'yourTurn',
      narration: 'Your turn! A snake and a caterpillar. They start at the same place.',
      check: {
        question: 'Which one is longer? Tap it!',
        speech: askAloud('kMeasure', 'yourTurn'),
        options: ['caterpillar', 'snake'],
        answer: 'snake',
        explain: 'They start at the same place, and the snake goes further. The snake is longer.',
        pictures: [card('caterpillar', '🐛'), card('snake', '🐍')],
      },
    },
    {
      id: 'tall',
      narration: 'Now two towers. One stands on a box. Stand them on the same ground. This tower is taller!',
    },
    {
      id: 'heavy',
      narration: 'This is a scale. The heavy side goes down. The light side goes up!',
      check: {
        question: 'Which one is heavier? Tap it!',
        // (Measure Marsh's own question line: no new clip)
        speech: { line: 'k-measure/whichHeavier' },
        options: ['strawberry', 'watermelon'],
        answer: 'watermelon',
        explain: 'The watermelon side goes down. The watermelon is heavier.',
        pictures: [card('strawberry', '🍓'), card('watermelon', '🍉')],
      },
    },
  ],
}
