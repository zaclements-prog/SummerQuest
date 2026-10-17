import { motion } from 'framer-motion'
import { useProgress } from '../store/progress'
import { weeklyFocus, byDay, type FocusItem } from '../lib/analytics'
import { skillMeta } from '../tutoring/skills'
import { getZone } from '../curriculum'
import BarChart from '../components/BarChart'
import { seedSampleWeek } from '../tutoring/devSeed'
import {
  Card,
  Button,
  PageHeader,
  EmptyState,
  ProgressBar,
  Pill,
  Medallion,
  Page,
  SectionTitle,
  accuracyToneOf,
} from '../components/ui'
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
  const tone = accuracyToneOf(f.accuracy)

  // The trickiest spots (red) get a "Trickiest" badge; the ones approaching
  // mastery (yellow/green) get an encouraging "Almost there".
  const badge =
    tone === 'wrong'
      ? { tone: 'wrong' as const, icon: '🔥', label: 'Trickiest' }
      : { tone: 'quest' as const, icon: '💪', label: 'Almost there' }

  return (
    <Card tone={tone} accent className="p-4 sm:p-5">
      <div className="flex flex-col gap-4">
        {/* Heading: emoji + label + badge (wraps so labels never truncate) */}
        <div className="flex items-center gap-3">
          <Medallion tone={tone} size="lg">
            {zone?.emoji ?? '🎯'}
          </Medallion>
          <div className="flex-1 min-w-0">
            <div className="kid-text font-bold text-xl text-ink-900 break-words leading-tight">{f.label}</div>
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
            size="lg"
            to={`/play/${f.zoneId}/${practiceStage}`}
            className="flex-1 justify-center"
          >
            🎮 Practice
          </Button>
          <Button
            variant="secondary"
            size="lg"
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
    <Page width="md">
      <div>
        <PageHeader title="🎯 This Week's Focus" back={{ to: '/map', label: 'Map' }} className="!mb-1" />
        <p className="kid-text text-ink-700 text-lg">
          Let's work on the trickiest spots from this week.
        </p>
      </div>

      {focus.length === 0 ? (
        <>
          <EmptyState
            emoji="🌱"
            title="No focus plan yet"
            message="Play some quizzes this week and your personalized focus plan will sprout right here."
            cta={{ label: 'Go play a quiz →', to: '/map' }}
          />
          {/* Developer helper — opt-in only (VITE_DEV_TOOLS=true in .env.local), since the
              launchers run the dev server and a child must never see this button. */}
          {import.meta.env.VITE_DEV_TOOLS === 'true' && (
            <div className="flex justify-center mt-2">
              <Button
                variant="ghost"
                size="md"
                onClick={() => {
                  seedSampleWeek()
                  location.reload()
                }}
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
              <Card className="p-3 sm:p-4">
                <div className="max-w-lg mx-auto">
                  <BarChart
                    title="Questions this week"
                    bars={days.map((d) => ({ label: d.label, value: d.questions }))}
                    caption="practice over the last 7 active days"
                  />
                </div>
              </Card>
            </motion.div>
          )}

          {/* Section header with a count */}
          <motion.div variants={item}>
            <SectionTitle icon="🧩" right={<Pill tone="ink">{focus.length} to work on</Pill>}>
              To work on
            </SectionTitle>
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
    </Page>
  )
}
