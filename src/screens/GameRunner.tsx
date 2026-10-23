import { useNavigate, useParams } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { getStage, getZone, zoneStages } from '../curriculum'
import { useProgress } from '../store/progress'
import { effectiveConfigForStage } from '../lib/gradeTiers'
import { createProvider } from '../lib/providers'
import type { ProblemProvider } from '../lib/problem'
import ConceptPlay from '../games/ConceptPlay'
import SpeedRun from '../games/SpeedRun'
import BossBattle from '../games/BossBattle'
import TowerDefense from '../games/tower-defense/TowerDefense'
import WritingPad from '../games/WritingPad'
import { CloudKeeper, CritterParade, DivisionArena, FractionForge, ListenPlay, TimesGrove } from '../games/lazyGames'
import { ListenResultCard } from '../games/listenPlay/ListenResultCard'
import { ListenQuitDialog } from '../components/listen/ListenQuitDialog'
import { isListenMode } from '../lib/gradeBand'
import { sfx } from '../lib/sound'
import {
  Card,
  Button,
  Pill,
  ConfirmDialog,
  ErrorState,
  Medallion,
  TopBar,
  ToonStar,
} from '../components/ui'
import { ConfettiBurst } from '../components/ui/Celebration'
import { resultCopy } from './resultCopy'
import { isStageUnlocked } from '../lib/stageLocks'
import { useWorldUi } from '../world/useWorldUi'

const ARENA_3D = new Set(['divisionArena', 'fractionForge', 'cloudKeeper', 'timesGrove', 'critterParade'])

export interface GameResult {
  stars: number
  score: number
  correct: number
  total: number
  /**
   * How the game itself ended, when stars alone don't say it (Tower Battlefront:
   * "The base fell at wave 4"). The result screen's headline comes from this.
   */
  outcome?: { headline: string; detail?: string; lost?: boolean }
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
  // The profile grade picks the zone's stage set (K–1 / 2–4 / 5) and its difficulty.
  const grade = useProgress((s) => s.player?.grade)
  const zone = getZone(zoneId)
  const stage = getStage(zoneId, stageId, grade)
  const awardStage = useProgress((s) => s.awardStage)
  const addCoins = useProgress((s) => s.addCoins)
  const recordSession = useProgress((s) => s.recordSession)
  const zoneProgress = useProgress((s) => s.zones[zoneId])
  // K–1 (or a Listen & Play stage): results and chrome without reading.
  const listen = stage?.gameId === 'listenPlay' || (grade !== undefined && isListenMode(grade))
  // Launched from the 3D World? Then leaving the game goes back there.
  const fromWorld = useWorldUi((s) => s.enteredFromWorld)
  const exitPath = fromWorld ? '/world' : `/zone/${zoneId}`
  const [result, setResult] = useState<GameResult | null>(null)
  const [confirmQuit, setConfirmQuit] = useState(false)
  const processedResultRef = useRef<GameResult | null>(null)
  const closeQuit = useCallback(() => setConfirmQuit(false), [])

