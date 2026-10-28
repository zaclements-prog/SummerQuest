import { useState } from 'react'
import type { Problem } from '../../lib/problem'
import { useProgress } from '../../store/progress'
import { skillOf } from '../../tutoring/skills'

/**
 * The quiz games' side of "💡 Show me how" (src/games/_shared/ShowMeHow.tsx).
 */

export interface ShowMe {
  /** The question has a walkthrough. */
  available: boolean
  open: boolean
  /** Opened on this question (before or after answering). */
  helped: boolean
  /** Played to its last step ("Your turn!") at least once on this question: show the reminder strip. */
  finished: boolean
  show(): void
  close(finished: boolean): void
}

/** Per-question "Show me how" state for a quiz game; every open is counted for the Parent Dashboard. */
export function useShowMe(problem: Problem | null): ShowMe {
  const recordHelpAsk = useProgress((s) => s.recordHelpAsk)
  const id = problem?.id ?? null
  const [st, setSt] = useState({ id, open: false, helped: false, finished: false })
  // a new question starts fresh
  const cur = st.id === id ? st : { id, open: false, helped: false, finished: false }
  const available = !!problem?.showMe?.length
  return {
    available,
    open: cur.open && available,
    helped: cur.helped,
    finished: cur.finished,
    show() {
      if (!problem || !available) return
      const sk = skillOf(problem)
      recordHelpAsk(sk.id, sk.label)
      setSt({ ...cur, open: true, helped: true })
    },
    close(finished) {
      setSt({ ...cur, open: false, finished: cur.finished || finished })
    },
  }
}
