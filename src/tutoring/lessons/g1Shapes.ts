import type { Lesson } from '../types'
import type { PictureOption } from '../../lib/problem'
import { boxArtName, shapeArtName } from '../../games/listenPlay/g1ShapesArt'
import type { VoiceRef } from '../../voice/types'

const label = (shape: string): VoiceRef => ({ template: 'g1-shapes/label', slots: { shape } })

/**
 * 1st grade: shapes (1.G.1–2), for Shape Grove. A triangle has three straight
 * sides and three corners, and it is closed; big or small, any colour, turned
 * any way, it is still a triangle. Shapes snap together into new shapes (two
 * triangles make a square). Solid shapes roll or stack. Voice-first: the
 * stage draws and moves the shapes as they are told; the checks are answered
 * with Shape Grove's own drawings and reuse its lines.
 */
export const g1ShapesLesson: Lesson = {
  id: 'g1Shapes',
  band: 'g1',
  zoneId: 'geometry-grove',
  skillIds: ['g1-shapes-attributes', 'g1-shapes-compose', 'g1-shapes-solids'],
  title: 'Shape Detectives',
  emoji: '🔺',
  intro: 'Sides and corners make a shape. Shapes snap together, roll and stack.',
  practiceStageId: 'g1-shapes-1',
  steps: [
    {
      id: 'triangle',
      narration: 'A triangle has three straight sides and three corners. It is closed, with no gaps.',
    },
    {
      id: 'still',
      narration: 'Make it big or small. Paint it blue. Turn it around. It is still a triangle! Your turn!',
      check: {
        question: 'Which one is still a triangle?',
        speech: { template: 'g1-shapes/still', slots: { shape: 'triangle' } },
        options: ['open', 'turned', 'curved'],
        answer: 'turned',
        explain: 'Three straight sides, three corners, and closed: a triangle.',
        pictures: [
          { value: 'open', picture: { kind: 'art', name: shapeArtName({ shape: 'triangle', flaw: 'open', color: 2, turn: 0 }) }, speech: { line: 'g1-shapes/open' } },
          { value: 'turned', picture: { kind: 'art', name: shapeArtName({ shape: 'thinTriangle', color: 3, turn: 160 }) }, speech: label('triangle') },
          { value: 'curved', picture: { kind: 'art', name: shapeArtName({ shape: 'rightTriangle', flaw: 'curved', color: 5, turn: 0 }) }, speech: { line: 'g1-shapes/curved' } },
        ] satisfies PictureOption[],
      },
    },
    {
      id: 'snap',
      narration: 'Shapes can make new shapes. Two triangles snap together. Now they make a square!',
    },
    {
      id: 'solids',
      narration: 'A sphere can roll. A cube can stack. A cylinder can roll and stack! Your turn!',
      check: {
        question: 'Which one can roll?',
        speech: { line: 'g1-shapes/roll' },
        options: ['cube', 'sphere', 'box'],
        answer: 'sphere',
        explain: 'A sphere is round all over: it rolls.',
        pictures: [
          { value: 'cube', picture: { kind: 'shape', shape: 'cube', color: 3 }, speech: label('cube') },
          { value: 'sphere', picture: { kind: 'shape', shape: 'sphere', color: 0 }, speech: label('sphere') },
          { value: 'box', picture: { kind: 'art', name: boxArtName(2) }, speech: label('box') },
        ] satisfies PictureOption[],
      },
    },
  ],
}
