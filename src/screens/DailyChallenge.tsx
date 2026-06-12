import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { createProvider } from '../lib/providers'
import { useProgress } from '../store/progress'
import ConceptPlay from '../games/ConceptPlay'
import type { GameResult } from './GameRunner'
import { sfx } from '../lib/sound'
import { DAILY_BONUS, DAILY_QUESTION_COUNT, todayStr, pickTodaysZone } from '../lib/daily'

export default function DailyChallenge() {
  const navigate = useNavigate()
  const addCoins = useProgress((s) => s.addCoins)
  const claimDaily = useProgress((s) => s.claimDaily)
  const claimedDate = useProgress((s) => s.dailyClaimedDate)
  const recordSession = useProgress((s) => s.recordSession)

  const zone = useMemo(() => pickTodaysZone(), [])
  const stage = zone.stages[0]
  const provider = useMemo(() => createProvider(stage.providerConfig), [stage])
  const [result, setResult] = useState<{ res: GameResult; reward: number } | null>(null)

  const alreadyClaimed = claimedDate === todayStr()

  if (alreadyClaimed && !result) {
    return (
      <Centered>
        <div className="text-6xl mb-2">🌟</div>
        <h2 className="kid-text text-3xl mb-1">All done for today!</h2>
        <p className="text-white/90 mb-4">
          You already finished today's challenge. Come back tomorrow for a new one!
        </p>
        <Link to="/map" className="btn-quest bg-quest-500 text-quest-900 inline-block" style={{ borderColor: '#c69b02' }}>
          Back to map
        </Link>
      </Centered>
    )
  }

  if (result) {
    return (
      <Centered>
        <div className="text-6xl mb-2">{result.res.stars >= 2 ? '🎉' : '💪'}</div>
        <h2 className="kid-text text-3xl mb-1">Daily Challenge complete!</h2>
        <p className="text-white/90 mb-1">
          {result.res.correct} of {result.res.total} correct
        </p>
        <div className="kid-text text-2xl my-3 bg-quest-200 text-quest-900 inline-block px-4 py-2 rounded-2xl">
          🪙 +{result.reward} coins
        </div>
        <div>
          <Link to="/map" className="btn-quest bg-correct-500 text-white inline-block" style={{ borderColor: '#16a34a' }}>
            Back to map →
          </Link>
        </div>
      </Centered>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-4 py-2 flex items-center justify-between text-white">
        <button onClick={() => { sfx.click(); navigate('/map') }} className="kid-text">
          ← Quit
        </button>
        <div className="kid-text text-lg">🌟 Daily Challenge</div>
        <div className="w-16" />
      </div>
      <div className="text-center text-white/90 kid-text mb-1">
        Today's topic: {zone.emoji} {zone.title} · finish for +{DAILY_BONUS} bonus coins
      </div>
      <ConceptPlay
        provider={provider}
        params={{ questionCount: DAILY_QUESTION_COUNT }}
        onComplete={(res) => {
          const reward = DAILY_BONUS + res.correct * 2
          addCoins(reward)
          claimDaily()
          recordSession({
            zoneId: zone.id,
            zoneTitle: zone.title,
            zoneEmoji: zone.emoji,
            stageId: stage.id,
            stageTitle: `Daily Challenge · ${zone.title}`,
            kind: 'daily',
            correct: res.correct,
            total: res.total,
            stars: res.stars,
            score: res.score,
          })
          if (res.stars >= 2) sfx.victory()
          setResult({ res, reward })
        }}
        onExit={() => navigate('/map')}
      />
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6 text-white text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md"
      >
        {children}
      </motion.div>
    </div>
  )
}
