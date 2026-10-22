import type { Lesson } from '../types'

// 5th grade (phase 3): Division Dunes. Motion scenes:
// src/tutoring/motion/scenes/g5Division.tsx (cue phrases come from these
// narration lines; keep them in sync when editing).
export const g5DivisionLesson: Lesson = {
  id: 'g5Division',
  zoneId: 'division-dunes',
  band: 'g5',
  skillIds: ['g5-div-long', 'g5-div-2digit', 'g5-div-remainders'],
  title: 'Long Division',
  emoji: '➗',
  intro: 'Divide big numbers one place at a time, and decide what a remainder means.',
  practiceStageId: 'g5-div-1',
  steps: [
    {
      id: 'setup',
      narration: "Long division splits a big number one place at a time. Let's divide six hundred seventy-two by twenty-eight. The twenty-eight goes outside the bar, and six hundred seventy-two goes inside.",
      body: '672 ÷ 28: the divisor 28 outside, the dividend 672 inside.',
      visual: { kind: 'longDivision', dividend: 672, divisor: 28 },
    },
    {
      id: 'estimate',
      narration: 'Twenty-eight does not fit in six, so look at sixty-seven. Twenty-eight is close to thirty, and thirty fits in sixty-seven two times. Two times twenty-eight is fifty-six. Sixty-seven minus fifty-six leaves eleven.',
      body: '28 fits in 67 two times: 67 − 56 = 11.',
      visual: { kind: 'longDivision', dividend: 672, divisor: 28, highlight: 2 },
      check: { question: 'In 672 ÷ 28, how many 28s fit in 67?', options: ['2', '3', '1', '6'], answer: '2', explain: '28 × 2 = 56 fits in 67, but 28 × 3 = 84 is too big.' },
    },
    {
      id: 'bringDown',
      narration: 'Bring down the two to make one hundred twelve. Twenty-eight fits in one hundred twelve four times, because four times twenty-eight is one hundred twelve. Nothing is left, so six hundred seventy-two divided by twenty-eight is twenty-four.',
      body: '112 ÷ 28 = 4, so 672 ÷ 28 = 24.',
    },
    {
      id: 'remainders',
      narration: 'Sometimes there is a remainder. One hundred fifty-seven students ride buses that hold twenty-four each: that is six remainder thirteen. Those thirteen students still need a seat, so we round up to seven buses. If a question asks only for full groups, we drop the remainder. If it asks what is left over, the remainder is the answer.',
      body: '157 ÷ 24 = 6 R 13: round up, drop it, or answer with it.',
      check: { question: 'A baker has 100 muffins and fills boxes of 12. How many boxes can she fill?', options: ['8', '9', '4', '8 R 4'], answer: '8', explain: '100 ÷ 12 = 8 R 4. Only full boxes count, so the 4 extra muffins are not another box.' },
    },
  ],
}