  const provider = useMemo(() => {
    if (!stage) return null
    // Grade tiers: the profile grade scales the stage's difficulty knobs;
    // the stage index picks the bank level for static-bank zones.
    const z = getZone(zoneId)
    const stages = z ? zoneStages(z, grade) : []
    const idx = Math.max(stages.findIndex((s) => s.id === stageId), 0)
    return createProvider(
      effectiveConfigForStage(stage, Math.max(idx, 0), grade),
    )
  }, [stage, zoneId, stageId, grade])

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
          message="We couldn't find that adventure. Let's head back to the World."
          back={{ label: 'Back to the World', to: '/world' }}
        />
      </div>
    )
  }

  // ── Locked stage (deep link / old bookmark) ────────────────────────────────
  // Checked before any result exists: finishing a stage can't re-lock it.
  if (!result && !isStageUnlocked(zone, stageId, zoneProgress, grade)) {
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
    if (listen) {
      return (
        <ListenResultCard
          stars={result.stars}
          coins={coinReward}
          onNext={() => navigate(exitPath)}
          onReplay={() => {
            processedResultRef.current = null
            setConfirmQuit(false)
            setResult(null)
          }}
        />
      )
    }
    return (
      <ResultScreen
        result={result}
        coins={coinReward}
        onContinue={() => navigate(exitPath)}
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
      case 'divisionArena':
        return DivisionArena
      case 'fractionForge':
        return FractionForge
      case 'cloudKeeper':
        return CloudKeeper
      case 'timesGrove':
        return TimesGrove
      case 'critterParade':
        return CritterParade
      case 'writingPad':
        return WritingPad
      case 'listenPlay':
        return ListenPlay
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

  // The 3D arenas clear their canvas to this soft sky; giving the chrome the same
  // backdrop keeps the top bar from sitting on a visible seam.
  const arena3d = ARENA_3D.has(stage.gameId)

  return (
    <div className={`flex-1 flex flex-col ${arena3d ? 'bg-[#d9effa]' : ''}`}>
      {/* ── Host top bar ──────────────────────────────────────────────────── */}
      <TopBar back={{ label: 'Quit', onClick: () => setConfirmQuit(true), iconOnly: listen }} icon={zone.emoji} title={listen ? '' : stage.title} />

      <Game
        provider={provider}
        params={stage.params}
        onComplete={(r) => {
          setConfirmQuit(false)
          setResult(r)
        }}
        onExit={() => navigate(exitPath)}
        meta={{ zoneId, stageId }}
        paused={confirmQuit}
      />

      {/* ── Quit confirmation (the game is paused while this is open) ─────── */}
      {listen ? (
        // K–1: asked out loud, answered with a big ✓ (leave) or ↺ (keep playing)
        <ListenQuitDialog open={confirmQuit} onLeave={() => navigate(exitPath)} onStay={closeQuit} />
      ) : (
      <ConfirmDialog
        open={confirmQuit}
        emoji="🚪"
        title="Quit this game?"
        confirmLabel={fromWorld ? 'Back to the World' : 'Quit to zone'}
        cancelLabel="Keep playing"
        onConfirm={() => navigate(exitPath)}
        onCancel={closeQuit}
      >
        This round won't count, but the stars you already earned are safe. 🌟
      </ConfirmDialog>
      )}
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
  // Headline + praise from the stars and how the game ended (not a percentage).
  // One screen, no extra "Awesome!" pop-up on top: a 3D game has already shown
  // its own results card, so this is the last tap before the map.
  const { heading, praise, emoji, won } = resultCopy(result)
  const cleared = result.stars > 0

  useEffect(() => {
    if (won) sfx.victory()
    else sfx.defeat()
  }, [won])

  const cardTone = won ? 'correct' : 'wrong'

  return (
    <div className="flex-1 flex items-center justify-center p-6 short:p-3">
      <motion.div
        initial={reduced ? { opacity: 0 } : { scale: 0.7, opacity: 0 }}
        animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="w-full max-w-md short:max-w-2xl"
      >
        {/* Phone held sideways: score on the left, stars + buttons on the right,
            so Play again / Continue are on screen without scrolling. */}
        <Card tone={cardTone} accent className="relative overflow-hidden p-7 sm:p-8 short:p-5 text-center short:grid short:grid-cols-2 short:items-center short:gap-x-6">
          <div
            className={`absolute inset-x-0 top-0 h-40 bg-gradient-to-b ${won ? 'from-correct-100' : 'from-wrong-100'} to-transparent`}
            aria-hidden="true"
          />
          {won && (
            <div
              className="absolute left-1/2 short:left-1/4 top-16 -translate-x-1/2 -translate-y-1/2 w-72 h-72 sunburst pointer-events-none"
              aria-hidden="true"
            />
          )}
          {won && <ConfettiBurst reduced={reduced} />}
          <div className="relative">
          <div className="relative flex justify-center mb-3 short:mb-2">
            <Medallion tone={won ? 'quest' : 'wrong'} size="xl">
              {emoji}
            </Medallion>
          </div>
          <h2 className="relative kid-text font-bold text-4xl short:text-3xl text-ink-900 mb-1">{heading}</h2>
          {praise && <p className="relative kid-text text-xl text-ink-900 mb-1">{praise}</p>}
          {result.total > 0 && (
            <p className="relative text-ink-700 text-lg mb-2">
              {result.correct} of {result.total} right on the first try
            </p>
          )}
          </div>

          <div className="relative">

          {/* Stars — scale with how many were earned (3 of 3 total) */}
          <div
            className="relative flex justify-center items-end gap-1 my-5 short:mt-0 short:mb-3"
            role="img"
            aria-label={`${result.stars} of 3 stars earned`}
          >
            {[0, 1, 2].map((i) => (
              <Star
                key={i}
                filled={result.stars > i}
                delay={reduced ? 0 : i * 0.18}
                reduced={reduced}
                big={i === 1}
              />
            ))}
          </div>

          {/* Rewards */}
          <div className="relative flex flex-wrap justify-center gap-3 my-4 short:my-3">
            <Pill tone="quest" icon="🪙" className="text-lg px-4 py-1">
              +{coins}
            </Pill>
            <Pill tone="ocean" icon="🎯" className="text-lg px-4 py-1">
              Score {result.score}
            </Pill>
          </div>

          {/* Actions */}
          <div className="relative flex flex-col sm:flex-row gap-3 mt-6 short:mt-3">
            <Button
              variant={cleared ? 'ghost' : 'secondary'}
              size="lg"
              className="flex-1 justify-center"
              onClick={onPlayAgain}
            >
              ↻ Play again
            </Button>
            <Button
              variant={cleared ? 'success' : 'ghost'}
              size="lg"
              className="flex-1 justify-center"
              onClick={onContinue}
            >
              Continue →
            </Button>
          </div>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

function Star({
  filled,
  delay,
  reduced,
  big = false,
}: {
  filled: boolean
  delay: number
  reduced: boolean
  big?: boolean
}) {
  return (
    <motion.span
      initial={reduced ? { opacity: 0 } : { scale: 0, rotate: -180 }}
      animate={
        reduced
          ? { opacity: filled ? 1 : 0.6 }
          : { scale: 1, rotate: 0, opacity: filled ? 1 : 0.6 }
      }
      transition={{ delay, type: 'spring', stiffness: 260, damping: 12 }}
      className={big ? '-translate-y-2' : ''}
      aria-hidden="true"
    >
      <ToonStar filled={filled} px={big ? 68 : 54} />
    </motion.span>
  )
}
