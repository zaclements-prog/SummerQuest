import type { PictureOption } from '../../lib/problem'
import type { Lesson } from '../types'
import { numeralCards } from './k1Voice'

/** A clock card: the kit's analog clock, said as it is tapped ("Half past 7!"). */
const clockCard = (hour: number, half: boolean): PictureOption => ({
  value: `${hour}:${half ? '30' : '00'}`,
  picture: { kind: 'clock', hour, minute: half ? 30 : 0 },
  speech: { template: half ? 'g1-measure/halfPast' : 'g1-measure/oclock', slots: { hour } },
})

/**
 * 1st grade: measuring and time (1.MD.1–3), for Measure Marsh. Line things up
 * at the start and look at the ends to put them in order; lay paper clips end
 * to end, with no gaps and no overlaps, and count them; on a clock the short
 * hand shows the hour, and the long hand points up to 12 at o'clock and down
 * to 6 at half past, when the short hand has gone halfway to the next number.
 * Voice-first: the stage draws everything (the same ribbons, clips and clocks
 * as the stages), and the two checks are picture cards, asked with the
 * stages' own lines.
 */
export const g1MeasureLesson: Lesson = {
  id: 'g1Measure',
  band: 'g1',
  zoneId: 'measurement-marsh',
  skillIds: ['g1-measure-order', 'g1-measure-units', 'g1-time'],
  title: 'Measure and Tell Time',
  emoji: '🕒',
  intro: 'Put lengths in order, measure with paper clips, and tell time to the hour and half hour.',
  practiceStageId: 'g1-measure-1',
  steps: [
    {
      id: 'order',
      narration: 'Line them up at the start. Look at the ends. Longest first, then the next one, then the shortest!',
    },
    {
      id: 'clips',
      narration: 'Lay paper clips end to end. No gaps, and no overlaps. This pencil is five clips long. Your turn!',
      check: {
        // (Measure Marsh's own question line: no new clip)
        question: 'How many paper clips long is the ribbon?',
        speech: { template: 'g1-measure/howManyLong', slots: { units: 'paper clips', thing: 'ribbon' } },
        options: [2, 3, 4],
        answer: 3,
        explain: 'Three paper clips, end to end. The ribbon is three paper clips long.',
        pictures: numeralCards([2, 3, 4]),
        countAlong: 3,
      },
    },
    {
      id: 'clock',
      narration: "This is a clock. The short hand shows the hour. The long hand points up to twelve. It is three o'clock!",
    },
    {
      id: 'halfPast',
      narration: 'Now the long hand goes down to six. The short hand moves halfway to four. It is half past three! Your turn!',
      check: {
        question: 'Tap the clock that shows half past 7.',
        speech: { template: 'g1-measure/tapHalf', slots: { hour: 7 } },
        options: ['7:30', '8:30', '7:00'],
        answer: '7:30',
        explain: 'The long hand points down to six, and the short hand is just past seven. It is half past seven.',
        pictures: [clockCard(7, true), clockCard(8, true), clockCard(7, false)],
      },
    },
  ],
}
