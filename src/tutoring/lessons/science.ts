import type { Lesson } from '../types'

// Motion scenes: src/tutoring/motion/scenes/science.tsx (cue phrases come from
// these narration lines; keep them in sync when editing).
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
      check: { question: 'An ice pop melts in the hot sun. What state is it now?', options: ['Liquid', 'Solid', 'Gas'], answer: 'Liquid', explain: 'The melted ice pop drips and flows, so it is a liquid now.' },
    },
    {
      id: 'cycle',
      narration: 'Water moves in a cycle. The sun warms the lake, and water rises as vapor. That’s evaporation. Up high, the vapor cools into tiny drops that make clouds. That’s condensation. When the drops get heavy, they fall as rain. That’s precipitation!',
      body: 'Evaporation ↑ · Condensation ☁ · Precipitation ↓ … and around again.',
      check: { question: 'A puddle dries up on a sunny day. Which step of the water cycle is that?', options: ['Evaporation', 'Condensation', 'Precipitation', 'Freezing'], answer: 'Evaporation', explain: 'The sun warms the puddle and its water rises into the air as vapor. That is evaporation.' },
    },
    {
      id: 'plants',
      narration: 'Plants make their own food! Leaves catch sunlight, roots soak up water, and leaves take in a gas called carbon dioxide. Using the sun’s energy, the plant turns them into sugar, and gives off the oxygen we breathe. That’s photosynthesis!',
      body: 'Sunlight + water + carbon dioxide → sugar (food) + oxygen.',
      check: { question: 'What gas do plants give off that people and animals breathe?', options: ['Oxygen', 'Carbon dioxide', 'Steam', 'Smoke'], answer: 'Oxygen', explain: 'Plants take in carbon dioxide and give off oxygen, the gas we need to breathe.' },
    },
  ],
}
