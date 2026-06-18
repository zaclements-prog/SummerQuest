import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useProgress } from '../store/progress'
import { useSettings } from '../store/settings'
import { curriculum } from '../curriculum'
import DailyGoalCard from '../components/DailyGoalCard'
import {
  Card,
  Button,
  PageHeader,
  ProgressBar,
  StarRating,
  Pill,
  EmptyState,
  Celebration,
} from '../components/ui'
import { accuracyColorClass, accuracyTone } from '../lib/theme'
import { useEntrance, hoverPop, tap } from '../lib/motion'

export default function ParentDashboard() {
  const { player, coins, zones, stats, resetPlayer } = useProgress()
  const {
    llmEnabled,
    llmAvailable,
    llmLastCheck,
    llmModel,
    toggleLlm,
    refreshLlmStatus,
  } = useSettings()

  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    void refreshLlmStatus()
  }, [refreshLlmStatus])

  const { container, item } = useEntrance()

  const totalQuestions = stats.problemsAnswered
  const accuracy = totalQuestions
    ? Math.round((stats.problemsCorrect / totalQuestions) * 100)
    : 0

  function handleReset() {
    resetPlayer()
    setConfirmReset(false)
  }

  // ── Fresh-profile empty state ───────────────────────────────────────────────
  if (!player) {
    return (
      <div className="flex-1 flex flex-col p-4">
        <div className="max-w-3xl w-full mx-auto flex flex-col gap-4">
          <PageHeader title="Parent Dashboard" back={{ to: '/', label: 'Home' }} />
          <EmptyState
            emoji="👋"
            title="No profile yet"
            message="Have your child set up their avatar to start their quest — progress and stats will show up here."
            cta={{ label: 'Set up a player', to: '/' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-4">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-3xl w-full mx-auto flex flex-col gap-4"
      >
        <PageHeader
          title="Parent Dashboard"
          back={{ to: '/map', label: 'Back to game' }}
        />

        {/* ── Profile ───────────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <Card tone="ocean" accent className="overflow-hidden">
            <div className="bg-gradient-to-br from-ocean-500 to-ocean-700 p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-5xl ring-4 ring-paper/70 shadow-lg shrink-0"
                  style={{ background: player.color }}
                  aria-hidden="true"
                >
                  {player.emoji}
                </div>
                <div className="min-w-0">
                  <div className="kid-text text-3xl text-sky truncate">
                    {player.name}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Pill tone="wrong" icon="🔥">
                      {stats.streakDays} day streak
                    </Pill>
                    <Pill tone="quest" icon="🪙">
                      {coins} coins
                    </Pill>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── Activity ──────────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <Panel emoji="📊" title="Activity" accentClass="text-island-700">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Stat label="Questions" value={totalQuestions} tone="text-ocean-700" />
              <Stat label="Correct" value={stats.problemsCorrect} tone="text-island-700" />
              <Stat
                label="Accuracy"
                value={`${accuracy}%`}
                tone={accuracyColorClass(accuracy)}
                pill={
                  totalQuestions > 0 ? (
                    <Pill tone={accuracyTone(accuracy)}>
                      {accuracyTone(accuracy) === 'correct'
                        ? 'Great'
                        : accuracyTone(accuracy) === 'quest'
                          ? 'Good'
                          : 'Practicing'}
                    </Pill>
                  ) : undefined
                }
              />
            </div>

            <Button
              to="/progress"
              variant="secondary"
              size="lg"
              className="w-full justify-center mt-4"
            >
              📈 Sessions & performance trends →
            </Button>
          </Panel>
        </motion.div>

        {/* ── Daily goal ────────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <Panel emoji="🎯" title="Daily goal" accentClass="text-quest-700">
            <DailyGoalCard variant="light" />
          </Panel>
        </motion.div>

        {/* ── Zone progress ─────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <Panel emoji="🗺️" title="Zone progress" accentClass="text-ocean-700">
            <div className="flex flex-col gap-3">
              {curriculum.zones.map((z) => {
                const progress = zones[z.id]
                const possible = z.stages.reduce(
                  (s, st) => s + st.starsToEarn,
                  0,
                )
                const earned = progress
                  ? Object.values(progress.stages).reduce(
                      (s, st) => s + st.stars,
                      0,
                    )
                  : 0
                const attempts = progress
                  ? Object.values(progress.stages).reduce(
                      (s, st) => s + st.attempts,
                      0,
                    )
                  : 0
                const active = z.available && possible > 0
                return (
                  <div
                    key={z.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-ink-500/5"
                  >
                    <div
                      className={`text-3xl shrink-0 ${active ? '' : 'grayscale opacity-50'}`}
                      aria-hidden="true"
                    >
                      {z.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="kid-text text-lg text-ink-900 truncate">
                        {z.title}
                      </div>
                      {active ? (
                        <div className="mt-1">
                          <ProgressBar value={earned} max={possible} tone="quest" />
                          <div className="flex items-center justify-between mt-1.5">
                            <StarRating earned={earned} total={possible} size="sm" />
                            <span className="text-xs text-ink-700">
                              {attempts} {attempts === 1 ? 'try' : 'tries'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-ink-500 mt-0.5">
                          {z.available ? z.subtitle : '🔒 Locked'}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>
        </motion.div>

        {/* ── AI settings ───────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <Panel emoji="🤖" title="AI settings" accentClass="text-monster-700">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="kid-text text-lg text-ink-900">
                  Use AI for Word Problems, Reading & Writing
                </div>
                <div className="text-sm text-ink-700">
                  Generates fresh problems, passages, and grades writing using
                  your local AI server (oMLX).
                </div>
              </div>
              <Toggle
                checked={llmEnabled}
                onChange={toggleLlm}
                label="Use AI for generated content"
              />
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 pt-3 border-t border-ink-500/15">
              <Pill
                tone={
                  llmAvailable === true
                    ? 'correct'
                    : llmAvailable === false
                      ? 'wrong'
                      : 'ink'
                }
                icon={llmAvailable === null ? '○' : '●'}
              >
                {llmAvailable === true
                  ? 'Connected'
                  : llmAvailable === false
                    ? 'Offline'
                    : 'Checking…'}
              </Pill>
              <span className="text-sm text-ink-700">
                Model: <code className="text-xs">{llmModel}</code>
              </span>
              <Button
                variant="ghost"
                size="md"
                onClick={() => void refreshLlmStatus()}
                className="sm:ml-auto"
              >
                🔄 Recheck
              </Button>
            </div>

            {llmAvailable === false && (
              <p className="text-xs text-ink-500 mt-3">
                Tip: start oMLX (or set <code>VITE_OMLX_URL</code> in{' '}
                <code>.env.local</code>) then restart the dev server.
                {llmLastCheck && (
                  <> Last checked {new Date(llmLastCheck).toLocaleTimeString()}.</>
                )}
              </p>
            )}
          </Panel>
        </motion.div>

        {/* ── Danger zone ───────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <Card tone="wrong" accent className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl" aria-hidden="true">
                ⚠️
              </span>
              <h2 className="kid-text text-xl text-wrong-700">Danger zone</h2>
            </div>
            <p className="text-sm text-ink-700 mb-4">
              Progress is saved locally in this browser only. Resetting deletes
              the player profile, coins, and stage records. This cannot be undone.
            </p>
            <Button
              variant="danger"
              size="md"
              onClick={() => setConfirmReset(true)}
              className="w-full sm:w-auto justify-center"
            >
              🗑️ Reset all progress
            </Button>
          </Card>
        </motion.div>
      </motion.div>

      {/* ── Reset confirmation modal ────────────────────────────────────── */}
      <Celebration
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset all progress?"
      >
        <div className="flex flex-col gap-4">
          <p className="text-ink-700">
            This deletes <strong>{player.name}</strong>'s profile, coins, and stage
            records. This cannot be undone.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setConfirmReset(false)}
              className="flex-1 justify-center"
            >
              Keep my progress
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleReset}
              className="flex-1 justify-center"
            >
              🗑️ Yes, reset
            </Button>
          </div>
        </div>
      </Celebration>
    </div>
  )
}

