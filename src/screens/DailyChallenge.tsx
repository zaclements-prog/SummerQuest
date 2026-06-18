import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createProvider } from '../lib/providers'
import { useProgress } from '../store/progress'
import ConceptPlay from '../games/ConceptPlay'
import type { GameResult } from './GameRunner'
import { sfx } from '../lib/sound'
import { DAILY_BONUS, DAILY_QUESTION_COUNT, todayStr, pickTodaysZone } from '../lib/daily'
import {
  Card,
  Button,
  BackButton,
  Pill,
  StarRating,
  ErrorState,
  Celebration,
} from '../components/ui'
import { subjectTheme, type Subject } from '../lib/theme'
import { useEntrance } from '../lib/motion'
import { motion } from 'framer-motion'

export default function DailyChallenge() {
  const navigate = useNavigate()
  const addCoins = useProgress((s) => s.addCoins)
  const claimDaily = useProgress((s) => s.claimDaily)
  const claimedDate = useProgress((s) => s.dailyClaimedDate)
  const recordSession = useProgress((s) => s.recordSession)

  const zone = useMemo(() => pickTodaysZone(), [])
  const stage = zone.stages[0]

  // Provider creation can throw on a malformed config — capture it so we can show
  // a friendly retry path instead of crashing the screen.
  const [attempt, setAttempt] = useState(0)
  const providerResult = useMemo(() => {
    try {
      return { provider: createProvider(stage.providerConfig), error: false as const }
    } catch {
      return { provider: null, error: true as const }
    }
    // re-run on retry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, attempt])

  const [result, setResult] = useState<{ res: GameResult; reward: number } | null>(null)
  const [celebrationOpen, setCelebrationOpen] = useState(false)

  const alreadyClaimed = claimedDate === todayStr()
  const theme = subjectTheme(zone.themeColor as Subject)
  const { container, item } = useEntrance()

  // ── Already finished today ─────────────────────────────────────────────────
  if (alreadyClaimed && !result) {
    return (
      <Screen>
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card tone="quest" accent className="p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-3" aria-hidden="true">🌟</div>
            <h2 className="kid-text text-3xl text-ink-900 mb-2">All done for today!</h2>
            <p className="text-ink-700 mb-6">
              You already finished today's challenge. Come back tomorrow for a brand-new one!
            </p>
            <Button variant="primary" size="lg" to="/map" className="w-full justify-center">
              ← Back to map
            </Button>
          </Card>
        </div>
      </Screen>
    )
  }

  // ── Completed: results + celebration ───────────────────────────────────────
  if (result) {
    const { res, reward } = result
    const great = res.stars >= 2

    return (
      <Screen>
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="w-full max-w-md"
          >
            <Card tone={great ? 'correct' : 'quest'} accent className="p-8 text-center">
              <motion.div variants={item} className="text-6xl mb-2" aria-hidden="true">
                {great ? '🎉' : '💪'}
              </motion.div>
              <motion.h2 variants={item} className="kid-text text-3xl text-ink-900 mb-2">
                Daily Challenge complete!
              </motion.h2>

              <motion.div variants={item} className="flex justify-center my-3">
                <StarRating earned={res.stars} total={3} size="lg" />
              </motion.div>

              <motion.p variants={item} className="text-ink-700 mb-4">
                You got <span className="kid-text text-ink-900">{res.correct}</span> of{' '}
                {res.total} correct
              </motion.p>

              <motion.div variants={item} className="flex justify-center gap-2 mb-6">
                <Pill tone="quest" icon="🪙">+{reward} coins</Pill>
              </motion.div>

              <motion.div variants={item}>
                <Button variant="success" size="lg" to="/map" className="w-full justify-center">
                  Back to map →
                </Button>
              </motion.div>
            </Card>
          </motion.div>
        </div>

        {/* Staggered star/coin celebration overlay for a strong finish */}
        <Celebration
          open={celebrationOpen}
          onClose={() => setCelebrationOpen(false)}
          title="Daily Challenge done! 🌟"
          stars={res.stars}
          coins={reward}
        >
          You finished today's {zone.title} challenge — see you tomorrow!
        </Celebration>
      </Screen>
    )
  }

  // ── Provider failed to load: error + retry ─────────────────────────────────
  if (providerResult.error || !providerResult.provider) {
    return (
      <Screen>
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
          <ErrorState
            emoji="😵"
            title="Couldn't load today's challenge"
            message="Something went wrong while preparing your questions."
          />
          <Button
            variant="primary"
            size="lg"
            onClick={() => setAttempt((a) => a + 1)}
          >
            🔄 Try again
          </Button>
        </div>
      </Screen>
    )
  }

  const provider = providerResult.provider

  // ── Active challenge ───────────────────────────────────────────────────────
  return (
    <Screen>
      <Header />

      {/* Topic banner + progress affordance */}
      <div className="px-4">
        <div className="max-w-2xl mx-auto">
          <Card tone="quest" accent className="px-5 py-3 mb-2">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
              <span className="kid-text text-lg text-ink-900">
                <span aria-hidden="true">{zone.emoji}</span> Today's topic:{' '}
                <span className={theme.accent}>{zone.title}</span>
              </span>
              <Pill tone="quest" icon="🪙">+{DAILY_BONUS} bonus coins</Pill>
            </div>
          </Card>

          {/* ConceptPlay owns the live "Question X of N" progress bar below, so we
              keep just a short caption here to avoid a duplicate progress affordance. */}
          <div
            className="flex items-center justify-center mb-1"
            aria-label={`${DAILY_QUESTION_COUNT} questions in today's challenge`}
          >
            <span className="text-sky kid-text text-sm">
              {DAILY_QUESTION_COUNT} quick questions
            </span>
          </div>
        </div>
      </div>

      <ConceptPlay
        // Remounting on retry resets ConceptPlay's internal loading state.
        key={`daily-${attempt}`}
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
          if (res.stars >= 2) {
            sfx.victory()
            setCelebrationOpen(true)
          }
          setResult({ res, reward })
        }}
        onExit={() => navigate('/map')}
      />
    </Screen>
  )
}

// ── Layout primitives ─────────────────────────────────────────────────────────

function Screen({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 flex flex-col">{children}</div>
}

function Header() {
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <BackButton to="/map" label="Quit" />
      <h1 className="kid-text text-2xl sm:text-3xl text-sky drop-shadow-md flex-1 text-center">
        <span aria-hidden="true">🌟</span> Daily Challenge
      </h1>
      {/* spacer to keep the title visually centered against the back button */}
      <div className="w-[88px] flex-shrink-0" aria-hidden="true" />
    </div>
  )
}
