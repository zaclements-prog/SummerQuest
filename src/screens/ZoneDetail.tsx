import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getZone } from '../curriculum'
import { useProgress } from '../store/progress'
import { sfx } from '../lib/sound'
import {
  Button,
  BackButton,
  Card,
  Pill,
  StarRating,
  Loading,
  ErrorState,
  Celebration,
} from '../components/ui'
import { subjectTheme } from '../lib/theme'
import { useEntrance } from '../lib/motion'
import { isStageUnlocked } from '../lib/stageLocks'
import { useWorldUi } from '../world/useWorldUi'

// ── Stage-kind presentation ───────────────────────────────────────────────────
// `tone` drives the Card accent border + shadow; the icon chip uses an AA-safe
// dark-text-on-light or light-text-on-dark fill (never white-on-*-500).
const KIND_META: Record<
  string,
  { label: string; icon: string; tone: 'ocean' | 'quest' | 'monster'; chip: string }
> = {
  concept: { label: 'Learn', icon: '💡', tone: 'ocean', chip: 'bg-ocean-600 text-paper' },
  practice: { label: 'Practice', icon: '⚡', tone: 'quest', chip: 'bg-quest-400 text-quest-900' },
  mastery: { label: 'Boss', icon: '👹', tone: 'monster', chip: 'bg-monster-600 text-paper' },
}

