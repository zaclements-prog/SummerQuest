import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { ProblemAnswer } from '../../lib/problem'
import { ProgressBar } from '../../components/ui'

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
    <div className="w-full max-w-md mb-4">
      <div className="kid-text text-base text-ink-700 text-center mb-1.5">
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
        short ? 'font-bold text-3xl md:text-5xl' : 'font-semibold text-2xl md:text-3xl',
        'text-center leading-snug',
        'rounded-toon px-6 py-5 max-w-2xl w-full',
        'border-[3px] border-line shadow-card',
      ].join(' ')}
    >
      {children}
    </motion.div>
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
  // Long labels (e.g. word answers) read better stacked in a single column.
  const longLabels = options.some((o) => String(o).length > 8)

  return (
    <div
      className={[
        'grid gap-3 w-full max-w-md',
        longLabels ? 'grid-cols-1' : 'grid-cols-2',
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
        longLabels ? 'text-xl min-h-[60px]' : 'text-3xl min-h-[68px]',
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
