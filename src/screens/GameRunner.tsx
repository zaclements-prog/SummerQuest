import { useNavigate, useParams } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { getStage, getZone } from '../curriculum'
import { useProgress } from '../store/progress'
import { createProvider } from '../lib/providers'
import type { ProblemProvider } from '../lib/problem'
import ConceptPlay from '../games/ConceptPlay'
import SpeedRun from '../games/SpeedRun'
import BossBattle from '../games/BossBattle'
import TowerDefense from '../games/tower-defense/TowerDefense'
import WritingPad from '../games/WritingPad'
import { sfx } from '../lib/sound'
import { Card, Button, BackButton, Pill, Celebration, ConfirmDialog, ErrorState } from '../components/ui'
import { isStageUnlocked } from '../lib/stageLocks'
import { accuracyColorClass } from '../lib/theme'

export interface GameResult {
  stars: number
  score: number
  correct: number
  total: number
}

export interface GameProps {
  provider: ProblemProvider
  params?: Record<string, unknown>
  onComplete: (result: GameResult) => void
  onExit: () => void
  meta?: { zoneId: string; stageId: string }
  /** True while a host dialog (e.g. "Quit?") is open — timed games must freeze. */
  paused?: boolean
}

export default function GameRunner() {
  const { zoneId = '', stageId = '' } = useParams()
  const navigate = useNavigate()
  const zone = getZone(zoneId)
  const stage = getStage(zoneId, stageId)
  const awardStage = useProgress((s) => s.awardStage)
  const addCoins = useProgress((s) => s.addCoins)
  const recordSession = useProgress((s) => s.recordSession)
  const zoneProgress = useProgress((s) => s.zones[zoneId])
  const [result, setResult] = useState<GameResult | null>(null)
  const [confirmQuit, setConfirmQuit] = useState(false)
  const processedResultRef = useRef<GameResult | null>(null)
  const closeQuit = useCallback(() => setConfirmQuit(false), [])

  const provider = useMemo(
    () => (stage ? createProvider(stage.providerConfig) : null),
    [stage],
  )

  useEffect(() => {
    if (result && zone && stage && processedResultRef.current !== result) {
      processedResultRef.current = result
      awardStage(zoneId, stageId, result.stars, result.score)
      const coinReward = result.correct * 2 + result.stars * 5
      addCoins(coinReward)
      recordSession({
        zoneId,
        zoneTitle: zone.title,
        zoneEmoji: zone.emoji,
        stageId,
        stageTitle: stage.title,
        kind: 'stage',
        correct: result.correct,
        total: result.total,
        stars: result.stars,
        score: result.score,
      })
    }
  }, [result, zoneId, stageId, zone, stage, awardStage, addCoins, recordSession])

  // ── Missing stage / zone / provider ─────────────────────────────────────────
  if (!zone || !stage || !provider) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <ErrorState
          emoji="🧭"
          title="Stage not found"
          message="We couldn't find that adventure. Let's head back to the map."
          back={{ label: 'Back to map', to: '/map' }}
        />
      </div>
    )
  }

  // ── Locked stage (deep link / old bookmark) ────────────────────────────────
  // Checked before any result exists: finishing a stage can't re-lock it.
  if (!result && !isStageUnlocked(zone, stageId, zoneProgress)) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <ErrorState
          emoji="🔒"
          title="This stage is still locked"
          message="Earn a star on the step before it to open this one."
          back={{ label: 'Back to zone', to: `/zone/${zoneId}` }}
        />
      </div>
    )
  }

  // ── Result screen ───────────────────────────────────────────────────────────
  if (result) {
    const coinReward = result.correct * 2 + result.stars * 5
    return (
      <ResultScreen
        result={result}
        coins={coinReward}
        onContinue={() => navigate(`/zone/${zoneId}`)}
        onPlayAgain={() => {
          sfx.click()
          processedResultRef.current = null
          setConfirmQuit(false)
          setResult(null)
        }}
      />
    )
  }

  // ── Resolve the game component for this stage ────────────────────────────────
  const Game = (() => {
    switch (stage.gameId) {
      case 'conceptPlay':
        return ConceptPlay
      case 'speedRun':
        return SpeedRun
      case 'bossBattle':
        return BossBattle
      case 'towerDefense':
        return TowerDefense
      case 'writingPad':
        return WritingPad
      default:
        return null
    }
  })()

  // Unknown / unimplemented game type → friendly error instead of a crash.
  if (!Game) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <ErrorState
          emoji="🚧"
          title="This game isn't ready yet"
          message="We're still building this adventure. Try another stage in the meantime!"
          back={{ label: 'Back to zone', to: `/zone/${zoneId}` }}
        />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* ── Host top bar ──────────────────────────────────────────────────── */}
      <div className="px-4 py-2 flex items-center gap-3">
        <BackButton label="Quit" onClick={() => setConfirmQuit(true)} />
        <h1 className="kid-text text-lg sm:text-xl text-sky text-center flex-1 truncate drop-shadow-md">
          {stage.title}
        </h1>
        {/* spacer to keep the title visually centered against the Quit button */}
        <div className="w-[88px] flex-shrink-0" aria-hidden="true" />
      </div>

      <Game
        provider={provider}
        params={stage.params}
        onComplete={(r) => {
          setConfirmQuit(false)
          setResult(r)
        }}
        onExit={() => navigate(`/zone/${zoneId}`)}
        meta={{ zoneId, stageId }}
        paused={confirmQuit}
      />

      {/* ── Quit confirmation (the game is paused while this is open) ─────── */}
      <ConfirmDialog
        open={confirmQuit}
        emoji="🚪"
        title="Quit this game?"
        confirmLabel="Quit to zone"
        cancelLabel="Keep playing"
        onConfirm={() => navigate(`/zone/${zoneId}`)}
        onCancel={closeQuit}
      >
        This round won't count, but the stars you already earned are safe. 🌟
      </ConfirmDialog>
    </div>
  )
}

