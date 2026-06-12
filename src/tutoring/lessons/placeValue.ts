import type { Lesson } from '../types'

export const placeValueLesson: Lesson = {
  id: 'placeValue',
  zoneId: 'place-value-plateau',
  skillIds: ['pv-identify', 'pv-round'],
  title: 'Place Value',
  emoji: '🔢',
  intro: 'Where a digit sits in a number tells you how much it is worth.',
  practiceStageId: 'pv-practice',
  steps: [
    {
      id: 'places',
      narration: 'Every digit sits in a special place. From the right, we have ones, then tens, then hundreds, then thousands. The place a digit sits in tells you its value.',
      body: 'Places: thousands · hundreds · tens · ones',
      visual: { kind: 'placeValueBlocks', thousands: 1, hundreds: 2, tens: 3, ones: 4 },
    },
    {
      id: 'value',
      narration: 'Look at the number one thousand two hundred thirty-four. The two is sitting in the hundreds place, so it is not just two. It really means two hundred.',
      body: 'In 1,234 the 2 is in the hundreds place → it means 200.',
    },
    {
      id: 'rounding',
      narration: 'To round to the nearest ten, look at the ones digit. If it is five or more, round up to the next ten. If it is less than five, round down and keep the ten you already have.',
      body: 'Ones digit 5 or more → round up. Less than 5 → round down.',
      visual: { kind: 'numberLine', min: 40, max: 50, markers: [40, 45, 50], target: 47 },
      check: { question: 'Round 47 to the nearest ten.', options: [50, 40, 47, 70], answer: 50, explain: 'Seven is five or more, so round up to fifty.' },
    },
  ],
}
