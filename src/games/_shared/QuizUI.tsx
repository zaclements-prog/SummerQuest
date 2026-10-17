import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { ProblemAnswer } from '../../lib/problem'
import { ProgressBar } from '../../components/ui'
import { WIDE_SHORT, useMediaQuery } from '../../components/useViewport'

/**
 * Shared, presentational quiz-UI layer used by every multiple-choice game and the
 * daily challenge. These pieces hold NO game logic and no store access — they take
 * props and call `onPick`. Keeping them in one place gives all quizzes a single,
 * high-contrast, AA-safe look.
 */

// ── Progress ──────────────────────────────────────────────────────────────────
// A quest-toned ProgressBar scaled to current/total plus a readable caption.
// Replaces the old low-contrast "Question X of N" text.

export function QuizProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="w-full max-w-md mb-4 short:mb-2">
      <div className="kid-text text-base text-ink-700 text-center mb-1.5 short:mb-1 short:text-sm">
        Question {current} of {total}
      </div>
      <ProgressBar value={current} max={total} tone="quest" />
    </div>
  )
}

// ── Question prompt ────────────────────────────────────────────────────────────
// A clean, bright, high-contrast surface (paper + warm ink), outlined and
// chunky like every toon card — readable, not a translucent pill.

export function QuestionPrompt({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()
  // Short facts ("8 × 6 = ?") read big and bold; sentences get a calmer size.
  const short = typeof children === 'string' && children.length <= 28
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { scale: 0.96, opacity: 0 }}
      animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className={[
        'bg-paper text-ink-900 kid-text',
        short ? 'font-bold text-3xl md:text-5xl short:text-3xl' : 'font-semibold text-2xl md:text-3xl short:text-xl',
        'text-center leading-snug',
        'rounded-toon px-6 py-5 max-sm:px-4 max-sm:py-3.5 short:px-4 short:py-2.5 max-w-2xl w-full',
        'border-[3px] border-line shadow-card',
      ].join(' ')}
    >
      {children}
    </motion.div>
  )
}

// ── Question beside answers (wide, short screens) ─────────────────────────────
// Stacked on phones held upright, tablets held upright and big screens; on a
// phone held sideways or a wide tablet in landscape the question (and its
// picture or passage) sits on the left and the answers on the right, pinned in
// view, so a kid never has to scroll to reach the buttons.

const SplitContext = createContext(false)

export function QuizSplit({
  question,
  answers,
  gap = '',
  center = false,
}: {
  question: ReactNode
  answers: ReactNode
  /** Space between question and answers when stacked (e.g. 'gap-5'). */
  gap?: string
  /** Side by side: centre the two columns vertically (no tall picture). */
  center?: boolean
}) {
  const split = useMediaQuery(WIDE_SHORT)
  return (
    <SplitContext.Provider value={split}>
      <div
        className={
          split
            ? `w-full max-w-5xl grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-4 lg:gap-6 ${center ? 'items-center' : 'items-start'}`
            : `w-full flex flex-col items-center ${gap}`
        }
      >
        <div className="w-full flex flex-col items-center">{question}</div>
        <div className={`w-full flex flex-col items-center ${split ? 'sticky top-2' : ''}`}>{answers}</div>
      </div>
    </SplitContext.Provider>
  )
}

// ── Answer grid ────────────────────────────────────────────────────────────────
// Multiple-choice options. 2 columns by default; collapses to 1 column when any
// label is long. After a pick: correct option = correct fill + ✓ + pop; the
// picked-wrong option = wrong fill + ✗ + shake; every other option dims so the
// answer stays the focal point. AA-safe (never white text on a `*-500`).

interface AnswerGridProps {
  options: ProblemAnswer[]
  answer: ProblemAnswer
  picked: ProblemAnswer | null
  onPick: (opt: ProblemAnswer) => void
  disabled?: boolean
}

export function AnswerGrid({ options, answer, picked, onPick, disabled }: AnswerGridProps) {
  const reduced = useReducedMotion()
  const revealed = picked !== null
  // Long labels (e.g. word answers) read better stacked in a single column —
  // except beside the question (short screen), where a column of four would run
  // off the bottom: there, word answers up to a short phrase stay two-up.
  const split = useContext(SplitContext)
  const longLabels = options.some((o) => String(o).length > 8)
  const oneColumn = longLabels && !(split && options.every((o) => String(o).length <= 18))

  return (
    <div
      className={[
        'grid gap-3 short:gap-2.5 w-full max-w-md',
        oneColumn ? 'grid-cols-1' : 'grid-cols-2',
      ].join(' ')}
    >
      {options.map((opt) => (
        <AnswerButton
          key={String(opt)}
          opt={opt}
          isAnswer={opt === answer}
          chosen={picked === opt}
          revealed={revealed}
          longLabels={longLabels}
          reduced={reduced}
          disabled={disabled || revealed}
          onPick={() => onPick(opt)}
        />
      ))}
    </div>
  )
}

function AnswerButton({
  opt,
  isAnswer,
  chosen,
  revealed,
  longLabels,
  reduced,
  disabled,
  onPick,
}: {
  opt: ProblemAnswer
  isAnswer: boolean
  chosen: boolean
  revealed: boolean
  longLabels: boolean
  reduced: boolean | null
  disabled?: boolean
  onPick: () => void
}) {
  let state: 'idle' | 'correct' | 'wrong' | 'dim' = 'idle'
  if (revealed) {
    if (isAnswer) state = 'correct'
    else if (chosen) state = 'wrong'
    else state = 'dim'
  }

  // Toon answer tiles: outlined paper that lifts on hover and sinks on press;
  // the reveal paints the answer leaf-green and a wrong pick coral (ink text on both).
  const stateClass: Record<typeof state, string> = {
    idle: 'bg-paper text-ink-900 border-line shadow-ledge hover:bg-cream-50 hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-ledge-sm',
    correct: 'bg-correct-400 text-ink-900 border-line shadow-ledge',
    wrong: 'bg-wrong-400 text-ink-900 border-line shadow-ledge',
    dim: 'bg-paper/60 text-ink-500 border-line/25 shadow-none',
  }

  const anim =
    !reduced && state === 'correct'
      ? 'animate-pop'
      : !reduced && state === 'wrong'
        ? 'animate-shake'
        : ''

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      aria-label={
        revealed && isAnswer
          ? `${opt} — correct answer`
          : revealed && chosen
            ? `${opt} — incorrect`
            : String(opt)
      }
      className={[
        'choice kid-text font-bold relative justify-center text-center !border-[3px]',
        longLabels ? 'text-xl min-h-[60px] short:min-h-[52px] short:text-lg' : 'text-3xl min-h-[68px] short:min-h-[56px]',
        'transition-[translate,box-shadow,background-color] duration-100',
        stateClass[state],
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 focus-visible:ring-offset-2',
        revealed && state === 'dim' ? 'cursor-default' : '',
        anim,
      ].join(' ')}
    >
      <span>{opt}</span>
      {state === 'correct' && (
        <span
          className="absolute -top-3 -right-3 grid place-items-center w-9 h-9 rounded-full bg-correct-500 border-[3px] border-line text-lg text-ink-900"
          aria-hidden="true"
        >
          ✓
        </span>
      )}
      {state === 'wrong' && (
        <span
          className="absolute -top-3 -right-3 grid place-items-center w-9 h-9 rounded-full bg-wrong-500 border-[3px] border-line text-lg text-ink-900"
          aria-hidden="true"
        >
          ✗
        </span>
      )}
    </button>
  )
}
