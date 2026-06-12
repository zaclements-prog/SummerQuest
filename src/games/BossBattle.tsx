import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { GameProps } from '../screens/GameRunner'
import { nextProblem, type Problem } from '../lib/problem'
import { sfx } from '../lib/sound'
import { useProgress } from '../store/progress'
import { skillOf } from '../tutoring/skills'

export default function BossBattle({ provider, params, onComplete, meta }: GameProps) {
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
    recordAnswer(isCorrect)
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
      // Only load another question if the battle isn't already decided by count.
      if (answeredNow < questionCount) {
        nextProblem(provider).then((p) => setProblem(p))
      }
    }, 900)
  }

  const isOver = bossHp <= 0 || playerHp <= 0 || questionsAnswered >= questionCount

  if (!problem) {
    return (
      <div className="flex-1 flex items-center justify-center text-white kid-text text-2xl">
        Loading…
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 text-white">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-2">
          <motion.div
            animate={
              bossShake ? { x: [-12, 12, -8, 8, 0], rotate: [-3, 3, -2, 2, 0] } : {}
            }
            transition={{ duration: 0.5 }}
            className="text-9xl inline-block"
          >
            {bossHp > 0 ? bossEmoji : '💥'}
          </motion.div>
          <div className="kid-text text-xl mt-1">{bossName}</div>
          <HpBar current={bossHp} max={hitsToKill} kind="boss" />
        </div>

        <div className="my-4 text-center">
          <AnimatePresence>
            {state === 'attacking' && (
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-5xl"
              >
                ⚡✨
              </motion.div>
            )}
            {state === 'hurt' && (
              <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-5xl"
              >
                💢
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="text-center mb-4">
          <HpBar current={playerHp} max={maxHearts} kind="player" />
          <div className="kid-text text-sm">Your hearts</div>
        </div>

        {!isOver && (
          <>
            {/* Plain keyed motion.div (NOT AnimatePresence mode="wait"): the new
                question must always mount immediately. mode="wait" keeps the old
                prompt mounted until its exit animation finishes — which never
                happens when rAF is paused (backgrounded tab), freezing the
                question. This matches ConceptPlay's robust prompt pattern. */}
            <motion.div
              key={problem.id}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="kid-text text-2xl md:text-4xl bg-white/20 px-6 py-3 rounded-3xl text-center mb-4"
            >
              {problem.prompt}
            </motion.div>

            <div className="grid grid-cols-2 gap-3">
              {problem.options.map((opt) => (
                <button
                  key={String(opt)}
                  onClick={() => pick(opt)}
                  disabled={state !== 'idle'}
                  className="kid-text text-2xl md:text-3xl py-4 rounded-3xl bg-white text-ocean-900 hover:bg-monster-100 shadow-lg border-4 border-white disabled:opacity-60"
                >
                  {opt}
                </button>
              ))}
            </div>
          </>
        )}

        {isOver && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-center kid-text text-3xl"
          >
            {bossHp <= 0
              ? '🏆 Victory!'
              : playerHp <= 0
                ? '💀 You fainted…'
                : '⏱️ Out of moves!'}
          </motion.div>
        )}
      </div>
    </div>
  )
}

function HpBar({
  current,
  max,
  kind,
}: {
  current: number
  max: number
  kind: 'boss' | 'player'
}) {
  if (kind === 'player') {
    return (
      <div className="flex gap-2 justify-center">
        {Array.from({ length: max }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              scale: i < current ? 1 : 0.6,
              opacity: i < current ? 1 : 0.3,
            }}
            className="text-4xl"
          >
            ❤️
          </motion.div>
        ))}
      </div>
    )
  }
  const pct = (current / max) * 100
  return (
    <div className="w-full max-w-md mx-auto h-4 bg-ocean-900/50 rounded-full overflow-hidden mt-1">
      <motion.div
        className="h-full bg-wrong-500"
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.4 }}
      />
    </div>
  )
}
