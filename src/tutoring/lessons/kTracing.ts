import type { Lesson } from '../types'
import { askAloud, kLine } from './k1Voice'

/**
 * Kindergarten: tracing (K writing readiness; K.CC.3 numerals, L.K.1a
 * capital letters), ball-and-stick manuscript. Start at the green dot,
 * follow the arrow: a finger traces L (a big line down, a little line
 * across) and O (around like a C, all the way around) on the stage, the same
 * strokes, dot and arrows as Writing Workshop's tracing. Voice-first: the
 * checks are answered with pictures (a green dot, an arrow pointing down).
 */
const dot = (value: string, color: number, name: string) => ({ value, picture: { kind: 'shape', shape: 'circle', color } as const, speech: { line: `k-nav/color-${name}` } })
const arrow = (value: string, emoji: string) => ({ value, picture: { kind: 'emoji', emoji } as const, speech: kLine(value) })

export const kTracingLesson: Lesson = {
  id: 'kTracing',
  band: 'k1',
  zoneId: 'writing-workshop',
  skillIds: ['k-trace-lines', 'k-trace-letters'],
  title: 'Trace With Me',
  emoji: '✏️',
  intro: 'Start at the green dot, and follow the arrow.',
  practiceStageId: 'k-trace-1',
  steps: [
    {
      id: 'dot',
      narration: "Let's trace! Find the green dot. That is where we start.",
      check: {
        question: 'Where do you start? Tap the green dot.',
        speech: askAloud('kTracing', 'dot'),
        options: ['red', 'green', 'blue'],
        answer: 'green',
        explain: 'We always start at the green dot.',
        // (the picture cards' sticker colours: coral, green, blue)
        pictures: [dot('red', 0, 'red'), dot('green', 6, 'green'), dot('blue', 3, 'blue')],
      },
    },
    {
      id: 'lineL',
      narration: "Follow the arrow. Big line down. Then a little line across. That's L!",
      check: {
        question: 'Which arrow goes down? Tap it.',
        speech: askAloud('kTracing', 'lineL'),
        options: ['up', 'across', 'down'],
        answer: 'down',
        explain: 'Big lines start at the top and go down.',
        pictures: [arrow('up', '⬆️'), arrow('across', '➡️'), arrow('down', '⬇️')],
      },
    },
    {
      id: 'aroundO',
      narration: "Now O. Start at the green dot. Go around like a C. Keep going, all the way around. That's O!",
    },
    {
      id: 'yourTurn',
      narration: 'Your turn! Start at the dot, and follow the arrow. You can do it!',
    },
  ],
}
