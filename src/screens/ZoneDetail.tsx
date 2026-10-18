import { useEffect, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getZone } from '../curriculum'
import { useProgress } from '../store/progress'
import { sfx } from '../lib/sound'
import {
  Button,
  BackButton,
  Card,
  Medallion,
  Page,
  Pill,
  ProgressBar,
  StarRating,
  Loading,
  ErrorState,
  Celebration,
  TONES,
  toneOf,
  type Tone,
} from '../components/ui'
import { useEntrance } from '../lib/motion'
import { isStageUnlocked } from '../lib/stageLocks'
import { useWorldUi } from '../world/useWorldUi'
import { zoneStarTotals } from '../lib/pets/growth'
import { usePetStatuses } from '../lib/pets/usePets'
import { petEmoji } from '../lib/pets/catalog'
import { zonePetLine } from '../lib/pets/copy'

// ── Stage-kind presentation ───────────────────────────────────────────────────
const KIND_META: Record<string, { label: string; icon: string; tone: Tone }> = {
  concept: { label: 'Learn', icon: '💡', tone: 'ocean' },
  practice: { label: 'Practice', icon: '⚡', tone: 'quest' },
  mastery: { label: 'Boss', icon: '👹', tone: 'monster' },
}
const FALLBACK_KIND = { label: 'Play', icon: '🎮', tone: 'quest' as Tone }

