import type { Lesson } from '../types'

export const geometryLesson: Lesson = {
  id: 'geometry',
  zoneId: 'geometry-grove',
  skillIds: ['geo-shapes'],
  title: 'Geometry',
  emoji: '📐',
  intro: 'Geometry is all about shapes, their sides, and their corners.',
  practiceStageId: 'geo-angles',
  steps: [
    {
      id: 'shapes',
      narration: 'Shapes get their names from their sides and their corners. A square is special because it has four sides that are all the same length, and it has four corners.',
      body: 'A square: 4 equal sides, 4 corners.',
      visual: { kind: 'shape', type: 'square', width: 3, height: 3 },
    },
    {
      id: 'family',
      narration: 'Count the sides to name a shape. Three sides make a triangle. Four sides make a quadrilateral. Five sides make a pentagon, and six sides make a hexagon!',
      body: 'Triangle: 3 sides. Quadrilateral: 4 sides. Pentagon: 5 sides. Hexagon: 6 sides.',
    },
    {
      id: 'angles',
      narration: 'A corner, where two sides meet, is called an angle. The square corner that you see in a square is a special angle that we call a right angle.',
      body: 'Two sides meeting = an angle. A square corner = a right angle.',
    },
    {
      // The practice stage (geo-angles) asks about acute / obtuse / parallel /
      // perpendicular, so the lesson teaches them before sending kids there.
      id: 'angleTypes',
      narration: 'An angle smaller than a right angle is called acute. It is narrow, like the tip of a pizza slice. An angle bigger than a right angle is called obtuse. It opens up wide.',
      body: 'Acute: smaller than a right angle. Obtuse: bigger than a right angle.',
      check: { question: 'Which angle is smaller than a right angle?', options: ['acute', 'obtuse', 'right', 'straight'], answer: 'acute', explain: 'Acute angles are narrower than a square corner. Obtuse angles open wider.' },
    },
    {
      id: 'lines',
      narration: 'Lines that run side by side and never cross are called parallel, like train tracks. Lines that cross to make square corners are called perpendicular, like a plus sign.',
      body: 'Parallel: never cross. Perpendicular: cross at right angles.',
    },
    {
      id: 'count',
      narration: 'Let us check what you remember about a square. Think about its straight edges and count them carefully.',
      body: 'Count the sides of a square.',
      check: { question: 'How many sides does a square have?', options: [4, 3, 5, 6], answer: 4, explain: 'A square has four equal sides.' },
    },
  ],
}
