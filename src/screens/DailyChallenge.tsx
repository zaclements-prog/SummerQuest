import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createProvider } from '../lib/providers'
import { effectiveConfigForStage } from '../lib/gradeTiers'
import { useProgress } from '../store/progress'
import ConceptPlay from '../games/ConceptPlay'
import type { GameResult } from './GameRunner'
import { sfx } from '../lib/sound'
import { DAILY_BONUS, DAILY_QUESTION_COUNT, todayStr, pickTodaysChallenge } from '../lib/daily'
import {
  Card,
  Button,
  Medallion,
  Pill,
  StarRating,
  ErrorState,
  Celebration,
  TopBar,
  TONES,
  toneOf,
} from '../components/ui'
import { useEntrance } from '../lib/motion'
import { useWorldUi } from '../world/useWorldUi'
import { motion } from 'framer-motion'

export default function DailyChallenge() {
  const navigate = useNavigate()
  const addCoins = useProgress((s) => s.addCoins)
  const claimDaily = useProgress((s) => s.claimDaily)
  const claimedDate = useProgress((s) => s.dailyClaimedDate)
  const recordSession = useProgress((s) => s.recordSession)
  // Started from the Schoolhouse in the 3D World? Then leaving goes back there.
  const exitPath = useWorldUi((s) => s.enteredFromWorld) ? '/world' : '/map'
  const exitLabel = exitPath === '/world' ? 'Back to the World' : 'Back to map'

  const { zone, stage } = useMemo(() => pickTodaysChallenge(), [])

  // Provider creation can throw on a malformed config — capture it so we can show
  // a friendly retry path instead of crashing the screen.
  const [attempt, setAttempt] = useState(0)
  const providerResult = useMemo(() => {
    try {
      // Grade tiers: the profile grade scales today's stage difficulty.
      const idx = Math.max(zone.stages.findIndex((s) => s.id === stage.id), 0)
      const cfg = effectiveConfigForStage(stage, idx, useProgress.getState().player?.grade)
      return { provider: createProvider(cfg), error: false as const }
    } catch {
      return { provider: null, error: true as const }
    }
    // re-run on retry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, attempt])

  const [result, setResult] = useState<{ res: GameResult; reward: number } | null>(null)
  const [celebrationOpen, setCelebrationOpen] = useState(false)

  const alreadyClaimed = claimedDate === todayStr()
  const tone = toneOf(zone.themeColor)
  const { container, item } = useEntrance()

  // ── Already finished today ─────────────────────────────────────────────────
  if (alreadyClaimed && !result) {
    return (
      <Screen>
        <Header exitPath={exitPath} />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card tone="quest" accent className="relative overflow-hidden p-8 max-w-md w-full text-center flex flex-col items-center">
            <div className="absolute left-1/2 top-16 -translate-x-1/2 -translate-y-1/2 w-64 h-64 sunburst pointer-events-none" aria-hidden="true" />
            <Medallion tone="quest" size="xl" className="relative mb-3">🌟</Medallion>
            <h2 className="relative kid-text font-bold text-3xl text-ink-900 mb-2">All done for today!</h2>
            <p className="relative text-ink-700 text-lg mb-6">
              You already finished today's challenge. Come back tomorrow for a brand-new one!
            </p>
            <div className="relative w-full flex">
              <Button variant="primary" size="lg" to={exitPath} className="w-full justify-center">
                ← {exitLabel}
              </Button>
            </div>
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
        <Header exitPath={exitPath} />
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="w-full max-w-md"
          >
            <Card tone={great ? 'correct' : 'quest'} accent className="p-8 text-center">
              <motion.div variants={item} className="flex justify-center mb-3">
                <Medallion tone={great ? 'correct' : 'quest'} size="xl">
                  {great ? '🎉' : '💪'}
                </Medallion>
              </motion.div>
              <motion.h2 variants={item} className="kid-text font-bold text-3xl text-ink-900 mb-2">
                Daily Challenge complete!
              </motion.h2>

              <motion.div variants={item} className="flex justify-center my-3">
                <StarRating earned={res.stars} total={3} size="lg" />
              </motion.div>

              <motion.p variants={item} className="text-ink-700 text-lg mb-4">
                You got <span className="kid-text text-ink-900">{res.correct}</span> of{' '}
                {res.total} correct
              </motion.p>

              <motion.div variants={item} className="flex justify-center gap-2 mb-6">
                <Pill tone="quest" icon="🪙" className="text-lg px-4">+{reward} coins</Pill>
              </motion.div>

              <motion.div variants={item} className="flex">
                <Button variant="success" size="lg" to={exitPath} className="w-full justify-center">
                  {exitLabel} →
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
        <Header exitPath={exitPath} />
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
      <Header exitPath={exitPath} />

      {/* Topic banner + progress affordance */}
      <div className="px-4">
        <div className="max-w-2xl mx-auto">
          <Card tone={tone} accent className={`px-4 py-3 mb-2 ${TONES[tone].soft}`}>
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center">
              <span className="kid-text text-lg text-ink-900 inline-flex items-center gap-2">
                <Medallion tone={tone} size="sm">{zone.emoji}</Medallion>
                <span>
                  Today's topic: <span className={`font-bold ${TONES[tone].text}`}>{zone.title}</span>
                </span>
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
            <span className="text-ink-700 kid-text text-sm">
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
        // meta lets each answer feed the weekly-focus coach, like a regular stage.
        meta={{ zoneId: zone.id, stageId: stage.id }}
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
        onExit={() => navigate(exitPath)}
      />
    </Screen>
  )
}

// ── Layout primitives ─────────────────────────────────────────────────────────

function Screen({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 flex flex-col">{children}</div>
}

function Header({ exitPath }: { exitPath: string }) {
  return <TopBar back={{ to: exitPath, label: 'Quit' }} icon="🌟" title="Daily Challenge" />
}
