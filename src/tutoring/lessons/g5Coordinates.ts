import type { Lesson } from '../types'

/**
 * 5th grade: the coordinate plane and the family tree of shapes (5.G.1–4), for
 * Geometry Grove. Axes and origin, an ordered pair as directions, a grid map,
 * then quadrilaterals sorted into families (every square is a rectangle).
 */
export const g5CoordinatesLesson: Lesson = {
  id: 'g5Coordinates',
  band: 'g5',
  zoneId: 'geometry-grove',
  skillIds: ['g5-coordinates', 'g5-classify'],
  title: 'The Coordinate Plane',
  emoji: '📍',
  intro: 'Find any point with two numbers, then sort shapes into families.',
  practiceStageId: 'g5-geo-1',
  steps: [
    {
      id: 'axes',
      narration: 'A coordinate plane is two number lines that meet at zero. The x-axis goes across. The y-axis goes up. They meet at the origin, the point zero, zero.',
      body: 'x-axis: across. y-axis: up. The origin is (0, 0).',
    },
    {
      id: 'plot',
      narration:
        'An ordered pair is a set of directions. Start at the origin. The first number tells how far to go across. The second number tells how far to go up. Three, five means across three, then up five.',
      body: '(x, y): across x, then up y. (3, 5) is across 3, up 5.',
      check: {
        question: 'To plot (6, 2), what do you do first from the origin?',
        options: ['Go right 6', 'Go up 6', 'Go right 2', 'Go up 2'],
        answer: 'Go right 6',
        explain: 'The first number is x: go across 6, then up 2.',
      },
    },
    {
      id: 'map',
      narration:
        'Grids help solve real problems. On this map, the library is at one, two, and the park is at one, seven. They share an x-coordinate, so count straight up: the park is five blocks from the library.',
      body: 'Library (1, 2), park (1, 7): same x, so 7 − 2 = 5 blocks.',
      check: {
        question: 'The pool is at (3, 4) and the gym is at (8, 4). How many blocks apart are they?',
        options: [5, 8, 11, 4],
        answer: 5,
        explain: 'They share y = 4, so count across from 3 to 8: 8 − 3 = 5 blocks.',
      },
    },
    {
      id: 'family',
      narration:
        'Shapes belong to families. A quadrilateral has four sides. A parallelogram has two pairs of parallel sides. A rectangle is a parallelogram with four right angles. A rhombus is a parallelogram with four equal sides. A square is both!',
      body: 'Quadrilateral → parallelogram → rectangle and rhombus → square.',
    },
    {
      id: 'always',
      narration: 'So every square is a rectangle, because it has four right angles. But not every rectangle is a square, because its sides do not have to be equal.',
      body: 'Every square is a rectangle. Only some rectangles are squares.',
      check: {
        question: 'Is every rhombus a square?',
        options: ['No, it may not have right angles', 'Yes, its sides are equal', 'Yes, it has four sides', 'No, it has no parallel sides'],
        answer: 'No, it may not have right angles',
        explain: 'A square needs four right angles too, and a rhombus can lean over.',
      },
    },
  ],
}
