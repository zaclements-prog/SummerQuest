import type { Lesson } from '../types'

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
      visual: { kind: 'barGraph', title: 'Fruit sold', bars: [{ label: 'Apple', value: 5 }, { label: 'Pear', value: 3 }, { label: 'Plum', value: 8 }] },
    },
    {
      id: 'read',
      narration: 'To read a bar, look at how high its top reaches, then slide across to the scale on the side. That number tells you the amount for that bar.',
      body: 'Find the top of the bar, then read the side scale.',
      check: { question: 'Which fruit sold the most?', options: ['Plum', 'Apple', 'Pear', 'Same'], answer: 'Plum', explain: "Plum's bar is the tallest at eight." },
    },
  ],
}
