import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import type { GameProps } from '../screens/GameRunner'
import { nextProblem, type Problem, type ProblemAnswer } from '../lib/problem'
import { sfx } from '../lib/sound'
import { useProgress } from '../store/progress'
import { skillOf } from '../tutoring/skills'
import { Loading, ProgressBar, Pill } from '../components/ui'
import { QuizProgress, QuestionPrompt, AnswerGrid } from './_shared/QuizUI'
import VisualRenderer from '../components/VisualRenderer'

// Visuals the question can't be answered without (a reading passage, a bar graph).
// Teaching aids like multiplication arrays or fraction bars stay hidden in the boss
// fight so mastery isn't just counting the picture.
const REQUIRED_VISUALS = new Set(['passage', 'barGraph'])

/**
 * Boss Battle — a multiple-choice duel against a monster boss.
 *
 * VISUAL redesign only: this reuses the shared quiz UI (QuizProgress /
 * QuestionPrompt / AnswerGrid) for the question + answers, and leans into the
 * monster theme with a boss character, an HP bar that drains on correct answers,
 * a hit-flash/shake on the boss, and a player-damage cue on a wrong answer.
 *
 * All game logic (hit math, scoring, star thresholds, store calls, onComplete
 * payloads, problem loading + timing) is preserved exactly from the original.
 */
