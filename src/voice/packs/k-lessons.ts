import { defineVoicePack } from '../types'
import { kCountingLesson } from '../../tutoring/lessons/kCounting'
import { kShapesLesson } from '../../tutoring/lessons/kShapes'
import { kLettersLesson } from '../../tutoring/lessons/kLetters'
import { kRhymesLesson } from '../../tutoring/lessons/kRhymes'
import { kTracingLesson } from '../../tutoring/lessons/kTracing'
import { kAddTakeLesson } from '../../tutoring/lessons/kAddTake'
import { kStoryMathLesson } from '../../tutoring/lessons/kStoryMath'
import { K_LESSON_PACK } from '../../tutoring/lessons/k1Voice'

/**
 * What the K–1 lessons say besides their narration (src/tutoring/lessons/k*.ts):
 *
 * - each "your turn" question, taken from the lesson itself (a check's
 *   `speech` names its line, and its `question` is the line's text, so the two
 *   can't drift apart); the counting checks reuse `k-math` lines instead;
 * - each picture card's name, said as it is tapped;
 * - the lesson-complete line.
 */
const asked: Record<string, string> = {}
for (const lesson of [kCountingLesson, kShapesLesson, kLettersLesson, kRhymesLesson, kTracingLesson]) {
  for (const step of lesson.steps) {
    const ref = step.check?.speech
    if (ref && 'line' in ref && ref.line.startsWith(`${K_LESSON_PACK}/`)) asked[ref.line.slice(K_LESSON_PACK.length + 1)] = step.check!.question
  }
}
// K complete (phase 2a): Add-and-Take Falls and Story Woods ask theirs the same way
for (const step of [...kAddTakeLesson.steps, ...kStoryMathLesson.steps]) {
  const ref = step.check?.speech
  if (ref && 'line' in ref && ref.line.startsWith(`${K_LESSON_PACK}/`)) asked[ref.line.slice(K_LESSON_PACK.length + 1)] = step.check!.question
}

export default defineVoicePack({
  id: K_LESSON_PACK,
  lines: {
    ...asked,
    // shapes
    triangle: 'Triangle!',
    square: 'Square!',
    circle: 'Circle!',
    cube: 'Cube!',
    // letters
    bigB: 'Big B!',
    littleB: 'Little b!',
    littleA: 'Little a!',
    // first-sound pictures
    banana: 'Banana!',
    fish: 'Fish!',
    apple: 'Apple!',
    // rhyme pictures
    spoon: 'Spoon!',
    car: 'Car!',
    // tracing: which way an arrow goes (the dots' colours are k-nav's)
    up: 'Up!',
    across: 'Across!',
    down: 'Down!',
    // the lesson picker: the hand glides over the pictures
    pickLesson: 'Pick a lesson to watch. Tap a picture!',
    // the end of a lesson: the hand points at the big ▶
    lessonDone: 'You did it! Tap the arrow to play.',
  },
})
