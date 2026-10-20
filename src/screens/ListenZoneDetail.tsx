import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { zoneTitle, type Zone } from '../curriculum'
import { useProgress } from '../store/progress'
import { sfx } from '../lib/sound'
import { Celebration, Medallion, Page, ToonStar, toneOf } from '../components/ui'
import { SayAgainButton } from '../guide/SayAgainButton'
import { guide } from '../guide/store'
import { ListenIconButton } from '../components/listen/ListenIconButton'
import { ListenStagePicker } from '../components/listen/ListenStagePicker'
import { ListenSleeping, SleepingBadge } from '../components/listen/ListenSleeping'
import { isZoneSleeping } from '../lib/listenNav'
import { petEmoji } from '../lib/pets/catalog'
import { zonePetLine } from '../lib/pets/copy'
import type { PetStatus } from '../lib/pets/growth'

/**
 * A zone's page for a K–1 (voice-first) child: no paragraphs. A big picture
 * of the place and its name, its stars as a number, and its stages as three
 * big picture buttons (ListenStagePicker: the welcome is said with the hand on
 * the next stage, and each button says its title). A zone with no K–1 games
 * yet is "still sleeping" and has nothing to enter. ← goes back, 🔊 explains.
 */
export default function ListenZoneDetail({
  zone,
  fromWorld,
  pet,
  earned,
  total,
  celebrateOpen,
  onCelebrated,
}: {
  zone: Zone
  fromWorld: boolean
  pet: PetStatus | undefined
  earned: number
  total: number
  celebrateOpen: boolean
  onCelebrated: () => void
}) {
  const navigate = useNavigate()
  const grade = useProgress((s) => s.player?.grade)
  const sleeping = isZoneSleeping(zone, grade)
  const title = zoneTitle(zone, grade)
  const back = fromWorld ? '/world' : '/map'
  const celebrate = celebrateOpen && !sleeping

  // the zone is complete: "You did it!"
  useEffect(() => {
    if (celebrate) void guide.say({ line: 'listen/youDidIt' })
  }, [celebrate])

  return (
    <Page width="lg" className="gap-4 short:gap-3">
      <div className="flex items-center gap-3">
        <ListenIconButton icon="←" label={fromWorld ? 'Back to the World' : 'Back to the map'} to={back} tone="sun" />
        <SayAgainButton label="What do I do here?" />
        {pet && !sleeping && (
          <ListenIconButton
            icon={pet.stage === 'egg' ? '🥚' : petEmoji(pet.pet.creatureId)}
            label={zonePetLine(pet)}
            to={`/pets?pet=${pet.pet.creatureId}`}
            className="ml-auto"
          />
        )}
      </div>

      <div className="relative flex items-center gap-4 rounded-toon border-[3px] border-line bg-paper shadow-card px-4 py-3 short:py-2" data-listen-zone={zone.id}>
        <div className="relative">
          <Medallion tone={sleeping ? 'cream' : toneOf(zone.themeColor)} size="xl" className={sleeping ? 'grayscale-[0.6] opacity-70' : ''}>
            {zone.emoji}
          </Medallion>
          {sleeping && <SleepingBadge className="absolute -top-4 -right-5 text-3xl" />}
        </div>
        <h1 className="kid-text font-bold text-3xl sm:text-4xl text-ink-900 leading-tight flex-1 min-w-0">{title}</h1>
        {!sleeping && total > 0 && (
          <span className="kid-text font-bold text-2xl inline-flex items-center gap-1.5 rounded-full border-[3px] border-line bg-quest-200 px-3 py-1 tabular-nums shrink-0" aria-label={`${earned} of ${total} stars`}>
            <ToonStar filled px={28} />
            {earned}/{total}
          </span>
        )}
      </div>

      {sleeping ? (
        <ListenSleeping emoji={zone.emoji} size="lg" />
      ) : (
        <div className="py-2">
          <ListenStagePicker
            zone={zone}
            size="lg"
            onPlay={(path) => {
              sfx.enter()
              navigate(path)
            }}
          />
        </div>
      )}

      <Celebration open={celebrate} onClose={onCelebrated} title={`${title} ⭐`} stars={3}>
        <p className="text-3xl" aria-hidden="true">🎉</p>
      </Celebration>
    </Page>
  )
}
