import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { getZone } from '../curriculum'
import { useProgress } from '../store/progress'
import { todayStr } from '../lib/daily'
import { Button, Pill, StarRating } from '../components/ui'
import type { ActiveNpc } from './useWorldUi'
import { focusRows, lessonRows, zoneStageRows } from './hubContent'

const KIND_ICON = { concept: '💡', practice: '⚡', mastery: '👹' } as const

/**
 * The in-world card an NPC opens: pick a stage (or a lesson) without leaving the
 * World. Subject NPCs list their zone's stages; the Schoolhouse owl offers the
 * Daily Challenge, This Week's Focus and every Tutor lesson; the Library
 * bookworm offers Reading Reef plus the reading and writing lessons.
 * `onLaunch(path)` leaves the World for that route (and the game returns here).
 */
export default function WorldPanel({
  npc,
  onLaunch,
  onClose,
}: {
  npc: ActiveNpc
  onLaunch: (path: string) => void
  onClose: () => void
}) {
  const reduced = useReducedMotion()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const zone = npc.zoneId ? getZone(npc.zoneId) : undefined
  const title = npc.hub ? npc.label : (zone?.title ?? npc.label)
  const emoji = npc.hub === 'schoolhouse' ? '🏫' : npc.hub === 'library' ? '📚' : (zone?.emoji ?? '🗺️')

  return (
    <motion.div
      role="dialog"
      aria-label={title}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      className="pointer-events-auto absolute inset-x-2 bottom-2 sm:inset-x-auto sm:right-4 sm:top-14 sm:bottom-auto sm:w-[420px] max-h-[75%] overflow-y-auto rounded-3xl bg-paper text-ink-900 shadow-2xl p-4 sm:p-5 [text-shadow:none]"
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-4xl" aria-hidden="true">{emoji}</span>
        <h2 className="kid-text text-2xl flex-1">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="kid-text text-xl w-11 h-11 rounded-full bg-ink-900/8 hover:bg-ink-900/15"
        >
          ✕
        </button>
      </div>

      {npc.hub === 'schoolhouse' ? (
        <SchoolhouseContent onLaunch={onLaunch} />
      ) : npc.hub === 'library' ? (
        <>
          <Section title="🐠 Reading Reef">
            <StageList zoneId="reading-reef" onLaunch={onLaunch} />
          </Section>
          <Section title="📖 Lessons">
            <LessonList only={['reading', 'writing']} onLaunch={onLaunch} />
          </Section>
        </>
      ) : npc.zoneId ? (
        <>
          {zone && <p className="text-ink-700 text-sm mb-3">{zone.description}</p>}
          <StageList zoneId={npc.zoneId} onLaunch={onLaunch} />
          <button
            type="button"
            onClick={() => onLaunch(`/zone/${npc.zoneId}`)}
            className="mt-3 text-sm text-ocean-700 underline underline-offset-2"
          >
            More about this zone →
          </button>
        </>
      ) : null}

      <p className="text-xs text-ink-500 mt-4">Press Esc or ✕ to keep exploring.</p>
    </motion.div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h3 className="kid-text text-lg mb-2">{title}</h3>
      {children}
    </section>
  )
}

function StageList({ zoneId, onLaunch }: { zoneId: string; onLaunch: (path: string) => void }) {
  const zones = useProgress((s) => s.zones)
  const rows = zoneStageRows(zoneId, { zones })
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r, i) => (
        <li key={r.stageId} className="flex items-center gap-3 rounded-2xl bg-ocean-50 px-3 py-2">
          <span className="text-2xl" aria-hidden="true">{KIND_ICON[r.kind]}</span>
          <div className="flex-1 min-w-0">
            <div className="kid-text text-base leading-tight">
              <span className="text-ink-500 mr-1">{i + 1}.</span>
              {r.title}
            </div>
            <StarRating earned={r.stars} total={r.starsToEarn} size="sm" />
          </div>
          {r.locked ? (
            <span className="kid-text text-sm text-ink-500" title="Earn a star on the step before it">
              🔒 Locked
            </span>
          ) : (
            <Button size="md" variant={r.kind === 'mastery' ? 'danger' : 'primary'} onClick={() => onLaunch(r.href)}>
              {r.kind === 'mastery' ? '⚔️ Battle' : '▶ Play'}
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}

function LessonList({ only, onLaunch }: { only?: string[]; onLaunch: (path: string) => void }) {
  const attempts = useProgress((s) => s.attempts)
  const sessions = useProgress((s) => s.sessions)
  const rows = lessonRows({ attempts, sessions }, only)
  return (
    <div className="grid grid-cols-2 gap-2">
      {rows.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => onLaunch(l.href)}
          className="flex items-center gap-2 rounded-2xl bg-ocean-50 hover:bg-ocean-100 px-3 py-2 text-left min-h-[44px]"
        >
          <span className="text-2xl" aria-hidden="true">{l.emoji}</span>
          <span className="kid-text text-sm leading-tight flex-1">{l.title}</span>
          {l.recommended && <span aria-label="Recommended" title="Recommended for you">⭐</span>}
        </button>
      ))}
    </div>
  )
}

function SchoolhouseContent({ onLaunch }: { onLaunch: (path: string) => void }) {
  const zones = useProgress((s) => s.zones)
  const attempts = useProgress((s) => s.attempts)
  const sessions = useProgress((s) => s.sessions)
  const dailyDone = useProgress((s) => s.dailyClaimedDate) === todayStr()
  const focus = focusRows({ zones, attempts, sessions })

  return (
    <>
      <Section title="🌟 Daily Challenge">
        {dailyDone ? (
          <Pill tone="correct" icon="✅">Done for today — come back tomorrow!</Pill>
        ) : (
          <Button size="md" variant="success" onClick={() => onLaunch('/daily')}>
            ▶ Play today's challenge
          </Button>
        )}
      </Section>

      <Section title="🎯 This Week's Focus">
        {focus.length === 0 ? (
          <p className="text-sm text-ink-700">Play some quizzes and I'll find the skills to practice next. Hoo!</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {focus.map((f) => (
              <li key={f.skillId} className="flex items-center gap-2 rounded-2xl bg-ocean-50 px-3 py-2">
                <span className="text-2xl" aria-hidden="true">{f.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="kid-text text-sm leading-tight">{f.label}</div>
                  <div className="text-xs text-ink-500">{f.accuracy}% correct this week</div>
                </div>
                <Button size="md" variant="primary" onClick={() => onLaunch(f.practiceHref)}>
                  Practice
                </Button>
                <Button size="md" variant="ghost" onClick={() => onLaunch(f.learnHref)}>
                  Learn
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="📚 Lessons">
        <LessonList onLaunch={onLaunch} />
      </Section>
    </>
  )
}
