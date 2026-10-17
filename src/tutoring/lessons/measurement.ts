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
      narration: 'Area is the amount of space inside a shape. You can count all the little squares that fit inside, or take a shortcut and multiply the length times the width. Four times three equals twelve!',
      body: 'Area = length × width. A 4 by 3 rectangle has 4 × 3 = 12 squares.',
      visual: { kind: 'shape', type: 'rect', width: 4, height: 3, unit: 'cm' },
      // A new size (not the 4 by 3 just shown); 7 = adding instead of multiplying.
      check: { question: 'What is the area of a 5 by 2 rectangle?', options: [10, 7, 14, 12], answer: 10, explain: 'Five times two equals ten, so ten little squares fit inside.' },
    },
    {
      id: 'perimeter',
      narration: 'Perimeter is the distance all the way around a shape, like walking around the edge of a yard. Add up every side: four plus three plus four plus three equals fourteen.',
      body: 'Perimeter = add up all the sides. 4 + 3 + 4 + 3 = 14.',
      visual: { kind: 'shape', type: 'rect', width: 4, height: 3 },
      // 12 = the area (inside, not around); 8 = only two of the four sides.
      check: { question: 'What is the perimeter of a 6 by 2 rectangle?', options: [16, 12, 8, 14], answer: 16, explain: 'Six plus two plus six plus two equals sixteen.' },
    },
    {
      // 8:15, not 3:15: at 3:15 both hands sit on the 3, which hides the lesson.
      id: 'time',
      narration: 'On a clock, the short hand points to the hour. The long hand points to the minutes, and it counts by fives: five, ten, fifteen. The short hand is just past the eight, so it is eight fifteen!',
      body: 'Short hand = hour. Long hand = minutes. This clock says 8:15.',
      visual: { kind: 'clock', hour: 8, minute: 15 },
    },
    {
      id: 'money',
      narration: 'When you count money, count the dollars first: one dollar. Then count the cents: twenty-five, fifty, seventy-five. Put them together, and you have one dollar and seventy-five cents!',
      body: '$1.75 means 1 dollar and 75 cents.',
      visual: { kind: 'money', cents: 175 },
    },
  ],
}