function ResultScreen({
  result,
  coins,
  onContinue,
  onPlayAgain,
}: {
  result: GameResult
  coins: number
  onContinue: () => void
  onPlayAgain: () => void
}) {
  const reduced = useReducedMotion() ?? false
  const won = result.stars > 0
  // Win celebration shows first as an overlay; dismissing it reveals the
  // result card with the Play-again / Continue actions underneath.
  const [celebrate, setCelebrate] = useState(won)

  useEffect(() => {
    if (won) sfx.victory()
    else sfx.defeat()
  }, [won])

  const accuracy = result.total
    ? Math.round((result.correct / result.total) * 100)
    : 0

  const heading =
    result.stars >= 3 ? 'Perfect!' : result.stars >= 1 ? 'Great job!' : 'Keep trying!'
  const emoji = result.stars >= 3 ? '🏆' : result.stars >= 1 ? '🎉' : '💪'
  const cardTone = won ? 'correct' : 'wrong'

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <motion.div
        initial={reduced ? { opacity: 0 } : { scale: 0.7, opacity: 0 }}
        animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="w-full max-w-md"
      >
        <Card tone={cardTone} accent className="p-8 text-center">
          <div className="text-6xl mb-2" aria-hidden="true">
            {emoji}
          </div>
          <h2 className="kid-text text-4xl text-ink-900 mb-1">{heading}</h2>
          <p className="text-ink-700 mb-1">
            You answered {result.correct} out of {result.total}
          </p>
          <p className={`kid-text text-2xl mb-4 ${accuracyColorClass(accuracy)}`}>
            {accuracy}%
          </p>

          {/* Stars — scale with how many were earned (3 of 3 total) */}
          <div
            className="flex justify-center gap-2 my-4 text-5xl"
            role="img"
            aria-label={`${result.stars} of 3 stars earned`}
          >
            {[0, 1, 2].map((i) => (
              <Star
                key={i}
                filled={result.stars > i}
                delay={reduced ? 0 : i * 0.18}
                reduced={reduced}
              />
            ))}
          </div>

          {/* Rewards */}
          <div className="flex flex-wrap justify-center gap-3 my-4">
            <Pill tone="quest" icon="🪙" className="text-lg px-4 py-1.5">
              +{coins}
            </Pill>
            <Pill tone="ocean" icon="🎯" className="text-lg px-4 py-1.5">
              Score {result.score}
            </Pill>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button
              variant={won ? 'ghost' : 'secondary'}
              size="lg"
              className="flex-1 justify-center"
              onClick={onPlayAgain}
            >
              ↻ Play again
            </Button>
            <Button
              variant={won ? 'success' : 'ghost'}
              size="lg"
              className="flex-1 justify-center"
              onClick={onContinue}
            >
              Continue →
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Amplified win celebration — stars scale with star count, coins shown */}
      <Celebration
        open={celebrate}
        onClose={() => setCelebrate(false)}
        title={heading}
        stars={result.stars}
        coins={coins}
      />
    </div>
  )
}

function Star({
  filled,
  delay,
  reduced,
}: {
  filled: boolean
  delay: number
  reduced: boolean
}) {
  return (
    <motion.span
      initial={reduced ? { opacity: 0 } : { scale: 0, rotate: -180 }}
      animate={
        reduced
          ? { opacity: filled ? 1 : 0.25 }
          : { scale: 1, rotate: 0, opacity: filled ? 1 : 0.25 }
      }
      transition={{ delay, type: 'spring', stiffness: 260, damping: 12 }}
      className={filled ? 'text-quest-500' : 'text-ink-500/40'}
      aria-hidden="true"
    >
      {filled ? '★' : '☆'}
    </motion.span>
  )
}
