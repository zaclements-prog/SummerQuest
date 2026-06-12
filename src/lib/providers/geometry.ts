import type { Problem, ProblemProvider } from '../problem'
import { shuffle } from '../random'
import { makeLlmCachedProvider } from '../llm-cache'
import { useProgress } from '../../store/progress'

interface Config {
  level: 3 | 4
  source?: 'static' | 'llm'
}

/**
 * Geometry provider — text multiple-choice (no passage). Level 3 covers 2D
 * shapes, sides, and vertices; level 4 covers lines and angles. Common-Core
 * aligned to the 3rd/4th "Geometry" and "geometric measurement (angles)" strands.
 *
 * static: hand-written question pool. llm: generates fresh questions and falls
 * back to static when the LLM is disabled or unreachable.
 */

interface GeoQuestion {
  level: 3 | 4
  question: string
  answer: string
  options: string[]
  hint?: string
}

const QUESTIONS: GeoQuestion[] = [
  // ---- Level 3: 2D shapes, sides, vertices, solids ----
  {
    level: 3,
    question: 'How many sides does a triangle have?',
    answer: '3',
    options: ['3', '4', '5', '6'],
    hint: '"Tri" means three.',
  },
  {
    level: 3,
    question: 'A shape with 4 equal sides and 4 right angles is a ___.',
    answer: 'square',
    options: ['square', 'rectangle', 'triangle', 'circle'],
    hint: 'All four sides are the same length.',
  },
  {
    level: 3,
    question: 'How many sides does a hexagon have?',
    answer: '6',
    options: ['6', '5', '8', '4'],
    hint: 'Think of a honeycomb cell.',
  },
  {
    level: 3,
    question: 'How many sides does a pentagon have?',
    answer: '5',
    options: ['5', '6', '4', '7'],
    hint: 'The same number of points as a star.',
  },
  {
    level: 3,
    question: 'Which shape has no straight sides and no corners?',
    answer: 'circle',
    options: ['circle', 'triangle', 'square', 'rectangle'],
    hint: 'It is perfectly round.',
  },
  {
    level: 3,
    question: 'How many vertices (corners) does a square have?',
    answer: '4',
    options: ['4', '3', '5', '6'],
    hint: 'Count the corners where two sides meet.',
  },
  {
    level: 3,
    question: 'A closed shape with 8 sides is called a(n) ___.',
    answer: 'octagon',
    options: ['octagon', 'hexagon', 'pentagon', 'heptagon'],
    hint: 'Like a STOP sign.',
  },
  {
    level: 3,
    question: 'Any shape with exactly 4 sides is called a ___.',
    answer: 'quadrilateral',
    options: ['quadrilateral', 'triangle', 'pentagon', 'polygon'],
    hint: '"Quad" means four.',
  },
  {
    level: 3,
    question: 'How many sides does a heptagon have?',
    answer: '7',
    options: ['7', '6', '8', '5'],
    hint: '"Hept" means seven.',
  },
  {
    level: 3,
    question: 'How many sides does an octagon have?',
    answer: '8',
    options: ['8', '6', '7', '10'],
    hint: '"Oct" means eight, like an octopus has 8 arms.',
  },
  {
    level: 3,
    question: 'How many vertices (corners) does a triangle have?',
    answer: '3',
    options: ['3', '4', '2', '5'],
    hint: 'It has the same number of corners as sides.',
  },
  {
    level: 3,
    question: 'How many sides does a quadrilateral have?',
    answer: '4',
    options: ['4', '3', '5', '6'],
    hint: '"Quad" means four.',
  },
  {
    level: 3,
    question: 'A shape with 4 sides where opposite sides are equal but not all 4 are equal is a ___.',
    answer: 'rectangle',
    options: ['rectangle', 'square', 'triangle', 'circle'],
    hint: 'A door is shaped like this.',
  },
  {
    level: 3,
    question: 'A 4-sided shape with all 4 sides equal but no right angles (a "pushed-over" square) is a ___.',
    answer: 'rhombus',
    options: ['rhombus', 'rectangle', 'trapezoid', 'pentagon'],
    hint: 'It looks like a diamond on a playing card.',
  },
  {
    level: 3,
    question: 'A 4-sided shape with exactly one pair of parallel sides is a ___.',
    answer: 'trapezoid',
    options: ['trapezoid', 'square', 'rhombus', 'hexagon'],
    hint: 'Only the top and bottom are parallel.',
  },
  {
    level: 3,
    question: 'Which of these is a 3D solid, not a flat shape?',
    answer: 'cube',
    options: ['cube', 'square', 'triangle', 'circle'],
    hint: 'A number die (dice) is this shape.',
  },
  {
    level: 3,
    question: 'A round 3D ball shape is called a ___.',
    answer: 'sphere',
    options: ['sphere', 'circle', 'cone', 'cube'],
    hint: 'A basketball is this shape.',
  },
  {
    level: 3,
    question: 'An ice cream ___ is a 3D solid with a circle on the bottom and a point on top.',
    answer: 'cone',
    options: ['cone', 'cube', 'sphere', 'square'],
    hint: 'A party hat is this shape.',
  },
  {
    level: 3,
    question: 'A soup can is shaped like a 3D solid called a ___.',
    answer: 'cylinder',
    options: ['cylinder', 'cube', 'cone', 'sphere'],
    hint: 'It has two flat circle ends and rolls on its side.',
  },
  {
    level: 3,
    question: 'How many faces does a cube have?',
    answer: '6',
    options: ['6', '4', '8', '12'],
    hint: 'Count the flat square sides, like on a dice.',
  },
  {
    level: 3,
    question: 'How many edges does a cube have?',
    answer: '12',
    options: ['12', '6', '8', '4'],
    hint: 'Edges are the lines where two faces meet.',
  },
  {
    level: 3,
    question: 'How many vertices (corners) does a cube have?',
    answer: '8',
    options: ['8', '6', '12', '4'],
    hint: 'Count the corners, like the corners of a box.',
  },
  {
    level: 3,
    question: 'The flat shape at the very bottom of a cone is a ___.',
    answer: 'circle',
    options: ['circle', 'square', 'triangle', 'hexagon'],
    hint: 'Roll a ball in a ring to picture it.',
  },
  {
    level: 3,
    question: 'A polygon is a closed flat shape made only of ___.',
    answer: 'straight sides',
    options: ['straight sides', 'curved lines', 'dots', 'circles'],
    hint: 'No bends or curves are allowed.',
  },
  {
    level: 3,
    question: 'How many more sides does a hexagon have than a triangle?',
    answer: '3',
    options: ['3', '2', '6', '9'],
    hint: 'A hexagon has 6 sides and a triangle has 3.',
  },
  // ---- Level 4: lines and angles ----
  {
    level: 4,
    question: 'An angle that measures exactly 90° is called a ___ angle.',
    answer: 'right',
    options: ['right', 'acute', 'obtuse', 'straight'],
    hint: 'It looks like the corner of a square.',
  },
  {
    level: 4,
    question: 'An angle smaller than 90° is called a(n) ___ angle.',
    answer: 'acute',
    options: ['acute', 'obtuse', 'right', 'straight'],
    hint: 'A small, "cute" little angle.',
  },
  {
    level: 4,
    question: 'An angle between 90° and 180° is called a(n) ___ angle.',
    answer: 'obtuse',
    options: ['obtuse', 'acute', 'right', 'reflex'],
    hint: 'It is wider and more open than a right angle.',
  },
  {
    level: 4,
    question: 'Lines that never cross and stay the same distance apart are ___.',
    answer: 'parallel',
    options: ['parallel', 'perpendicular', 'intersecting', 'curved'],
    hint: 'Like the two rails of a train track.',
  },
  {
    level: 4,
    question: 'Two lines that cross to make right angles are ___.',
    answer: 'perpendicular',
    options: ['perpendicular', 'parallel', 'curved', 'equal'],
    hint: 'They meet to form perfect square corners.',
  },
  {
    level: 4,
    question: 'A straight angle measures how many degrees?',
    answer: '180°',
    options: ['180°', '90°', '360°', '45°'],
    hint: 'It makes one perfectly straight line.',
  },
  {
    level: 4,
    question: 'A triangle with all three sides the same length is called ___.',
    answer: 'equilateral',
    options: ['equilateral', 'isosceles', 'scalene', 'right'],
    hint: '"Equi" means equal.',
  },
  {
    level: 4,
    question: 'How many right angles does a rectangle have?',
    answer: '4',
    options: ['4', '2', '3', '0'],
    hint: 'Every corner of a rectangle is a square corner.',
  },
  {
    level: 4,
    question: 'A right angle measures exactly how many degrees?',
    answer: '90°',
    options: ['90°', '45°', '180°', '360°'],
    hint: 'It is the corner of a square.',
  },
  {
    level: 4,
    question: 'Turning all the way around one full time is how many degrees?',
    answer: '360°',
    options: ['360°', '180°', '90°', '270°'],
    hint: 'Think of a full spin in a circle.',
  },
  {
    level: 4,
    question: 'Lines that cross at any point are called ___ lines.',
    answer: 'intersecting',
    options: ['intersecting', 'parallel', 'equal', 'straight'],
    hint: 'They meet or pass through each other.',
  },
  {
    level: 4,
    question: 'A triangle with exactly two sides the same length is called ___.',
    answer: 'isosceles',
    options: ['isosceles', 'equilateral', 'scalene', 'right'],
    hint: 'Two of its sides match, but not all three.',
  },
  {
    level: 4,
    question: 'A triangle with all three sides different lengths is called ___.',
    answer: 'scalene',
    options: ['scalene', 'equilateral', 'isosceles', 'right'],
    hint: 'No two sides are the same.',
  },
  {
    level: 4,
    question: 'A triangle that has one right (90°) angle is called a ___ triangle.',
    answer: 'right',
    options: ['right', 'acute', 'obtuse', 'equal'],
    hint: 'One corner looks like the corner of a square.',
  },
  {
    level: 4,
    question: 'A triangle whose three angles are all smaller than 90° is called a(n) ___ triangle.',
    answer: 'acute',
    options: ['acute', 'right', 'obtuse', 'scalene'],
    hint: 'Every corner is a small, narrow angle.',
  },
  {
    level: 4,
    question: 'A triangle that has one angle bigger than 90° is called a(n) ___ triangle.',
    answer: 'obtuse',
    options: ['obtuse', 'acute', 'right', 'equal'],
    hint: 'One corner is wide and open.',
  },
  {
    level: 4,
    question: 'A polygon is called "regular" when all its sides and all its angles are ___.',
    answer: 'equal',
    options: ['equal', 'curved', 'different', 'parallel'],
    hint: 'Everything matches, like in a square.',
  },
  {
    level: 4,
    question: 'How many lines of symmetry does a square have?',
    answer: '4',
    options: ['4', '2', '1', '0'],
    hint: 'You can fold it in half 4 different ways and it matches.',
  },
  {
    level: 4,
    question: 'A line of symmetry folds a shape into two halves that are ___.',
    answer: 'matching',
    options: ['matching', 'different', 'bigger', 'curved'],
    hint: 'Both halves look exactly the same, like a mirror.',
  },
  {
    level: 4,
    question: 'How many lines of symmetry does a circle have?',
    answer: 'too many to count',
    options: ['too many to count', 'exactly 1', 'exactly 2', 'none'],
    hint: 'You can fold a circle in half across its middle any way you like.',
  },
  {
    level: 4,
    question: 'Which type of angle is the widest (most open)?',
    answer: 'obtuse',
    options: ['obtuse', 'acute', 'right', 'all the same'],
    hint: 'It is bigger than a right angle but not a straight line.',
  },
  {
    level: 4,
    question: 'Two angles that add up to make a straight line add up to ___.',
    answer: '180°',
    options: ['180°', '90°', '360°', '45°'],
    hint: 'A straight angle is 180°.',
  },
  {
    level: 4,
    question: 'The corners of a STOP sign (a regular octagon) are all the ___ size.',
    answer: 'same',
    options: ['same', 'different', 'curved', 'right'],
    hint: 'In a regular shape, all the angles match.',
  },
  {
    level: 4,
    question: 'How many lines of symmetry does an equilateral triangle have?',
    answer: '3',
    options: ['3', '1', '2', '4'],
    hint: 'It has one for each of its 3 equal sides.',
  },
  {
    level: 4,
    question: 'Letters and shapes that look like a square corner contain a ___ angle.',
    answer: 'right',
    options: ['right', 'acute', 'obtuse', 'straight'],
    hint: 'Think of the corner where a wall meets the floor.',
  },
]

export function makeGeometryProvider(cfg: Config): ProblemProvider {
  const staticProvider = makeStaticGeometryProvider(cfg)
  if (cfg.source !== 'llm') return staticProvider

  const playerName = useProgress.getState().player?.name ?? ''
  return makeLlmCachedProvider({
    staticProvider,
    topic: 'geometry',
    template: 'geometryConcept',
    variables: { level: cfg.level, playerName },
    initialBatch: 4,
    refillThreshold: 2,
    refillBatch: 4,
  })
}

function makeStaticGeometryProvider(cfg: Config): ProblemProvider {
  let serial = 0
  const pool = QUESTIONS.filter((q) => q.level === cfg.level)
  function reshuffle() {
    const order = [...pool]
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    return order
  }
  let queue = reshuffle()
  return {
    topic: 'geometry',
    next(): Problem {
      if (queue.length === 0) queue = reshuffle()
      const q = queue.shift()!
      return {
        id: `geometry-${serial++}`,
        prompt: q.question,
        options: shuffle(q.options),
        answer: q.answer,
        topic: 'geometry',
        difficulty: cfg.level,
        hint: q.hint,
      }
    },
    reset() {
      queue = reshuffle()
    },
  }
}