export default function ZoneDetail() {
  const { zoneId = '' } = useParams()
  const navigate = useNavigate()
  const zone = getZone(zoneId)
  const zoneProgress = useProgress((s) => s.zones[zoneId])
  const markZoneMastered = useProgress((s) => s.markZoneMastered)
  const fromWorld = useWorldUi((s) => s.enteredFromWorld)

  const { container, item } = useEntrance()

  // ── Zone-level star totals (must run every render for hook order) ────────────
  const { earnedStars, totalStars, complete } = useMemo(() => {
    if (!zone) return { earnedStars: 0, totalStars: 0, complete: false }
    let earned = 0
    let total = 0
    for (const stage of zone.stages) {
      earned += zoneProgress?.stages[stage.id]?.stars ?? 0
      total += stage.starsToEarn
    }
    return { earnedStars: earned, totalStars: total, complete: total > 0 && earned >= total }
  }, [zone, zoneProgress])

  // ── Zone-complete celebration (once per zone, ever) ──────────────────────────
  // Shown until dismissed; dismissing records ZoneProgress.masteredAt so it never
  // pops up again on later visits.
  const celebrateOpen = complete && !zoneProgress?.masteredAt
  useEffect(() => {
    if (celebrateOpen) sfx.victory()
  }, [celebrateOpen])

  // Defensive loading guard while params resolve (curriculum is synchronous).
  if (!zoneId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loading label="Opening island…" />
      </div>
    )
  }

  if (!zone) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <ErrorState
          emoji="🗺️"
          title="Zone not found"
          message="We couldn't find that island. It may have drifted off the map!"
          back={{ label: fromWorld ? 'Back to World' : 'Back to map', to: fromWorld ? '/world' : '/map' }}
        />
      </div>
    )
  }

  const theme = subjectTheme(zone.themeColor)

  return (
    <div className="flex-1 flex flex-col items-center p-4 sm:p-6">
      <div className="max-w-3xl w-full flex flex-col gap-4">
        {/* ── Back ──────────────────────────────────────────────────────────── */}
        <div>
          <BackButton to={fromWorld ? '/world' : '/map'} label={fromWorld ? 'Back to World' : 'Back to map'} />
        </div>

        {/* ── Zone header card (themed to the island just tapped) ────────────── */}
        <Card tone={zone.themeColor} accent className="overflow-hidden">
          <div className={`p-6 ${theme.bg}`}>
            <div className="flex items-center gap-4">
              <div className="text-6xl sm:text-7xl drop-shadow" aria-hidden="true">
                {zone.emoji}
              </div>
              <div className="min-w-0">
                <h1 className={`kid-text text-3xl sm:text-4xl ${theme.text}`}>{zone.title}</h1>
                <p className={`kid-text text-lg sm:text-xl ${theme.text} opacity-80`}>
                  {zone.subtitle}
                </p>
              </div>
            </div>
            <p className={`mt-4 leading-relaxed ${theme.text} opacity-90`}>{zone.description}</p>

            {/* Zone-level progress: glyphs + count pill + bar */}
            <div className="mt-5 flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StarRating earned={earnedStars} total={totalStars} size="sm" />
                  <Pill tone="ink" icon="⭐">
                    {earnedStars}/{totalStars} stars
                  </Pill>
                </div>
                <Pill tone="ink" icon="⏱️">
                  ~{zone.estimatedMinutes} min
                </Pill>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Stage list ────────────────────────────────────────────────────── */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-4"
        >
          {zone.stages.map((stage, idx) => {
            const meta = KIND_META[stage.kind]
            const record = zoneProgress?.stages[stage.id]
            const locked = !isStageUnlocked(zone, stage.id, zoneProgress)
            const earned = record?.stars ?? 0
            const cleared = earned > 0
            const isBoss = stage.kind === 'mastery'

            // Card tone: completed → correct; boss → monster (escalated); else kind tone.
            const cardTone = locked
              ? undefined
              : cleared
                ? 'correct'
                : isBoss
                  ? 'monster'
                  : meta.tone

            return (
              <motion.div key={stage.id} variants={item}>
                <Card
                  tone={cardTone}
                  accent={!locked}
                  className={[
                    'p-4',
                    locked ? 'opacity-60' : '',
                    isBoss && !locked
                      ? 'shadow-[0_0_0_1px_theme(colors.monster.400),0_0_28px_-2px_theme(colors.monster.500)]'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Icon chip */}
                    <div
                      className={`w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center text-3xl ${meta.chip}`}
                      aria-hidden="true"
                    >
                      {meta.icon}
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm kid-text uppercase tracking-wide text-ink-700">
                        <span>Step {idx + 1}</span>
                        <span aria-hidden="true">·</span>
                        <span className={theme.accent}>{meta.label}</span>
                        {isBoss && (
                          <Pill tone="monster" icon="👹" className="normal-case tracking-normal">
                            Final
                          </Pill>
                        )}
                      </div>
                      <div className="kid-text text-xl sm:text-2xl text-ink-900">{stage.title}</div>
                      <div className="text-ink-700 text-sm">{stage.description}</div>

                      {cleared ? (
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <StarRating earned={earned} total={stage.starsToEarn} size="sm" />
                          <span className="text-sm text-ink-700 kid-text">
                            Best {record!.bestScore} · {record!.attempts}{' '}
                            {record!.attempts === 1 ? 'try' : 'tries'}
                          </span>
                        </div>
                      ) : !locked ? (
                        <div className="mt-1.5">
                          <StarRating earned={0} total={stage.starsToEarn} size="sm" />
                        </div>
                      ) : (
                        <div className="mt-1.5 text-sm kid-text text-ink-700">
                          🔒 Finish Step {idx} to unlock
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    <div className="sm:shrink-0">
                      {locked ? (
                        <Button
                          variant="ghost"
                          size="md"
                          disabled
                          className="w-full sm:w-auto justify-center"
                        >
                          🔒 Locked
                        </Button>
                      ) : (
                        <Button
                          variant={cleared ? 'success' : isBoss ? 'danger' : 'primary'}
                          size="md"
                          className="w-full sm:w-auto justify-center"
                          onClick={() => {
                            sfx.enter()
                            navigate(`/play/${zone.id}/${stage.id}`)
                          }}
                        >
                          {cleared ? '↻ Replay' : isBoss ? '⚔️ Battle' : '▶ Play'}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* ── Zone-complete celebration ─────────────────────────────────────── */}
      <Celebration
        open={celebrateOpen}
        onClose={() => markZoneMastered(zoneId)}
        title={`${zone.title} Complete!`}
        stars={Math.min(3, zone.stages.length)}
      >
        <p>You earned all {totalStars} stars on {zone.title}. Amazing work!</p>
      </Celebration>
    </div>
  )
}
