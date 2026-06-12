import type { Lesson } from '../types'

export const measurementLesson: Lesson = {
  id: 'measurement',
  zoneId: 'measurement-marsh',
  skillIds: ['meas-area', 'meas-perimeter', 'meas-time', 'meas-money'],
  title: 'Measurement',
  emoji: '📏',
  intro: 'Measuring tells us how big, how far around, what time, and how much money.',
  practiceStageId: 'meas-practice',
  steps: [
    {
      id: 'area',
      narration: 'Area is the amount of space inside a shape. You can count all the little squares that fit inside, or you can take a shortcut and multiply the length times the width.',
      body: 'Area = length × width. A 4 by 3 rectangle has 4 × 3 = 12 squares.',
      visual: { kind: 'shape', type: 'rect', width: 4, height: 3, unit: 'cm' },
      check: { question: 'What is the area of a 4 by 3 rectangle?', options: [12, 7, 14, 9], answer: 12, explain: 'Four times three is twelve square units.' },
    },
    {
      id: 'perimeter',
      narration: 'Perimeter is the distance all the way around the edge of a shape, like walking around the outside of a yard. To find it, add up the length of every single side.',
      body: 'Perimeter = add up all the sides.',
    },
    {
      id: 'time',
      narration: 'On a clock, the short hand points to the hour, and the long hand points to the minutes. When the long hand is on the three, it is fifteen minutes past the hour.',
      body: 'Short hand = hour. Long hand = minutes.',
      visual: { kind: 'clock', hour: 3, minute: 15 },
    },
    {
      id: 'money',
      narration: 'When you count money, count the dollars first, and then count the cents. Putting them together tells you the total amount.',
      body: '$1.75 means 1 dollar and 75 cents.',
      visual: { kind: 'money', cents: 175 },
    },
  ],
}
