import type { ProblemVisual } from '../../lib/problem'
import type { Lesson } from '../types'

// Shared by both steps so the check question has the graph it asks about.
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
      id: 'bars',
      narration: 'A bar graph shows amounts using bars. Each bar stands for one thing, and the taller a bar is, the bigger its number. A short bar means a small number.',
      body: 'Taller bar = bigger number.',
      visual: FRUIT_GRAPH,
    },
    {
      // BarChart has no side scale: it prints each bar's value just above the bar.
      id: 'read',
      narration: 'To read a bar, look at the number right on top of it. That number tells you the amount for that bar. To compare, look at the heights. The tallest bar has the biggest number.',
      body: 'Read the number on top of the bar. Tallest bar = most.',
      visual: FRUIT_GRAPH,
      check: { question: 'Which fruit sold the most?', options: ['Plum', 'Apple', 'Pear', 'Same'], answer: 'Plum', explain: "Plum's bar is the tallest, and the number on top of it is 8." },
    },
  ],
}
