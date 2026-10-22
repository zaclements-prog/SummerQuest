import type { Lesson } from '../types'

// Motion scenes: src/tutoring/motion/scenes/g5Science.tsx (cue phrases come
// from these narration lines; keep them in sync when editing).

/**
 * 5th grade: Science Summit (5-PS1, 5-LS2, 5-ESS2, 5-ESS1). Matter is made of
 * particles and its weight is conserved; energy flows from the sun through a
 * food web while matter cycles back through decomposers; Earth's four spheres
 * and its water; shadows, Earth's spin and the sun as a nearby star. Practice:
 * the zone's first grade-5 stage.
 */
export const g5ScienceLesson: Lesson = {
  id: 'g5Science',
  band: 'g5',
  zoneId: 'science-summit',
  skillIds: ['g5-sci-matter', 'g5-sci-foodwebs', 'g5-sci-spheres', 'g5-sci-sky'],
  title: 'Matter, Spheres and Stars',
  emoji: '🌍',
  intro: 'Particles and weight, food webs, Earth’s spheres and water, shadows and stars.',
  practiceStageId: 'g5-sci-1',
  steps: [
    {
      id: 'particles',
      narration:
        'All matter is made of particles too small to see. Stir 20 grams of salt into 200 grams of water. The salt seems to vanish, but its particles are still there. Put it on a scale: 220 grams. When matter mixes, melts or dissolves, the total weight stays the same.',
      body: '200 g water + 20 g salt = 220 g salt water. Matter is conserved.',
      check: {
        question: 'An ice cube with a mass of 50 grams melts in a sealed bag. What is the mass of the water?',
        options: ['50 grams', 'less than 50 grams', 'more than 50 grams', '0 grams'],
        answer: '50 grams',
        explain: 'Melting changes the form, not the amount of matter. Nothing got in or out, so it is still 50 grams.',
      },
    },
    {
      id: 'foodweb',
      narration:
        'Energy for almost every food web starts with the sun. Grass captures sunlight to make food. A rabbit eats the grass, and a fox eats the rabbit. When they die, decomposers like mushrooms break them down and return matter to the soil. Matter cycles around. Energy keeps coming from the sun.',
      body: 'Sun → producer → consumers → decomposers → soil. Matter cycles; energy flows.',
      check: {
        question: 'Which living thing is a decomposer?',
        options: ['a mushroom', 'a rabbit', 'grass', 'a fox'],
        answer: 'a mushroom',
        explain: 'Mushrooms break down dead plants and animals and return their matter to the soil.',
      },
    },
    {
      id: 'spheres',
      narration:
        'Scientists see Earth as four spheres. The geosphere is rock and soil. The hydrosphere is water and ice. The atmosphere is the air. The biosphere is every living thing. They interact all the time: when tree roots crack a rock, the biosphere is changing the geosphere.',
      body: 'Geosphere · hydrosphere · atmosphere · biosphere.',
      check: {
        question: 'Ocean waves break pieces off a rocky cliff. Which two spheres are interacting?',
        options: ['hydrosphere and geosphere', 'atmosphere and biosphere', 'biosphere and geosphere', 'atmosphere and hydrosphere'],
        answer: 'hydrosphere and geosphere',
        explain: 'The waves are water, the hydrosphere. The cliff is rock, the geosphere.',
      },
    },
    {
      id: 'water',
      narration:
        'If all of Earth’s water filled 100 cups, 97 cups would be salty ocean water. Only 3 cups would be fresh, and most of that is frozen in glaciers and ice caps. That is why the fresh water we can use is so precious.',
      body: '97 cups salty · 2 cups ice · 1 cup liquid fresh water.',
      check: {
        question: 'Where is most of Earth’s fresh water?',
        options: ['frozen in glaciers and ice caps', 'in lakes and rivers', 'in the oceans', 'in the clouds'],
        answer: 'frozen in glaciers and ice caps',
        explain: 'More than two-thirds of Earth’s fresh water is frozen as ice.',
      },
    },
    {
      id: 'sky',
      narration:
        'The sun is a star. It looks brighter than other stars because it is much closer. Each day Earth spins once, so the sun seems to cross the sky. In the morning the sun is in the east, and shadows point west. At noon shadows are shortest. In the evening they point east.',
      body: 'Earth spins once a day. Shadows point away from the sun.',
      check: {
        question: 'It is 8 a.m. and the sun is low in the east. Which way does a flagpole’s shadow point?',
        options: ['toward the west', 'toward the east', 'toward the sun', 'straight down'],
        answer: 'toward the west',
        explain: 'A shadow points away from the sun. A morning sun in the east makes a shadow toward the west.',
      },
    },
  ],
}
