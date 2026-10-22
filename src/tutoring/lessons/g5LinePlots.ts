import type { Lesson } from '../types'

/**
 * 5th grade: line plots in fractions of a unit (5.MD.2) and graphing two
 * number patterns (5.OA.3), for Data Delta. Ten bean sprouts measured to the
 * eighth of an inch (heights in eighths: 2, 3, 3, 4, 4, 4, 5, 5, 6, 7) carry the
 * first three steps; four beakers are shared out equally; then patterns.
 */
export const g5LinePlotsLesson: Lesson = {
  id: 'g5LinePlots',
  band: 'g5',
  zoneId: 'data-delta',
  skillIds: ['g5-lineplots', 'g5-patterns'],
  title: 'Line Plots',
  emoji: '📈',
  intro: 'Plot measurements in fractions, add them up, share them out, and graph patterns.',
  practiceStageId: 'g5-data-1',
  steps: [
    {
      id: 'plot',
      narration: 'Scientists measured ten bean sprouts to the nearest eighth of an inch. A line plot puts an X above the number line for each measurement.',
      body: 'One X for each sprout, above its height.',
    },
    {
      id: 'read',
      narration: 'Count the Xs above a mark. Three sprouts were four eighths, or one half, of an inch tall. The tallest stack shows the most common height.',
      body: '3 sprouts were 4/8 = 1/2 inch tall: the most common height.',
      check: {
        question: 'How many sprouts were 3/8 inch tall?',
        options: [2, 3, 1, 10],
        answer: 2,
        explain: 'There are two Xs above 3/8.',
      },
    },
    {
      id: 'total',
      narration: 'To find a total, add the measurements. The two sprouts at five eighths of an inch add up to ten eighths, which is one and one fourth inches.',
      body: '5/8 + 5/8 = 10/8 = 1 1/4 inches.',
      check: {
        question: 'Two sprouts were 3/8 inch tall. What is their total height?',
        options: ['3/4 inch', '3/8 inch', '5/8 inch', '1 1/2 inches'],
        answer: '3/4 inch',
        explain: '3/8 + 3/8 = 6/8, which is 3/4 of an inch.',
      },
    },
    {
      id: 'share',
      narration:
        'Four beakers hold one fourth, one half, one half and three fourths of a liter. What if we shared the water equally? Add it all: two liters. Then divide by four beakers: each gets one half liter.',
      body: '1/4 + 1/2 + 1/2 + 3/4 = 2 liters. 2 ÷ 4 = 1/2 liter each.',
      check: {
        question: 'Three glasses hold 1/4, 1/2 and 3/4 cup of juice. Shared equally, how much does each glass get?',
        options: ['1/2 cup', '1 1/2 cups', '1/4 cup', '3/4 cup'],
        answer: '1/2 cup',
        explain: 'All the juice is 1 1/2 cups. Shared by 3 glasses, each gets 1/2 cup.',
      },
    },
    {
      id: 'patterns',
      narration:
        'Two patterns can make ordered pairs. Pattern A adds three: zero, three, six, nine. Pattern B adds six: zero, six, twelve, eighteen. Pair them up and plot them. The points make a line, and each B number is twice its A number.',
      body: '(0, 0), (3, 6), (6, 12), (9, 18): each B is 2 × A.',
      check: {
        question: 'Pattern A adds 2 and Pattern B adds 8, both from 0. How does each B term compare with its A term?',
        options: ['4 times as large', '6 more', '4 more', 'half as large'],
        answer: '4 times as large',
        explain: 'The pairs are (2, 8), (4, 16), (6, 24): each B is 4 times its A.',
      },
    },
  ],
}
