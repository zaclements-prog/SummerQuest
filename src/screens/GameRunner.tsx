import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
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
}

export default function GameRunner() {
  const { zoneId = '', stageId = '' } = useParams()
  const navigate = useNavigate()
  const zone = getZone(zoneId)
  const stage = getStage(zoneId, stageId)
  const awardStage = useProgress((s) => s.awardStage)
  const addCoins = useProgress((s) => s.addCoins)
  const recordSession = useProgress((s) => s.recordSession)
  const [result, setResult] = useState<GameResult | null>(null)
  const processedResultRef = useRef<GameResult | null>(null)

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

  if (!zone || !stage || !provider) {
    return (
      <div className="text-white p-6">
        Stage not found.{' '}
        <button onClick={() => navigate('/map')}>back</button>
      </div>
    )
  }

  if (result) {
    const coinReward = result.correct * 2 + result.stars * 5
    return (
      <ResultScreen
        result={result}
        coins={coinReward}
        onContinue={() => navigate(`/zone/${zoneId}`)}
      />
    )
  }

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
    }
  })()

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-4 py-2 flex items-center justify-between text-white">
        <button
          onClick={() => {
            sfx.click()
            navigate(`/zone/${zoneId}`)
          }}
          className="kid-text"
        >
          ← Quit
        </button>
        <div className="kid-text text-lg">{stage.title}</div>
        <div className="w-16" />
      </div>
      <Game
        provider={provider}
        params={stage.params}
        onComplete={setResult}
        onExit={() => navigate(`/zone/${zoneId}`)}
      />
    </div>
  )
}

function ResultScreen({
  result,
  coins,
  onContinue,
}: {
  result: GameResult
  coins: number
  onContinue: () => void
}) {
  useEffect(() => {
    if (result.stars > 0) sfx.victory()
    else sfx.defeat()
  }, [result.stars])

  const accuracy = result.total
    ? Math.round((result.correct / result.total) * 100)
    : 0

  return (
    <div className="flex-1 flex items-center justify-center p-6 text-white">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 8 }}
        className="bg-white text-ocean-900 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
      >
        <div className="text-6xl mb-2">
          {result.stars >= 3 ? '🏆' : result.stars >= 1 ? '🎉' : '💪'}
        </div>
        <h2 className="kid-text text-4xl mb-1">
          {result.stars >= 3
            ? 'Perfect!'
            : result.stars >= 1
              ? 'Great job!'
              : 'Keep trying!'}
        </h2>
        <p className="text-gray-600 mb-4">
          You answered {result.correct} out of {result.total} ({accuracy}%)
        </p>

        <div className="flex justify-center gap-2 my-4 text-5xl">
          <Star filled={result.stars >= 1} delay={0} />
          <Star filled={result.stars >= 2} delay={0.2} />
          <Star filled={result.stars >= 3} delay={0.4} />
        </div>

        <div className="flex justify-center gap-4 my-4 kid-text">
          <div className="bg-quest-200 text-quest-900 px-4 py-2 rounded-2xl">
            🪙 +{coins}
          </div>
          <div className="bg-ocean-100 text-ocean-900 px-4 py-2 rounded-2xl">
            Score {result.score}
          </div>
        </div>

        <button
          onClick={onContinue}
          className="btn-quest bg-correct-500 text-white mt-2"
          style={{ borderColor: '#16a34a' }}
        >
          Continue →
        </button>
      </motion.div>
    </div>
  )
}

function Star({ filled, delay }: { filled: boolean; delay: number }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ delay, type: 'spring', damping: 8 }}
      style={{ opacity: filled ? 1 : 0.25 }}
    >
      ⭐
    </motion.div>
  )
}