export default function BossBattle({ provider, params, onComplete, meta }: GameProps) {
  const reduced = useReducedMotion()
  const questionCount = (params?.questionCount as number) ?? 6
  const bossEmoji = (params?.bossEmoji as string) ?? '🌵'
  const bossName = (params?.bossName as string) ?? 'Cactus Cyclops'

  // Each correct answer deals exactly 1 damage, so the boss is ALWAYS beatable.
  // (The old ceil(10/questionCount) formula made a 10-question boss need a PERFECT
  // run — one wrong answer left the boss un-killable. That was the bug.) You defeat
  // the boss with ~60% correct; hearts scale with length so longer bosses stay fair.
  const hitsToKill = Math.max(1, Math.ceil(questionCount * 0.6))
  const maxHearts = Math.max(3, questionCount - hitsToKill)

  const [problem, setProblem] = useState<Problem | null>(null)
  const [playerHp, setPlayerHp] = useState(maxHearts)
  const [bossHp, setBossHp] = useState(hitsToKill)
  const [questionsAnswered, setQuestionsAnswered] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [state, setState] = useState<'idle' | 'attacking' | 'hurt'>('idle')
  const [bossShake, setBossShake] = useState(false)
  // Reveal state for the shared AnswerGrid: which option the player picked this
  // question (null until they answer; cleared when the next problem loads).
  const [picked, setPicked] = useState<ProblemAnswer | null>(null)
  const recordAnswer = useProgress((s) => s.recordAnswer)
  const recordAttempt = useProgress((s) => s.recordAttempt)

  useEffect(() => {
    let cancel = false
    nextProblem(provider).then((p) => {
      if (!cancel) setProblem(p)
    })
    return () => {
      cancel = true
    }
  }, [provider])

  useEffect(() => {
    const over = bossHp <= 0 || playerHp <= 0 || questionsAnswered >= questionCount
    if (!over) return
    const won = bossHp <= 0
    const stars = won
      ? playerHp >= maxHearts
        ? 3
        : playerHp >= maxHearts - 1
          ? 2
          : 1
      : // gentle consolation: a strong-but-imperfect attempt still clears the stage
        correct >= Math.ceil(questionCount * 0.5)
        ? 1
        : 0
    const t = setTimeout(() => {
      onComplete({
        stars,
        score: correct * 10 + (won ? 50 : 0),
        correct,
        total: questionsAnswered,
      })
    }, 1100)
    return () => clearTimeout(t)
  }, [bossHp, playerHp, questionsAnswered, questionCount, correct, maxHearts, onComplete])

  function pick(opt: string | number) {
    if (!problem || state !== 'idle') return
    if (bossHp <= 0 || playerHp <= 0 || questionsAnswered >= questionCount) return

    const isCorrect = opt === problem.answer
    setPicked(opt)
    recordAnswer(isCorrect, problem)
    if (meta) {
      const sk = skillOf(problem)
      recordAttempt({ zoneId: meta.zoneId, topic: provider.topic, skillId: sk.id, skillLabel: sk.label, correct: isCorrect })
    }
    const answeredNow = questionsAnswered + 1
    setQuestionsAnswered(answeredNow)

    if (isCorrect) {
      sfx.correct()
      setCorrect((c) => c + 1)
      setState('attacking')
      setBossShake(true)
      setTimeout(() => {
        setBossHp((hp) => Math.max(0, hp - 1))
        setBossShake(false)
      }, 350)
    } else {
      sfx.wrong()
      setState('hurt')
      setTimeout(() => {
        setPlayerHp((hp) => Math.max(0, hp - 1))
      }, 350)
    }

    setTimeout(() => {
      setState('idle')
      setPicked(null)
      // Only load another question if the battle isn't already decided by count.
      if (answeredNow < questionCount) {
        nextProblem(provider).then((p) => setProblem(p))
      }
    }, 900)
  }

  // On the final question, keep the answer feedback on screen until the hit/hurt
  // animation settles, so the banner reflects the real outcome (not "Out of moves!").
  const outOfQuestions = questionsAnswered >= questionCount && state === 'idle'
  const isOver = bossHp <= 0 || playerHp <= 0 || outOfQuestions

  if (!problem) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loading label="Summoning the boss…" />
      </div>
    )
  }

  // Battle escalates as the boss weakens — pulse the arena glow more urgently.
  const bossDefeated = bossHp <= 0

  return (
    <div className="flex-1 flex flex-col items-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl flex flex-col items-center">
        {/* ── Boss arena ─────────────────────────────────────────────────── */}
        <BossArena
          emoji={bossEmoji}
          name={bossName}
          hp={bossHp}
          maxHp={hitsToKill}
          shake={bossShake}
          defeated={bossDefeated}
          state={state}
          reduced={reduced}
        />

        {/* ── Attack / damage cue ────────────────────────────────────────── */}
        <div className="h-12 flex items-center justify-center" aria-hidden="true">
          <AnimatePresence>
            {state === 'attacking' && (
              <motion.div
                key="attack"
                initial={reduced ? { opacity: 0 } : { x: -80, scale: 0.6, opacity: 0 }}
                animate={reduced ? { opacity: 1 } : { x: 0, scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-4xl"
              >
                ⚡✨ Hit!
              </motion.div>
            )}
            {state === 'hurt' && (
              <motion.div
                key="hurt"
                initial={reduced ? { opacity: 0 } : { x: 80, scale: 0.6, opacity: 0 }}
                animate={reduced ? { opacity: 1 } : { x: 0, scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-4xl"
              >
                💢 Ouch!
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Player hearts ──────────────────────────────────────────────── */}
        <PlayerHearts current={playerHp} max={maxHearts} hurt={state === 'hurt'} reduced={reduced} />

        {/* ── Question + answers (shared quiz UI) ────────────────────────── */}
        {!isOver && (
          /* Plain keyed wrapper (NOT AnimatePresence mode="wait"): the new
             question must always mount immediately. mode="wait" keeps the old
             prompt mounted until its exit animation finishes — which never
             happens when rAF is paused (backgrounded tab), freezing the
             question. This matches ConceptPlay's robust prompt pattern. */
          <div key={problem.id} className="mt-4 w-full flex flex-col items-center">
            <QuizProgress current={Math.min(questionsAnswered + 1, questionCount)} total={questionCount} />

            <QuestionPrompt>{problem.prompt}</QuestionPrompt>

            {problem.visual && REQUIRED_VISUALS.has(problem.visual.kind) && (
              <div className="mt-4 w-full flex justify-center">
                <VisualRenderer visual={problem.visual} size="md" />
              </div>
            )}

            <div className="mt-4">
              <AnswerGrid
                options={problem.options}
                answer={problem.answer}
                picked={picked}
                onPick={pick}
                disabled={state !== 'idle'}
              />
            </div>
          </div>
        )}

        {/* ── Battle result ──────────────────────────────────────────────── */}
        {isOver && (
          <motion.div
            initial={reduced ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
            animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="mt-6 text-center"
          >
            <div className="kid-text text-3xl md:text-4xl text-sky">
              {bossDefeated
                ? '🏆 Victory!'
                : playerHp <= 0
                  ? '💀 You fainted…'
                  : '⏱️ Out of moves!'}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ── Boss arena ────────────────────────────────────────────────────────────────
// The monster character on a glowing monster-toned stage, with an HP ProgressBar
// (monster tone) that drains as the player lands hits. Shakes + flashes on a hit.

function BossArena({
  emoji,
  name,
  hp,
  maxHp,
  shake,
  defeated,
  state,
  reduced,
}: {
  emoji: string
  name: string
  hp: number
  maxHp: number
  shake: boolean
  defeated: boolean
  state: 'idle' | 'attacking' | 'hurt'
  reduced: boolean | null
}) {
  return (
    <div
      className={[
        'relative w-full max-w-md rounded-3xl px-6 pt-6 pb-4',
        'bg-monster-800 border-4 border-monster-600',
        'shadow-[0_6px_0_0_theme(colors.monster.700),0_10px_24px_-4px_rgba(0,0,0,0.25)]',
        !reduced ? 'animate-glow text-monster-500' : 'text-monster-500',
      ].join(' ')}
    >
      {/* Name plate */}
      <div className="flex justify-center mb-1">
        <Pill tone="monster" icon="👾">
          {name}
        </Pill>
      </div>

      {/* Boss character */}
      <div className="flex justify-center" aria-hidden="true">
        <motion.div
          animate={
            reduced
              ? {}
              : shake
                ? { x: [-12, 12, -8, 8, 0], rotate: [-3, 3, -2, 2, 0] }
                : defeated
                  ? { scale: 1 }
                  : { y: [0, -8, 0] }
          }
          transition={
            shake
              ? { duration: 0.5 }
              : { duration: 2.4, repeat: defeated ? 0 : Infinity, ease: 'easeInOut' }
          }
          className="text-8xl md:text-9xl leading-none select-none"
        >
          {defeated ? '💥' : emoji}
        </motion.div>
      </div>

      {/* Hit-flash overlay on a successful attack */}
      <AnimatePresence>
        {state === 'attacking' && !reduced && (
          <motion.div
            key="flash"
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="pointer-events-none absolute inset-0 rounded-3xl bg-paper"
          />
        )}
      </AnimatePresence>

      {/* Boss HP bar (monster tone, drains on correct answers) */}
      <div className="mt-3" aria-label={`Boss health: ${hp} of ${maxHp}`}>
        <div className="flex items-center justify-between mb-1">
          <span className="kid-text text-sm text-monster-400">Boss HP</span>
          <span className="kid-text text-sm text-monster-400">
            {hp}/{maxHp}
          </span>
        </div>
        <ProgressBar value={hp} max={maxHp} tone="monster" />
      </div>
    </div>
  )
}

// ── Player hearts ─────────────────────────────────────────────────────────────
// Heart row representing the player's HP. Hearts dim + shrink as they're spent;
// the whole row gives a quick damage cue (shake) when the player takes a hit.

function PlayerHearts({
  current,
  max,
  hurt,
  reduced,
}: {
  current: number
  max: number
  hurt: boolean
  reduced: boolean | null
}) {
  return (
    <div
      className={['mt-4 flex flex-col items-center', !reduced && hurt ? 'animate-shake' : ''].join(' ')}
      role="img"
      aria-label={`Your hearts: ${current} of ${max}`}
    >
      <div className="flex gap-1.5 justify-center" aria-hidden="true">
        {Array.from({ length: max }).map((_, i) => (
          <motion.span
            key={i}
            animate={
              reduced
                ? { opacity: i < current ? 1 : 0.25 }
                : { scale: i < current ? 1 : 0.6, opacity: i < current ? 1 : 0.25 }
            }
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className="text-3xl leading-none select-none grayscale-0"
            style={i < current ? undefined : { filter: 'grayscale(1)' }}
          >
            ❤️
          </motion.span>
        ))}
      </div>
      <div className="kid-text text-sm text-sky mt-1">Your hearts</div>
    </div>
  )
}