// ── Inline sub-components ──────────────────────────────────────────────────────

/** A titled section panel: rounded-3xl Card with a colored emoji header. */
function Panel({
  emoji,
  title,
  accentClass,
  children,
}: {
  emoji: string
  title: string
  accentClass: string
  children: ReactNode
}) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl" aria-hidden="true">
          {emoji}
        </span>
        <h2 className={`kid-text text-xl ${accentClass}`}>{title}</h2>
      </div>
      {children}
    </Card>
  )
}

/** An accent stat tile with a big numeral. */
function Stat({
  label,
  value,
  tone,
  pill,
}: {
  label: string
  value: number | string
  tone: string
  pill?: ReactNode
}) {
  return (
    <div className="bg-ink-500/5 rounded-2xl p-4 text-center flex flex-col items-center justify-center gap-1">
      <div className={`kid-text text-4xl sm:text-5xl ${tone}`}>{value}</div>
      <div className="text-xs text-ink-700 uppercase tracking-wide">{label}</div>
      {pill}
    </div>
  )
}

/** A large (>=44px) rounded on/off toggle replacing the native checkbox. */
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      whileHover={hoverPop}
      whileTap={tap}
      className={[
        'relative shrink-0 rounded-full p-1 transition-colors duration-200',
        'w-[72px] h-11 min-h-[44px] flex items-center',
        'outline-none focus-visible:ring-4 focus-visible:ring-ocean-400 focus-visible:ring-offset-2',
        checked ? 'bg-correct-600' : 'bg-ink-500/40',
      ].join(' ')}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className={[
          'w-9 h-9 rounded-full bg-paper shadow-md',
          'flex items-center justify-center text-base',
          checked ? 'ml-auto' : 'ml-0',
        ].join(' ')}
        aria-hidden="true"
      >
        {checked ? '✓' : ''}
      </motion.span>
    </motion.button>
  )
}
