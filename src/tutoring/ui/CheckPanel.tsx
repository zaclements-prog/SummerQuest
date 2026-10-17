import { AnimatePresence, motion } from 'framer-motion'
import type { ProblemAnswer } from '../../lib/problem'
import { M } from '../motion/palette'
import { BulbIcon, CheckIcon, CrossIcon, StarIcon } from './icons'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
const PRAISE = ['Yes! Great thinking!', 'You got it!', 'Brilliant!', 'Spot on!', 'Super smart!']
const CONFETTI = [M.coral, M.gold, M.mint, '#8ab8ff', M.lilac, M.pink]

/**
 * A lesson step's quick check: chunky options that rise in, a confetti pop and
 * praise for the right answer, and a gentle "here's the trick" for a miss
 * (the right option lights up and the explanation slides in).
 */
export default function CheckPanel({
  question,
  options,
  answer,
  explain,
  picked,
  onPick,
  reduced,
  seed = 0,
}: {
  question: string
  options: ProblemAnswer[]
  answer: ProblemAnswer
  explain: string
  picked: ProblemAnswer | null
  onPick: (opt: ProblemAnswer) => void
  reduced: boolean
  seed?: number
}) {
  const revealed = picked !== null
  const correct = revealed && picked === answer
  const long = options.some((o) => String(o).length > 8)

  return (
    <motion.section
      aria-label="Check your understanding"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 24, delay: reduced ? 0 : 0.15 }}
      className="relative rounded-[28px] p-4 sm:p-5"
      style={{ background: M.paper, boxShadow: `0 0 0 3px ${M.ink}, 0 7px 0 0 rgba(58,44,56,0.28)` }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="kid-text text-sm uppercase tracking-wider px-2.5 py-0.5 rounded-full" style={{ background: M.gold, color: M.ink, boxShadow: `0 0 0 2px ${M.ink}` }}>
          Your turn!
        </span>
      </div>
      <h2 className="kid-text text-xl sm:text-2xl mb-3" style={{ color: M.ink }}>
        {question}
      </h2>

      <div className={long ? 'grid grid-cols-1 gap-2.5' : 'grid grid-cols-2 gap-2.5 sm:gap-3'}>
        {options.map((opt, i) => {
          const isAnswer = opt === answer
          const chosen = picked === opt
          const state: 'idle' | 'correct' | 'wrong' | 'dim' = !revealed ? 'idle' : isAnswer ? 'correct' : chosen ? 'wrong' : 'dim'
          const bg = state === 'correct' ? '#5fcf8f' : state === 'wrong' ? M.coral : '#ffffff'
          const anim =
            reduced || !revealed
              ? { opacity: state === 'dim' ? 0.45 : 1, y: 0, scale: 1, x: 0 }
              : state === 'correct'
                ? { opacity: 1, y: 0, scale: [1, 1.08, 1], x: 0 }
                : state === 'wrong'
                  ? { opacity: 1, y: 0, scale: 1, x: [0, -9, 9, -6, 6, -3, 0] }
                  : { opacity: 0.45, y: 0, scale: 0.97, x: 0 }
          return (
            <motion.button
              key={String(opt)}
              type="button"
              data-check-option
              disabled={revealed}
              onClick={() => onPick(opt)}
              aria-label={isAnswer && revealed ? `${opt} — correct answer` : String(opt)}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.95 }}
              animate={anim}
              transition={{ delay: revealed ? 0 : reduced ? 0 : 0.25 + i * 0.07, type: 'tween', duration: revealed && state !== 'dim' ? 0.45 : 0.3 }}
              whileHover={revealed || reduced ? undefined : { y: -3 }}
              whileTap={revealed ? undefined : { scale: 0.96 }}
              className={[
                'relative flex items-center gap-3 min-h-[60px] rounded-2xl px-3 py-2.5 text-left',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-ocean-500',
                revealed ? 'cursor-default' : '',
              ].join(' ')}
              style={{ background: bg, boxShadow: `0 0 0 3px ${M.ink}, 0 ${state === 'idle' ? 5 : 3}px 0 0 rgba(58,44,56,0.3)` }}
            >
              <span
                className="kid-text grid place-items-center h-9 w-9 flex-shrink-0 rounded-full text-base"
                style={{ background: state === 'idle' ? M.set[i % M.set.length] : '#ffffff', color: M.ink, boxShadow: `0 0 0 2.5px ${M.ink}` }}
                aria-hidden="true"
              >
                {state === 'correct' ? <CheckIcon size={20} /> : state === 'wrong' ? <CrossIcon size={18} /> : LETTERS[i]}
              </span>
              <span className={`kid-text ${long ? 'text-xl' : 'text-2xl'}`} style={{ color: M.ink }}>
                {String(opt)}
              </span>
              {state === 'correct' && !correct && (
                <motion.span
                  className="kid-text absolute -top-3 right-3 text-sm px-2 py-0.5 rounded-full"
                  style={{ background: M.gold, color: M.ink, boxShadow: `0 0 0 2px ${M.ink}` }}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.4, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.35, type: 'spring', stiffness: 400, damping: 16 }}
                  aria-hidden="true"
                >
                  This one!
                </motion.span>
              )}
              {state === 'correct' && correct && !reduced && <ConfettiPop />}
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence>
        {revealed && (
          <motion.div
            key="feedback"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22, delay: reduced ? 0 : 0.2 }}
            className="mt-4 flex items-start gap-3 rounded-2xl px-4 py-3"
            style={{ background: correct ? '#dcf7e8' : '#fff0c7', boxShadow: `0 0 0 2.5px ${M.ink}` }}
            role="status"
          >
            <span className="mt-0.5 flex-shrink-0" aria-hidden="true">
              {correct ? (
                <motion.span className="inline-block" style={{ color: M.gold }} initial={reduced ? false : { rotate: -40, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.3 }}>
                  <StarIcon size={30} />
                </motion.span>
              ) : (
                <BulbIcon size={30} />
              )}
            </span>
            <div>
              <div className="kid-text text-lg sm:text-xl" style={{ color: M.ink }}>
                {correct ? PRAISE[seed % PRAISE.length] : "Not quite. Here's the trick:"}
              </div>
              <p className="kid-text text-base sm:text-lg font-medium" style={{ color: '#5a4a56' }}>
                {explain}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}

/** A little burst of paper confetti from the middle of the right answer. */
function ConfettiPop() {
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + (i % 2) * 0.2
        const r = 70 + (i % 3) * 26
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 block rounded-sm"
            style={{ width: i % 3 === 0 ? 9 : 12, height: i % 3 === 0 ? 9 : 7, background: CONFETTI[i % CONFETTI.length], borderRadius: i % 3 === 0 ? 99 : 2 }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.4 }}
            animate={{ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.7 + 30, opacity: 0, rotate: 200 + i * 40, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.15, 0.7, 0.4, 1] }}
          />
        )
      })}
    </span>
  )
}
