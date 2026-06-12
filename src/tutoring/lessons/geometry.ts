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
      id: 'angles',
      narration: 'A corner, where two sides meet, is called an angle. The square corner that you see in a square is a special angle that we call a right angle.',
      body: 'Two sides meeting = an angle. A square corner = a right angle.',
    },
    {
      id: 'count',
      narration: 'Let us check what you remember about a square. Think about its straight edges and count them carefully.',
      body: 'Count the sides of a square.',
      check: { question: 'How many sides does a square have?', options: [4, 3, 5, 6], answer: 4, explain: 'A square has four equal sides.' },
    },
  ],
}
