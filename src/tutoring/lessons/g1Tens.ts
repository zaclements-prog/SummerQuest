import type { Lesson } from '../types'
import type { PictureOption } from '../../lib/problem'
import { sayCard } from '../../games/listenPlay/activities/tensSpecs'

/** Numeral cards up to 120, named as they are tapped ("fifty-two!"), from Tens Plateau's own clips. */
const numeralCards = (ns: number[]): PictureOption[] => ns.map((n) => ({ value: n, picture: { kind: 'numeral', n }, speech: sayCard(n) }))

/**
 * 1st grade: tens and ones (1.NBT.2–3), for Tens Plateau. Ten cubes snap into
 * a rod: a ten. A number is its tens and its ones ("three tens and six ones
 * make thirty-six"), so to compare two numbers, look at the tens first, and
 * write it with a sign whose open side faces the bigger number. Voice-first:
 * the stage shows the blocks and numerals; the checks reuse Tens Plateau's
 * recorded lines (`g1-tens`), numeral cards and sign cards.
 */
export const g1TensLesson: Lesson = {
  id: 'g1Tens',
  band: 'g1',
  zoneId: 'place-value-plateau',
  skillIds: ['g1-tens-ones', 'g1-compare-2digit', 'g1-ten-more-less', 'g1-count-120'],
  title: 'Tens and Ones',
  emoji: '🔟',
  intro: 'Ten ones make a ten. Tens and ones make big numbers.',
  practiceStageId: 'g1-tens-1',
  steps: [
    {
      id: 'bundle',
      narration: 'Here are ten little cubes. Snap them together, and they make one rod. One rod is a ten!',
    },
    {
      id: 'build',
      narration: 'Three rods and six cubes. Ten, twenty, thirty. Thirty-one, thirty-two, thirty-three, thirty-four, thirty-five, thirty-six! Three tens and six ones make thirty-six.',
    },
    {
      id: 'count',
      narration: 'Your turn! Count the tens first. Then count on the ones.',
      check: {
        question: 'How many? Tap the number.',
        speech: { line: 'g1-tens/howManyPlain' },
        options: [25, 52, 7],
        answer: 52,
        explain: 'Five tens and two ones make fifty-two.',
        pictures: numeralCards([25, 52, 7]),
      },
    },
    {
      id: 'compare',
      narration: 'Forty-one or fourteen: which is bigger? Look at the tens first. Four tens beat one ten. Forty-one is bigger!',
    },
    {
      id: 'sign',
      narration: 'This sign means greater than. Its open side faces the bigger number. Your turn!',
      check: {
        question: 'Which sign goes in the box?',
        speech: { line: 'g1-tens/sign' },
        options: ['<', '>', '='],
        answer: '>',
        explain: 'Fifty-three is greater than thirty-five.',
        pictures: (['<', '>', '='] as const).map((s) => ({ value: s, picture: { kind: 'word', text: s }, speech: sayCard(s) })),
      },
    },
  ],
}
