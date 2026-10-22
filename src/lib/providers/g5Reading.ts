import type { Problem, ProblemProvider } from '../problem'
import { shuffle } from '../random'
import { G5_PASSAGES, G5_READING_HINTS, type G5Passage, type G5Shelf } from './content/g5Reading'

/**
 * Reading Reef, 5th grade (phase-3 contract: `g5-read-1..3`). Serves the
 * level-5 passages in ./content/g5Reading with the same `passage` visual as
 * grades 2–4 (ConceptPlay and BossBattle show it unchanged), but a passage at
 * a time: up to three of its questions in a row, then the next passage, so a
 * longer text is read once and asked about properly.
 *
 * A wrong pick shows a hint for the question's skill (how to find the answer).
 * Its own kind: `effectiveConfig` passes it through as written, and grades 2–4
 * never draw from this bank (their `readingComprehension` shelves are untouched).
 */
export interface G5ReadingConfig {
  /** Stories, poems and fables; articles and accounts; or both (the boss). */
  shelf: G5Shelf | 'mixed'
}

/** Questions asked from one passage before the next passage comes up. */
export const G5_QUESTIONS_PER_PASSAGE = 3

/** The skill a passage's questions practise (the coach routes a miss here). */
export function g5ReadingSkill(p: Pick<G5Passage, 'shelf' | 'form'>): { id: string; label: string } {
  if (p.form === 'paired') return { id: 'g5-read-compare', label: 'comparing two texts' }
  return p.shelf === 'literature'
    ? { id: 'g5-read-literature', label: 'stories and poems: theme, figurative language, narrator' }
    : { id: 'g5-read-informational', label: 'nonfiction: main ideas and text structure' }
}

export function g5ReadingPool(shelf: G5ReadingConfig['shelf']): G5Passage[] {
  return shelf === 'mixed' ? G5_PASSAGES : G5_PASSAGES.filter((p) => p.shelf === shelf)
}

export function makeG5ReadingProvider(cfg: G5ReadingConfig): ProblemProvider {
  const pool = g5ReadingPool(cfg.shelf)
  let serial = 0
  let queue: Array<{ p: G5Passage; qi: number }> = []
  let lastTitle = ''
  const refill = () => {
    let order = shuffle(pool)
    // a reshuffle never opens on the passage just read
    if (order.length > 1 && order[0].title === lastTitle) order = [...order.slice(1), order[0]]
    queue = order.flatMap((p) =>
      shuffle(p.questions.map((_, qi) => qi))
        .slice(0, G5_QUESTIONS_PER_PASSAGE)
        .map((qi) => ({ p, qi })),
    )
  }
  refill()
  return {
    topic: 'g5-reading',
    next(): Problem {
      if (queue.length === 0) refill()
      const { p, qi } = queue.shift()!
      lastTitle = p.title
      const q = p.questions[qi]
      return {
        id: `g5read-${serial++}`,
        prompt: q.question,
        options: shuffle(q.options),
        answer: q.answer,
        visual: { kind: 'passage', passageTitle: p.title, passageText: p.text, question: q.question },
        topic: `g5-reading-${q.skill}`,
        difficulty: 5,
        skill: g5ReadingSkill(p),
        hint: G5_READING_HINTS[q.skill],
      }
    },
    reset() {
      refill()
    },
  }
}
