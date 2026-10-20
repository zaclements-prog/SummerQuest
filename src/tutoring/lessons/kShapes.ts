import type { Lesson } from '../types'
import { askAloud, kLine } from './k1Voice'

/**
 * Kindergarten: shapes (K.G.2–4). Sides and corners (triangle, square,
 * circle), then flat and solid (a square and a cube). Voice-first: the stage
 * draws each shape as it is named, and the checks are answered with shape
 * pictures.
 */
const shape = (s: 'triangle' | 'square' | 'circle' | 'cube') => ({ value: s, picture: { kind: 'shape', shape: s } as const, speech: kLine(s) })

export const kShapesLesson: Lesson = {
  id: 'kShapes',
  band: 'k1',
  zoneId: 'geometry-grove',
  skillIds: ['k-shapes'],
  title: 'Shapes',
  emoji: '🔺',
  intro: 'Sides and corners, flat and solid.',
  practiceStageId: 'k-shapes-1',
  steps: [
    {
      id: 'triangle',
      narration: 'This is a triangle. It has three straight sides. And three pointy corners!',
    },
    {
      id: 'square',
      narration: 'This is a square. It has four sides, all the same size. And four corners!',
    },
    {
      id: 'circle',
      narration: 'This is a circle. It goes round and round. No sides, and no corners!',
      check: {
        question: 'Which shape has three sides? Tap it!',
        speech: askAloud('kShapes', 'circle'),
        options: ['square', 'triangle', 'circle'],
        answer: 'triangle',
        explain: 'A triangle has three sides.',
        pictures: [shape('square'), shape('triangle'), shape('circle')],
      },
    },
    {
      id: 'solid',
      narration: 'Some shapes are flat, like a square on paper. Some shapes are solid, like a box. This solid shape is a cube!',
      check: {
        question: 'Which one is solid? Tap it!',
        speech: askAloud('kShapes', 'solid'),
        options: ['square', 'cube', 'circle'],
        answer: 'cube',
        explain: 'A cube is solid, like a box.',
        pictures: [shape('square'), shape('cube'), shape('circle')],
      },
    },
  ],
}
