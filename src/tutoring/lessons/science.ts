import type { Lesson } from '../types'

export const scienceLesson: Lesson = {
  id: 'science',
  zoneId: 'science-summit',
  skillIds: ['sci-explore'],
  title: 'Science',
  emoji: '🔬',
  intro: 'Science helps us explore how the world around us works.',
  practiceStageId: 'science-4th',
  steps: [
    {
      id: 'states',
      narration: 'Matter comes in three states: solid, liquid, and gas. A solid keeps its own shape. A liquid flows and takes the shape of whatever cup you pour it into. A gas spreads out to fill all the space it can.',
      body: 'Three states of matter: solid · liquid · gas.',
    },
    {
      id: 'water',
      narration: 'Water is amazing because it can be all three states. When it is frozen, ice is a solid. When you pour it, water is a liquid. And when it boils away, steam is a gas.',
      body: 'Ice = solid. Water = liquid. Steam = gas.',
      check: { question: 'Which one is a liquid?', options: ['Ice', 'Water', 'Steam', 'Rock'], answer: 'Water', explain: 'Liquid water flows and takes the shape of its container.' },
    },
  ],
}