export default function ZoneDetail() {
  const { zoneId = '' } = useParams()
  const navigate = useNavigate()
  const zone = getZone(zoneId)
  const zoneProgress = useProgress((s) => s.zones[zoneId])
  const markZoneMastered = useProgress((s) => s.markZoneMastered)
  const fromWorld = useWorldUi((s) => s.enteredFromWorld)
  const pet = usePetStatuses().find((s) => s.pet.zoneId === zoneId)

  const { container, item } = useEntrance()

  // ── Zone-level star totals (must run every render for hook order) ────────────
  // Each stage counts up to its starsToEarn: the same totals (and "complete")
  // that grow the zone's pet into a grown-up.
  const { earnedStars, totalStars, complete } = useMemo(() => {
    if (!zone) return { earnedStars: 0, totalStars: 0, complete: false }
    const t = zoneStarTotals(zone, zoneProgress)
    return { earnedStars: t.earned, totalStars: t.total, complete: t.complete }
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
          back={{ label: fromWorld ? 'Back to the World' : 'Back to map', to: fromWorld ? '/world' : '/map' }}
        />
      </div>
    )
  }

  const tone = toneOf(zone.themeColor)
  const t = TONES[tone]

  return (
    <Page width="lg">
      {/* ── Back ──────────────────────────────────────────────────────────── */}
      <div>
        <BackButton to={fromWorld ? '/world' : '/map'} label={fromWorld ? 'Back to the World' : 'Back to map'} />
      </div>

      {/* ── Zone header card (themed to the island just tapped) ────────────── */}
      <Card tone={tone} accent className="overflow-hidden">
        <div className={`relative p-5 sm:p-7 ${t.soft}`}>
          <div
            className="absolute -left-16 -top-16 w-64 h-64 sunburst opacity-70 pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative flex items-center gap-4 sm:gap-5">
            <Medallion tone={tone} size="xl" className="sm:w-28 sm:h-28 sm:text-6xl">
              {zone.emoji}
            </Medallion>
            <div className="min-w-0">
              <h1 className="kid-text font-bold text-3xl sm:text-5xl text-ink-900 leading-tight">{zone.title}</h1>
              <p className={`kid-text text-lg sm:text-xl ${t.text}`}>{zone.subtitle}</p>
            </div>
          </div>
          <p className="relative mt-4 text-lg leading-relaxed text-ink-800">{zone.description}</p>
        </div>

        {/* Zone-level progress */}
        <div className="px-5 sm:px-7 py-4 border-t-2 border-line/15 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <StarRating earned={earnedStars} total={totalStars} size="sm" />
              <Pill tone="quest" icon="⭐">
                {earnedStars}/{totalStars} stars
              </Pill>
            </div>
            <Pill tone="ink" icon="⏱️">
              ~{zone.estimatedMinutes} min
            </Pill>
          </div>
          <ProgressBar value={earnedStars} max={totalStars} tone={complete ? 'correct' : 'quest'} />
          {/* This zone's pet, and what it needs from here */}
          {pet && (
            <Link
              to={`/pets?pet=${pet.pet.creatureId}`}
              onClick={() => sfx.click()}
              className="flex items-center gap-2.5 min-h-12 rounded-2xl bg-cream-100 border-2 border-line/25 px-3 py-1.5 kid-text text-base leading-snug text-ink-800 hover:bg-cream-200 outline-none focus-visible:ring-4 focus-visible:ring-ocean-600/70"
            >
              <span className="text-2xl leading-none" aria-hidden="true">
                {pet.stage === 'egg' ? '🥚' : petEmoji(pet.pet.creatureId)}
              </span>
              <span className="flex-1 min-w-0">{zonePetLine(pet)}</span>
              <span className="shrink-0 text-ink-700" aria-hidden="true">🐾 →</span>
            </Link>
          )}
        </div>
      </Card>

      {/* ── Stage path ────────────────────────────────────────────────────── */}
      <motion.ol
        variants={container}
        initial="hidden"
        animate="show"
        className="relative flex flex-col gap-4"
        aria-label={`${zone.title} steps`}
      >
        {/* the dotted trail joining the steps */}
        <span
          className="absolute left-[3.2rem] sm:left-[3.45rem] top-10 bottom-10 border-l-[5px] border-dotted border-line/35"
          aria-hidden="true"
        />
        {zone.stages.map((stage, idx) => {
          const meta = KIND_META[stage.kind] ?? FALLBACK_KIND
          const record = zoneProgress?.stages[stage.id]
          const locked = !isStageUnlocked(zone, stage.id, zoneProgress)
          const earned = record?.stars ?? 0
          const cleared = earned > 0
          const isBoss = stage.kind === 'mastery'

          // Card tone: completed → correct; else the kind's tone. Locked: plain.
          const cardTone: Tone | undefined = locked ? undefined : cleared ? 'correct' : meta.tone

          return (
            <motion.li key={stage.id} variants={item} className="relative">
              <Card
                tone={cardTone}
                accent={!locked}
                className={['p-4 sm:p-5', locked ? 'bg-cream-100' : ''].join(' ')}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Kind token with the step number */}
                    <div className="relative shrink-0">
                      <Medallion tone={locked ? 'cream' : meta.tone} size="lg" square>
                        {locked ? '🔒' : meta.icon}
                      </Medallion>
                      <span
                        className={[
                          'absolute -top-2 -left-2 grid place-items-center w-7 h-7 rounded-full border-2 border-line kid-text text-sm',
                          cleared ? 'bg-correct-400' : 'bg-paper',
                        ].join(' ')}
                        aria-hidden="true"
                      >
                        {cleared ? '✓' : idx + 1}
                      </span>
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm kid-text uppercase tracking-wide text-ink-700">
                        <span>Step {idx + 1}</span>
                        <span aria-hidden="true">·</span>
                        <span className={locked ? '' : TONES[meta.tone].text}>{meta.label}</span>
                        {isBoss && (
                          <Pill tone="monster" icon="👹" className="normal-case tracking-normal">
                            Final
                          </Pill>
                        )}
                      </div>
                      <div className="kid-text font-bold text-2xl text-ink-900 leading-tight">{stage.title}</div>
                      <div className="text-ink-700 text-base">{stage.description}</div>

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
                  </div>

                  {/* Action */}
                  <div className="sm:shrink-0">
                    {locked ? (
                      <Button variant="ghost" size="md" disabled className="w-full sm:w-auto justify-center">
                        🔒 Locked
                      </Button>
                    ) : (
                      <Button
                        variant={cleared ? 'success' : isBoss ? 'danger' : 'primary'}
                        size="lg"
                        className="w-full sm:w-auto sm:min-w-[9rem] justify-center"
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
            </motion.li>
          )
        })}
      </motion.ol>

      {/* ── Zone-complete celebration ─────────────────────────────────────── */}
      <Celebration
        open={celebrateOpen}
        onClose={() => markZoneMastered(zoneId)}
        title={`${zone.title} Complete!`}
        stars={Math.min(3, zone.stages.length)}
      >
        <p>You earned all {totalStars} stars on {zone.title}. Amazing work!</p>
      </Celebration>
    </Page>
  )
}
