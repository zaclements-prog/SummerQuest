import { useCallback, useEffect, useState } from 'react'
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
  Medallion,
  Page,
  StatTile,
  TONES,
  accuracyToneOf,
  type Tone,
} from '../components/ui'
import { useEntrance } from '../lib/motion'
import ParentGate from '../components/ParentGate'
import { removeSavedKeys } from '../platform/web/storage'
import { GRADE_LABEL, GRADE_LEVELS, type GradeLevel } from '../lib/gradeTiers'
import { adultPets, hatchedPets, petStages } from '../lib/pets/growth'
import { PETS } from '../lib/pets/catalog'

export default function ParentDashboard() {
  const { player, coins, zones, stats, resetPlayer, setGrade, lessonsDone } = useProgress()
  // Pets grow from learning: a grown-up one is "raised" (it joins the avatars).
  const petGrowth = petStages(zones, lessonsDone)
  const petsRaised = adultPets(petGrowth).length
  const petsHatched = hatchedPets(petGrowth).length
  const {
    llmEnabled,
    llmAvailable,
    llmLastCheck,
    llmModel,
    toggleLlm,
    refreshLlmStatus,
  } = useSettings()

  // Reset and grade change ask the grown-up check again every time, even just
  // after the one at the door (src/components/ParentGate.tsx): a reset can't be
  // undone, and a parent may hand the tablet back with this page still open.
  const [resetGate, setResetGate] = useState(false)
  const [gradeGate, setGradeGate] = useState(false)
  const [gradePick, setGradePick] = useState<GradeLevel | null>(null)

  function openGrade() {
    setGradePick(null)
    setGradeGate(true)
  }

  function applyGrade() {
    if (gradePick === null) return
    setGrade(gradePick)
    setGradeGate(false)
  }

  const openReset = () => setResetGate(true)
  const closeReset = useCallback(() => setResetGate(false), [])

  useEffect(() => {
    if (import.meta.env.VITE_STORE === 'true') return // the store build has no AI to check
    void refreshLlmStatus()
  }, [refreshLlmStatus])

  const { container, item } = useEntrance()

  const totalQuestions = stats.problemsAnswered
  const accuracy = totalQuestions
    ? Math.round((stats.problemsCorrect / totalQuestions) * 100)
    : 0

  function handleReset() {
    resetPlayer()
    removeSavedKeys('sq-best-') // the mini-games' personal bests
    setResetGate(false)
  }

  // ── Fresh-profile empty state ───────────────────────────────────────────────
  if (!player) {
    return (
      <Page width="lg">
        <PageHeader title="Parent Dashboard" back={{ to: '/', label: 'Home' }} className="!mb-0" />
        <EmptyState
          emoji="👋"
          title="No profile yet"
          message="Have your child set up their avatar to start their quest — progress and stats will show up here."
          cta={{ label: 'Set up a player', to: '/' }}
        />
      </Page>
    )
  }

  return (
    <div className="flex-1 flex flex-col px-4 pt-5 pb-10 sm:px-6 sm:pt-6">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-3xl w-full mx-auto flex flex-col gap-5"
      >
        <PageHeader
          title="Parent Dashboard"
          back={{ to: '/world', label: 'Back to game' }}
          className="!mb-0"
        />

        {/* ── Profile ───────────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <Card tone="ocean" accent className="overflow-hidden">
            <div className="bg-ocean-100 p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-5xl border-[3px] border-line shadow-ledge shrink-0"
                  style={{ background: player.color }}
                  aria-hidden="true"
                >
                  {player.emoji}
                </div>
                <div className="min-w-0">
                  <div className="kid-text font-bold text-3xl text-ink-900 truncate">
                    {player.name}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Pill tone="wrong" icon="🔥">
                      {stats.streakDays} day streak
                    </Pill>
                    <Pill tone="quest" icon="🪙">
                      {coins} coins
                    </Pill>
                    <button
                      type="button"
                      onClick={openGrade}
                      className={[
                        'inline-flex items-center gap-1.5 rounded-full px-3.5 min-h-12 kid-text text-base',
                        'bg-paper text-ink-900 border-2 border-line shadow-ledge-sm',
                        'hover:bg-cream-100 active:translate-y-0.5 transition-colors',
                        'outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70',
                      ].join(' ')}
                      aria-label={`Grade: ${GRADE_LABEL[player.grade]}. Change grade (grown-ups)`}
                    >
                      🎒 {GRADE_LABEL[player.grade]} · change
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ── Activity ──────────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <Panel emoji="📊" title="Activity" tone="island">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <StatTile icon="❓" label="Questions" value={totalQuestions} tone="ocean" />
              <StatTile icon="✅" label="Correct" value={stats.problemsCorrect} tone="island" />
              <StatTile
                icon="🎯"
                label="Accuracy"
                value={`${accuracy}%`}
                tone={accuracyToneOf(accuracy)}
                footer={
                  totalQuestions > 0 ? (
                    <Pill tone="ink" className="mt-1">
                      {accuracyToneOf(accuracy) === 'correct'
                        ? 'Great'
                        : accuracyToneOf(accuracy) === 'quest'
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
              className="w-full justify-center mt-5"
            >
              📈 Sessions & performance trends →
            </Button>
          </Panel>
        </motion.div>

        {/* ── Daily goal ────────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <Panel emoji="🎯" title="Daily goal" tone="quest">
            <DailyGoalCard variant="light" />
          </Panel>
        </motion.div>

        {/* ── Zone progress ─────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <Panel emoji="🗺️" title="Zone progress" tone="ocean">
            <p className="text-base text-ink-700 mb-3">
              🐾 Pets raised: <b className="text-ink-900">{petsRaised} of {PETS.length}</b>
              <span className="text-ink-500"> · {petsHatched} hatched (each zone&apos;s pet grows as your child earns its stars)</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    className="flex items-center gap-3 p-3 rounded-[1.25rem] bg-cream-100 border-2 border-line/10"
                  >
                    <Medallion size="md" className={active ? '' : 'grayscale opacity-60'}>
                      {z.emoji}
                    </Medallion>
                    <div className="flex-1 min-w-0">
                      <div className="kid-text text-lg text-ink-900 truncate">
                        {z.title}
                      </div>
                      {active ? (
                        <div className="mt-1">
                          <ProgressBar value={earned} max={possible} tone="quest" />
                          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 mt-1.5">
                            <StarRating earned={earned} total={possible} size="sm" />
                            <span className="text-sm text-ink-700 whitespace-nowrap">
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

        {/* ── AI settings (not in the store build: it ships no AI) ─────── */}
        {import.meta.env.VITE_STORE !== 'true' && (
          <motion.div variants={item}>
            <Panel emoji="🤖" title="AI settings" tone="monster">
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

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 pt-4 border-t-2 border-line/10">
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
                  onClick={() => void refreshLlmStatus(true)}
                  className="sm:ml-auto"
                >
                  🔄 Recheck
                </Button>
              </div>

              {llmAvailable === false && (
                <p className="text-sm text-ink-700 mt-3">
                  Tip: start oMLX (or set <code>VITE_OMLX_URL</code> in{' '}
                  <code>.env.local</code>) then restart the dev server.
                  {llmLastCheck && (
                    <> Last checked {new Date(llmLastCheck).toLocaleTimeString()}.</>
                  )}
                </p>
              )}
            </Panel>
          </motion.div>
        )}

        {/* ── Danger zone ───────────────────────────────────────────────── */}
        <motion.div variants={item}>
          <Card tone="wrong" accent className="p-5 sm:p-6 !bg-wrong-50">
            <div className="flex items-center gap-3 mb-3">
              <Medallion tone="wrong" size="sm">
                ⚠️
              </Medallion>
              <h2 className="kid-text font-bold text-2xl text-wrong-800">Danger zone</h2>
            </div>
            <p className="text-base text-ink-700 mb-4">
              Progress is saved locally in this browser only. Resetting deletes
              the player profile, coins, and stage records. This cannot be undone.
            </p>
            <Button
              variant="danger"
              size="md"
              onClick={openReset}
              className="w-full sm:w-auto justify-center"
            >
              🗑️ Reset all progress
            </Button>
          </Card>
        </motion.div>
      </motion.div>

      {/* ── Reset (grown-ups only, asked every time) ─────────────────── */}
      <ParentGate
        open={resetGate}
        emoji="⚠️"
        passLabel="🗑️ Yes, reset"
        passVariant="danger"
        onPass={handleReset}
        onCancel={closeReset}
      >
        <p className="kid-text text-xl text-ink-900 mb-1">Reset all progress?</p>
        <p>
          This deletes <strong>{player.name}</strong>'s profile, coins, and stage
          records. This cannot be undone.
        </p>
      </ParentGate>

      {/* ── Grade change (grown-ups only, asked every time) ──────────── */}
      <ParentGate
        open={gradeGate}
        emoji="🎒"
        passLabel="✅ Save grade"
        passVariant="success"
        passDisabled={gradePick === null}
        onPass={applyGrade}
        onCancel={() => setGradeGate(false)}
      >
        <p className="kid-text text-xl text-ink-900 mb-1">Change grade level?</p>
        <p className="mb-3">
          This changes how hard {player.name}&apos;s quests are — numbers,
          fractions, and reading passages. Star progress is kept.
        </p>
        <div role="radiogroup" aria-label="New grade" className="grid grid-cols-3 gap-2 text-left">
          {GRADE_LEVELS.map((g) => {
            const selected = gradePick === g
            return (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setGradePick(g)}
                className={[
                  'min-h-[52px] rounded-2xl kid-text text-base border-[3px] border-line transition-colors',
                  'outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70',
                  selected
                    ? 'bg-quest-400 text-ink-900 shadow-ledge-sm'
                    : 'bg-paper text-ink-900 hover:bg-cream-100',
                  g === player.grade ? 'opacity-60' : '',
                ].join(' ')}
              >
                {GRADE_LABEL[g]}
                {g === player.grade ? ' (now)' : ''}
              </button>
            )
          })}
        </div>
      </ParentGate>
    </div>
  )
}

// ── Inline sub-components ──────────────────────────────────────────────────────

/** A titled section panel: a toon Card with a colored token + heading. */
function Panel({
  emoji,
  title,
  tone,
  children,
}: {
  emoji: string
  title: string
  tone: Tone
  children: ReactNode
}) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <Medallion tone={tone} size="sm">
          {emoji}
        </Medallion>
        <h2 className={`kid-text font-bold text-2xl ${TONES[tone].text}`}>{title}</h2>
      </div>
      {children}
    </Card>
  )
}

/** A large (>=48px) rounded on/off toggle replacing the native checkbox. */
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
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={[
        'relative shrink-0 rounded-full p-1 transition-colors duration-200',
        'w-[80px] h-12 flex items-center border-[3px] border-line shadow-ledge-sm',
        'outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70 focus-visible:ring-offset-2',
        checked ? 'bg-correct-400' : 'bg-cream-200',
      ].join(' ')}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className={[
          'w-9 h-9 rounded-full bg-paper border-2 border-line',
          'flex items-center justify-center text-base kid-text text-ink-900',
          checked ? 'ml-auto' : 'ml-0',
        ].join(' ')}
        aria-hidden="true"
      >
        {checked ? '✓' : ''}
      </motion.span>
    </button>
  )
}
