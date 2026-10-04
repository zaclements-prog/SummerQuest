import { motion } from 'framer-motion'
import { useProgress } from '../store/progress'
import { weeklyFocus, byDay, type FocusItem } from '../lib/analytics'
import { skillMeta } from '../tutoring/skills'
import { getZone } from '../curriculum'
import BarChart from '../components/BarChart'
import { seedSampleWeek } from '../tutoring/devSeed'
import { Card, Button, PageHeader, EmptyState, ProgressBar, Pill } from '../components/ui'
import { accuracyTone } from '../lib/theme'
import { useEntrance } from '../lib/motion'
import { playableStageId } from '../lib/stageLocks'

// ── Row sub-component ──────────────────────────────────────────────────────────

/** One weakness, with a tone-coded accuracy meter and Practice/Learn CTAs. */
function FocusRow({ f }: { f: FocusItem }) {
  const zone = getZone(skillMeta(f.skillId).zoneId)
  const zoneProgress = useProgress((s) => s.zones[f.zoneId])
  const practiceZone = getZone(f.zoneId)
  // Practice the recommended stage if it's unlocked, else the first open step.
  const practiceStage = practiceZone ? playableStageId(practiceZone, f.practiceStageId, zoneProgress) : f.practiceStageId
  const tone = accuracyTone(f.accuracy)

  // The trickiest spots (red) get a "Trickiest" badge; the ones approaching
  // mastery (yellow/green) get an encouraging "Almost there".
  const badge =
    tone === 'wrong'
      ? { tone: 'wrong' as const, icon: '🔥', label: 'Trickiest' }
      : { tone: 'quest' as const, icon: '💪', label: 'Almost there' }

  return (
    <Card tone={tone} accent className="p-4">
      <div className="flex flex-col gap-3">
        {/* Heading: emoji + label + badge (wraps so labels never truncate) */}
        <div className="flex items-start gap-3">
          <div className="text-4xl leading-none shrink-0" aria-hidden="true">
            {zone?.emoji ?? '🎯'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="kid-text text-lg text-ink-900 break-words">{f.label}</div>
            <div className="mt-1">
              <Pill tone={badge.tone} icon={badge.icon}>
                {badge.label}
              </Pill>
            </div>
          </div>
        </div>

        {/* Tone-coded accuracy meter */}
        <ProgressBar
          value={f.accuracy}
          max={100}
          tone={tone}
          label={`${f.accuracy}% correct · ${f.attempts} ${f.attempts === 1 ? 'try' : 'tries'} this week`}
        />

        {/* Full-width stacked CTAs (mobile-first; row on wider cards) */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="primary"
            size="md"
            to={`/play/${f.zoneId}/${practiceStage}`}
            className="flex-1 justify-center"
          >
            🎮 Practice
          </Button>
          <Button
            variant="secondary"
            size="md"
            to={`/tutor/${f.lessonId}`}
            className="flex-1 justify-center"
          >
            📚 Learn it
          </Button>
        </div>
      </div>
    </Card>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function FocusScreen() {
  const attempts = useProgress((s) => s.attempts)
  const sessions = useProgress((s) => s.sessions)
  const focus = weeklyFocus(attempts, sessions)
  const days = byDay(sessions, 7)

  const { container, item } = useEntrance()

  return (
    <div className="flex-1 flex flex-col p-4 overflow-y-auto">
      <div className="max-w-2xl w-full mx-auto">
        <PageHeader title="🎯 This Week's Focus" back={{ to: '/map', label: 'Map' }} />

        <p className="kid-text text-sky text-lg mb-4">
          Let's work on the trickiest spots from this week.
        </p>

        {focus.length === 0 ? (
          <>
            <EmptyState
              emoji="🌱"
              title="No focus plan yet"
              message="Play some quizzes this week and your personalized focus plan will sprout right here."
              cta={{ label: 'Go play a quiz →', to: '/map' }}
            />
            {import.meta.env.DEV && (
              <div className="flex justify-center mt-2">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    seedSampleWeek()
                    location.reload()
                  }}
                  className="bg-paper/80"
                >
                  🌱 Seed sample week (dev)
                </Button>
              </div>
            )}
          </>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-5"
          >
            {days.length > 0 && (
              <motion.div variants={item}>
                <BarChart
                  title="Questions this week"
                  bars={days.map((d) => ({ label: d.label, value: d.questions }))}
                  caption="practice over the last 7 active days"
                />
              </motion.div>
            )}

            {/* Section header with a count */}
            <motion.div variants={item} className="flex items-baseline justify-between">
              <h2 className="kid-text text-2xl text-sky drop-shadow-md">To work on</h2>
              <Pill tone="ink">
                {focus.length} to work on
              </Pill>
            </motion.div>

            <div className="flex flex-col gap-4">
              {focus.map((f) => (
                <motion.div key={f.skillId} variants={item}>
                  <FocusRow f={f} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
