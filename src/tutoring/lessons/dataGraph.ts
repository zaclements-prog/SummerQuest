import type { ProblemVisual } from '../../lib/problem'
import type { Lesson } from '../types'

// One data set for the whole lesson (tallied, graphed, read, compared), so the
// check questions always have the graph they ask about.
const FRUIT_GRAPH: ProblemVisual = {
  kind: 'barGraph',
  title: 'Fruit sold',
  bars: [{ label: 'Apple', value: 5 }, { label: 'Pear', value: 3 }, { label: 'Plum', value: 8 }],
}

export const dataGraphLesson: Lesson = {
  id: 'dataGraph',
  zoneId: 'data-delta',
  skillIds: ['data-graphs'],
  title: 'Reading Graphs',
  emoji: '📊',
  intro: 'A graph turns numbers into a picture so they are easy to compare.',
  practiceStageId: 'data-compare',
  steps: [
    {
      id: 'tally',
      narration: 'To collect data, make one tally mark for each fruit sold. The fifth mark crosses the other four, making a bundle of five. Count the bundle as five, then six, seven, eight. Eight plums!',
      body: 'A bundle of tally marks = 5. Plums: 5 + 3 = 8.',
    },
    {
      id: 'bars',
      narration: 'A bar graph shows amounts using bars. Each bar stands for one thing, and the taller a bar is, the bigger its number. A short bar means a small number.',
      body: 'Taller bar = bigger number.',
      visual: FRUIT_GRAPH,
    },
    {
      // The motion graphic draws a side scale, so kids read a bar the standard
      // way: from its top straight across to the numbers.
      id: 'read',
      narration: 'To read a bar, find its top, then slide straight across to the numbers on the side. The apple bar lines up with five, so five apples were sold. The tallest bar shows the biggest number.',
      body: 'Slide across from the top of a bar to read its number. Tallest bar = most.',
      visual: FRUIT_GRAPH,
      check: { question: 'Which fruit sold the most?', options: ['Plum', 'Apple', 'Pear', 'Same'], answer: 'Plum', explain: "Plum's bar is the tallest, and its top lines up with 8." },
    },
    {
      id: 'compare',
      narration: 'How many more plums were sold than apples? Draw a line across from the top of the apple bar. The plum bar reaches three spaces higher: six, seven, eight. Eight minus five equals three!',
      body: 'Line up the tops: 8 − 5 = 3 more plums.',
      visual: FRUIT_GRAPH,
      check: { question: 'How many more apples were sold than pears?', options: [2, 8, 3, 5], answer: 2, explain: 'The apple bar reaches 5 and the pear bar reaches 3. Five minus three equals two.' },
    },
  ],
}
